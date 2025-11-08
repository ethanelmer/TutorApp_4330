from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
from chromaConnection import client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a collection for our documents
collection = client.get_or_create_collection(
    name="study_materials",
    metadata={"hnsw:space": "cosine"}  # Using cosine similarity for searches
)

class ChatQuery(BaseModel):
    text: str

@app.post("/api/query/")
async def query_documents(query: ChatQuery):
    try:
        # Search the collection for relevant documents
        results = collection.query(
            query_texts=[query.text],
            n_results=2  # Get top 2 most relevant documents
        )
        
        # Format the response
        if results and results['documents'] and results['documents'][0]:
            context = "\n".join(results['documents'][0])
            response = f"Based on the available documents: {context}"
        else:
            response = "I couldn't find any relevant information in the uploaded documents."
            
        return {"message": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode()  # For text files. For PDFs/other formats, you'll need additional processing
        
        # Split into chunks (simple sentence splitting for now)
        chunks = [s.strip() for s in text_content.split('.') if s.strip()]
        
        # Add to Chroma
        collection.add(
            documents=chunks,
            metadatas=[{"source": file.filename} for _ in chunks],
            ids=[f"{file.filename}-{i}" for i in range(len(chunks))]
        )
        
        return {
            "message": f"Successfully processed {file.filename}",
            "chunks": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/")
async def list_documents():
    try:
        # Get all documents in the collection
        count = collection.count()
        return {
            "document_count": count,
            "message": f"Found {count} document chunks in the collection"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)