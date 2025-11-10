import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parents[1])  # Go up one level from BackEnd directory
if project_root not in sys.path:
    sys.path.append(project_root)

import os
import sys
# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import re
import uvicorn
from BackEnd.chromaConnection import get_chroma_client
import io
from PyPDF2 import PdfReader
from dotenv import load_dotenv

# Load environment variables early (explicitly load BackEnd/.env so running uvicorn from repo root still finds it)
here = os.path.dirname(__file__)
load_dotenv(os.path.join(here, '.env'))

app = FastAPI()

# Configure CORS with sensible dev defaults
origins_env = os.getenv("FRONTEND_ORIGINS") or os.getenv("FRONTEND_ORIGIN")
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    # Default dev origins
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# Optional: allow all in dev by setting DEV_ALLOW_ALL_ORIGINS=true
if os.getenv("DEV_ALLOW_ALL_ORIGINS", "false").lower() in ("1", "true", "yes"):
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
        print(f"[query] incoming text length={len(query.text)}")
        try:
            results = collection.query(
                query_texts=[query.text],
                n_results=5  # Get top 5 most relevant documents for better context
            )
        except Exception as chroma_err:
            print(f"[query] Chroma query failed: {chroma_err}")
            raise HTTPException(status_code=500, detail=f"Vector search failed: {chroma_err}")
        
        if results and results.get('documents') and results['documents'][0]:
            docs = results['documents'][0]
            # Normalize whitespace in returned docs
            cleaned = []
            for d in docs:
                if not d:
                    continue
                txt = re.sub(r"_+", " ", d)
                txt = re.sub(r"\s{2,}", " ", txt).strip()
                cleaned.append(txt)

            if not cleaned:
                return {"message": "I couldn't find any relevant information in the uploaded documents."}
            
            # Use the model to generate a response based on the chunks and query
            from BackEnd.model_service import get_ai_response
            print(f"[query] sending {len(cleaned)} cleaned docs to model; total_chars={sum(len(c) for c in cleaned)}")
            try:
                response = get_ai_response(query.text, cleaned)
                print(f"[query] model response length={len(response)}")
            except Exception as model_err:
                print(f"[query] model error: {model_err}")
                raise HTTPException(status_code=500, detail=f"Model error: {model_err}")
            return {"message": response}
        else:
            return {"message": "I couldn't find any relevant information in the uploaded documents."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    """Simple health and configuration check for troubleshooting."""
    try:
        initialized = collection is not None
        count = None
        if initialized:
            try:
                count = collection.count()
            except Exception:
                count = None
        return {
            "status": "ok",
            "collection_initialized": initialized,
            "document_count": count,
            "allowed_origins": allowed_origins,
        }
    except Exception as e:
        # Even if something fails, return a 200 with info to avoid CORS masking
        return {"status": "degraded", "error": str(e), "allowed_origins": allowed_origins}

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

        # Chunk the text into larger pieces to avoid creating too many small records
        # Strategy: split into sentence-like pieces then accumulate into chunks of ~chunk_size_chars
        chunk_size_chars = int(os.getenv("CHUNK_SIZE_CHARS", "800"))
        max_chunks_per_file = int(os.getenv("MAX_CHUNKS_PER_FILE", "200"))

        # Normalize newlines and split on sentence boundaries (simple heuristic)
        normalized = re.sub(r"\s+", " ", text_content.replace('\n', ' ')).strip()
        if not normalized:
            raise HTTPException(status_code=400, detail="No readable content found in file")

        # Very simple sentence splitter (keep punctuation)
        sentences = re.split(r'(?<=[\.!?])\s+', normalized)

        chunks: List[str] = []
        current = []
        current_len = 0
        for s in sentences:
            s = s.strip()
            if not s:
                continue
            # If adding this sentence would exceed the target chunk size, flush current
            if current_len + len(s) + 1 > chunk_size_chars and current:
                chunks.append(' '.join(current).strip())
                current = [s]
                current_len = len(s)
            else:
                current.append(s)
                current_len += len(s) + 1

            # Cap number of chunks for a single file
            if len(chunks) >= max_chunks_per_file:
                break

        if current and len(chunks) < max_chunks_per_file:
            chunks.append(' '.join(current).strip())

        if not chunks:
            raise HTTPException(status_code=400, detail="No readable content found in file")

        # Check collection count and enforce a conservative quota to avoid cloud tenant limits
        try:
            existing_count = collection.count()
        except Exception:
            # If count isn't available, fall back to 0 to avoid blocking
            existing_count = 0

        chroma_quota = int(os.getenv("CHROMA_MAX_RECORDS", "300"))
        if existing_count + len(chunks) > chroma_quota:
            raise HTTPException(status_code=400, detail=(
                f"Quota exceeded: adding {len(chunks)} records would exceed the allowed number of records. "
                f"Current usage: {existing_count}, quota limit: {chroma_quota}. "
                "Reduce the number of chunks (increase CHUNK_SIZE_CHARS or set MAX_CHUNKS_PER_FILE), "
                "or request a quota increase from your Chroma provider."))

        # Add to Chroma
        try:
            collection.add(
                documents=chunks,
                metadatas=[{"source": file.filename} for _ in chunks],
                ids=[f"{file.filename}-{i}" for i in range(len(chunks))]
            )
        except Exception as add_err:
            # Surface provider error (e.g., quota from cloud service)
            raise HTTPException(status_code=500, detail=f"Error adding documents to vector DB: {str(add_err)}")

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

@app.post("/api/quiz/generate/")
async def generate_quiz():
    """Generate a 20-question quiz from all documents in the database.

    To keep the request reliable for the upstream model, we aggressively cap
    the amount of context sent: a maximum number of docs and a global character
    limit. Both can be tuned via environment variables.
    """
    try:
        if collection is None:
            raise HTTPException(status_code=503, detail="Search collection is not initialized yet")

        # Get all documents from the collection
        count = collection.count()
        if count == 0:
            raise HTTPException(status_code=400, detail="No documents available. Please upload study materials first.")

        # Limits (tunable via env)
        max_docs = int(os.getenv("QUIZ_MAX_DOCS", "60"))
        per_doc_char_limit = int(os.getenv("QUIZ_PER_DOC_CHAR_LIMIT", "600"))
        total_char_budget = int(os.getenv("QUIZ_TOTAL_CHAR_BUDGET", "16000"))

        # Retrieve a subset of documents
        print(f"[quiz] total collection count={count}; retrieving up to {min(count, max_docs)} docs")
        try:
            results = collection.get(
                limit=min(count, max_docs),
                include=["documents"]
            )
        except Exception as get_err:
            print(f"[quiz] collection.get failed: {get_err}")
            raise HTTPException(status_code=500, detail=f"Vector retrieval failed: {get_err}")

        if not results or not results.get("documents"):
            raise HTTPException(status_code=400, detail="Could not retrieve documents from database")

        docs_raw = results["documents"]

        # Some providers may return nested lists; flatten defensively
        flat_docs: List[str] = []
        for d in docs_raw:
            if isinstance(d, list):
                flat_docs.extend([str(x) for x in d if x])
            elif d:
                flat_docs.append(str(d))

        if not flat_docs:
            raise HTTPException(status_code=400, detail="No document text retrieved from database")

        # Trim each doc and enforce a global budget
        trimmed: List[str] = []
        budget_left = total_char_budget
        for doc in flat_docs:
            if budget_left <= 0:
                break
            snippet = doc[:per_doc_char_limit]
            # Ensure we don't exceed total budget
            if len(snippet) > budget_left:
                snippet = snippet[:max(0, budget_left)]
            if snippet:
                trimmed.append(snippet)
                budget_left -= len(snippet)

        if not trimmed:
            raise HTTPException(status_code=400, detail="Content budget exhausted while preparing quiz context")

        # Quiz prompt (concise to save tokens)
        quiz_prompt = (
            "Create a 20-question study quiz from the provided course materials. "
            "Diversify types (concept recall, short answer, application). "
            "Return STRICT JSON with: {\"questions\":[{\"question\":string,\"answer\":string}...]}. "
            "Keep questions self-contained and answers concise with a 1–2 sentence explanation."
        )

        # Use the model to generate the quiz
        from BackEnd.model_service import get_ai_response
        print(f"[quiz] sending {len(trimmed)} docs; total_chars={sum(len(t) for t in trimmed)} budget_left={budget_left}")
        try:
            response = get_ai_response(quiz_prompt, trimmed)
            print(f"[quiz] model response length={len(response)}")
        except Exception as model_err:
            print(f"[quiz] model error: {model_err}")
            raise HTTPException(status_code=500, detail=f"Model error: {model_err}")

        return {"quiz": response, "used_docs": len(trimmed)}
    except HTTPException:
        raise
    except Exception as e:
        # Provide a clearer error message while keeping details for logs
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@app.get("/api/diagnostics/chroma")
async def chroma_diagnostics():
    """Return diagnostic information about the Chroma collection for debugging."""
    info = {
        "initialized": collection is not None,
    }
    if collection is None:
        return info
    try:
        count = collection.count()
        info["count"] = count
        sample_limit = min(count, 5)
        if sample_limit > 0:
            try:
                sample = collection.get(limit=sample_limit, include=["documents", "metadatas", "ids"])
                docs = sample.get("documents") or []
                flat = []
                for d in docs:
                    if isinstance(d, list):
                        flat.extend([x for x in d if x])
                    else:
                        flat.append(d)
                info["sample_docs"] = [
                    {"chars": len(s), "preview": s[:160]} for s in flat[:sample_limit]
                ]
                info["sample_ids"] = (sample.get("ids") or [])[:sample_limit]
            except Exception as sample_err:
                info["sample_error"] = str(sample_err)
    except Exception as count_err:
        info["count_error"] = str(count_err)
    return info

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)