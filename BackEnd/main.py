from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
from BackEnd.chromaConnection import get_chroma_client
import os
import io
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# Load environment variables early (explicitly load BackEnd/.env so running uvicorn from repo root still finds it)
here = os.path.dirname(__file__)
load_dotenv(os.path.join(here, '.env'))

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],  # Your React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Collection will be created on startup once the Chroma client is available
collection = None


@app.on_event("startup")
def startup_event():
    """Initialize the Chroma client and collection on startup.

    Delaying creation to startup gives clearer errors and avoids network calls at import time.
    """
    global collection
    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name="study_materials",
        metadata={"hnsw:space": "cosine"}  # Using cosine similarity for searches
    )

class ChatQuery(BaseModel):
    text: str

@app.post("/api/query/")
async def query_documents(query: ChatQuery):
    try:
        if collection is None:
            raise HTTPException(status_code=503, detail="Search collection is not initialized yet")

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
        if collection is None:
            raise HTTPException(status_code=503, detail="Search collection is not initialized yet")

        if not file.filename:
            raise HTTPException(status_code=400, detail="No file was provided")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="The uploaded file is empty")

        text_content = ""
        
        # Handle different file types
        if file.filename.lower().endswith('.pdf'):
            try:
                # Process PDF file
                pdf_file = io.BytesIO(content)
                pdf_reader = PdfReader(pdf_file)
                
                if len(pdf_reader.pages) == 0:
                    raise HTTPException(status_code=400, detail="The PDF file appears to be empty")
                
                # Extract text from all pages
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\n"
                
                if not text_content.strip():
                    raise HTTPException(status_code=400, detail="Could not extract any text from the PDF file. The file might be scanned or contain only images.")
            except Exception as pdf_error:
                print(f"PDF processing error: {str(pdf_error)}")  # Debug log
                raise HTTPException(status_code=400, detail=f"Error processing PDF file: {str(pdf_error)}")
        else:
            # Process text files
            try:
                text_content = content.decode('utf-8')
            except UnicodeDecodeError:
                # Try a different encoding if utf-8 fails
                text_content = content.decode('latin-1')

        # Split into chunks (simple sentence splitting for now)
        # Use both period and newline as sentence delimiters
        chunks = []
        sentences = text_content.replace('\n', '. ').split('.')
        for s in sentences:
            s = s.strip()
            if s:  # Only add non-empty chunks
                chunks.append(s)

        if not chunks:
            raise HTTPException(status_code=400, detail="No readable content found in file")

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
        if collection is None:
            return {"document_count": 0, "message": "Collection not initialized"}

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