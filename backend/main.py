# --- Imports ---
import os
import time
import random
from fastapi import FastAPI, Depends, HTTPException, Request, Body, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Tuple
import firebase_admin
from firebase_admin import auth, credentials
from google.cloud import firestore
from dotenv import load_dotenv
load_dotenv()

# FastAPI app instance
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Initialize Firebase Admin SDK (for token validation)
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

# Firebase token verification dependency
def verify_firebase_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print(f"Auth failed: Missing or invalid Authorization header. Got: {auth_header}")
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    id_token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(id_token)
        print(f"Decoded token: {decoded_token}")
        return decoded_token
    except Exception as e:
        print(f"Auth failed: Invalid Firebase ID token. Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")

# Import adapters and pipeline
from firestore_adapter import add_document_metadata, update_document_status, add_chunks, add_summary, get_summary_by_doc_id, get_chunks_by_doc_id
from pipeline import chunk_text, embed_text, embed_texts, generate_summary

# --- PDF Content Extraction Helpers (PyMuPDF) ---
import fitz  # PyMuPDF
import io

def extract_pages_from_pdf_content(content) -> List[Dict[str, Any]]:
    """Extract text from PDF file bytes using PyMuPDF."""
    if not content:
        raise ValueError("Empty PDF content")
    if not isinstance(content, (bytes, bytearray)):
        raise ValueError("PDF extraction expects bytes")
    doc = fitz.open(stream=content, filetype="pdf")
    if doc.is_encrypted:
        try:
            doc.authenticate("")
        except Exception:
            doc.close()
            raise ValueError("PDF is encrypted")
    pages = []
    for i in range(len(doc)):
        p = doc[i]
        text = p.get_text("text") or p.get_text("blocks") or p.get_text("dict") or ""
        pages.append({"page": i+1, "text": text})
    doc.close()
    return pages

# --- API Endpoints ---


# New endpoint: upload document content directly
@app.post("/api/upload/content")
async def upload_document_content(
    file: UploadFile = File(...),
    user=Depends(verify_firebase_token)
):
    print(f"Uploading document: {file.filename} for user: {user['uid']}")
    content = await file.read()
    try:
        pages = extract_pages_from_pdf_content(content)
        extracted_text = "\n\n".join(page["text"] for page in pages)
        print(f"Extracted {len(pages)} pages from PDF. Preview: {extracted_text[:200]}")
    except Exception as e:
        print(f"PDF extraction failed: {e}. Treating as plain text.")
        extracted_text = content.decode('utf-8', errors='ignore')
    doc = {
        "ownerId": user["uid"],
        "filename": file.filename,
        "status": "uploaded",
        "createdAt": firestore.SERVER_TIMESTAMP,
        "documentContent": extracted_text,
    }
    doc_id = add_document_metadata(doc)
    print(f"Document stored with ID: {doc_id}")
    return {"document_id": doc_id, "status": "uploaded"}

@app.post("/api/process/{document_id}")
def process_document(document_id: str, user=Depends(verify_firebase_token)):
    print(f"Processing document: {document_id} for user: {user['uid']}")
    update_document_status(document_id, "processing")
    db = firestore.Client()
    doc_ref = db.collection(os.getenv("FIRESTORE_DOCUMENTS_COLLECTION", "documents")).document(document_id)
    doc = doc_ref.get().to_dict()
    print("Document metadata:", {k:v for k,v in doc.items() if k != 'documentContent'})
    content = doc.get("documentContent", "")
    print("Content preview:", content[:200])
    # Only chunk and embed THIS document's content
    pages = [{"page": 1, "text": content}]
    chunks = chunk_text(pages)
    print(f"Chunked into {len(chunks)} chunks. First chunk preview: {chunks[0]['text'][:100] if chunks else 'No chunks'}")
    batch_size = int(os.getenv("EMBED_BATCH_SIZE", 16))
    try:
        texts = [c["text"] for c in chunks]
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            embeddings = embed_texts(batch_texts)
            for j, emb in enumerate(embeddings):
                idx = i + j
                chunks[idx]["embedding"] = emb
                chunks[idx]["documentId"] = document_id
        print(f"Embeddings generated for {len(chunks)} chunks.")
    except Exception as e:
        update_document_status(document_id, "failed")
        print("Embedding error:", e)
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")
    add_chunks(chunks)
    summary = generate_summary(chunks)
    summary_doc = {"documentId": document_id, **summary}
    add_summary(summary_doc)
    update_document_status(document_id, "processed")
    print(f"Summary generated for document {document_id}.")
    return {"summary": summary["bullets"], "risks": summary["risks"], "status": "processed"}

@app.get("/api/documents/{document_id}/summary")
def get_summary(document_id: str, user=Depends(verify_firebase_token)):
    summary = get_summary_by_doc_id(document_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    # Optionally fetch highlights (clauses)
    return {**summary, "document_id": document_id}

# --- Similarity Search Helpers ---
import numpy as np

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)

def mmr(query_emb, chunk_embs, K=8, lambda_=0.7):
    selected = []
    candidate_idxs = list(range(len(chunk_embs)))
    sim_to_query = [cosine_similarity(query_emb, emb) for emb in chunk_embs]
    while len(selected) < K and candidate_idxs:
        if not selected:
            idx = max(candidate_idxs, key=lambda i: sim_to_query[i])
            selected.append(idx)
            candidate_idxs.remove(idx)
        else:
            scores = []
            for i in candidate_idxs:
                diversity = max([cosine_similarity(chunk_embs[i], chunk_embs[j]) for j in selected]) if selected else 0
                score = lambda_ * sim_to_query[i] - (1 - lambda_) * diversity
                scores.append((score, i))
            idx = max(scores)[1]
            selected.append(idx)
            candidate_idxs.remove(idx)
    return selected

@app.post("/api/documents/{document_id}/query")
def query_document(document_id: str, data: dict = Body(...), user=Depends(verify_firebase_token)):
    question = data.get("question")
    chunks = get_chunks_by_doc_id(document_id)
    chunk_texts = [c["text"] for c in chunks]
    chunk_embs = [c["embedding"] for c in chunks]
    # 1. Embed the query
    query_emb = embed_text(question)
    # 2. Top-K pool
    sim_scores = [cosine_similarity(query_emb, emb) for emb in chunk_embs]
    pool_size = min(50, len(chunks))
    top_pool_idxs = sorted(range(len(sim_scores)), key=lambda i: sim_scores[i], reverse=True)[:pool_size]
    pool_embs = [chunk_embs[i] for i in top_pool_idxs]
    pool_texts = [chunk_texts[i] for i in top_pool_idxs]
    # 3. MMR selection
    K = min(8, len(pool_embs))
    selected_idxs = mmr(query_emb, pool_embs, K=K, lambda_=0.7)
    selected_texts = [pool_texts[i] for i in selected_idxs]
    # 4. Gemini answer
    import google.generativeai as genai
    _API_KEY = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    context = "\n".join(selected_texts)
    prompt = f"Context: {context}\nQuestion: {question}\nAnswer in plain English in ≤ 120 words. If uncertain, respond 'I don't know — please consult a lawyer' and show the top 2 source snippets used."
    response = model.generate_content(prompt)
    answer = response.text if hasattr(response, 'text') else "No answer."
    sources = [
        {"document_id": document_id, "snippet": t[:60]} for t in selected_texts
    ]
    return {"answer": answer, "sources": sources}

@app.post("/api/documents/{document_id}/summarize")
def summarize_document(document_id: str, user=Depends(verify_firebase_token)):
    chunks = get_chunks_by_doc_id(document_id)
    if not chunks or len(chunks) == 0:
        print("No chunks found, processing document first...")
        process_document(document_id, user)
    chunks = get_chunks_by_doc_id(document_id)
    if not chunks:
        raise HTTPException(status_code=500, detail="Failed to generate chunks")

    chunk_texts = [c["text"] for c in chunks]
    chunk_embs = [c["embedding"] for c in chunks]
    # Use MMR to select diverse, representative chunks for summary
    summary_prompt = "Summarize the following document in plain English, focusing on key points and risks."
    summary_emb = embed_text(summary_prompt)
    pool_size = min(50, len(chunks))
    top_pool_idxs = sorted(range(len(chunk_embs)), key=lambda i: cosine_similarity(summary_emb, chunk_embs[i]), reverse=True)[:pool_size]
    pool_embs = [chunk_embs[i] for i in top_pool_idxs]
    pool_texts = [chunk_texts[i] for i in top_pool_idxs]
    K = min(10, len(pool_embs))
    selected_idxs = mmr(summary_emb, pool_embs, K=K, lambda_=0.5)
    selected_texts = [pool_texts[i] for i in selected_idxs]
    # Gemini summary
    import google.generativeai as genai
    _API_KEY = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    context = "\n".join(selected_texts)
    prompt = f"Context: {context}\n{summary_prompt}"
    response = model.generate_content(prompt)
    summary = response.text if hasattr(response, 'text') else "No summary."
    print(f"Fetched {len(chunks)} chunks")
    print(f"Example chunk text: {chunks[0]['text'][:200] if chunks else 'None'}")

    return {"summary": summary}


