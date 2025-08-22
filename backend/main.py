
# ...existing code...

# Place this with the other @app.* routes after app = FastAPI()

# ...existing code...

# Place this after verify_firebase_token and app = FastAPI()

# ...existing code...

# --- PDF Content Extraction Helpers (PyMuPDF) ---

# --- Imports ---
import os

from fastapi import FastAPI, Depends, HTTPException, Request, Body, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Tuple
import firebase_admin
from firebase_admin import auth, credentials
from google.cloud import firestore
from dotenv import load_dotenv
# Add these imports at the top of main.py
import threading
import traceback
from datetime import datetime

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

@app.delete("/api/chat/session/{session_id}")
def delete_chat_session(session_id: str, user=Depends(verify_firebase_token)):
    session = get_qa_session_by_id(session_id)
    if not session or session.get("userId") != user["uid"]:
        raise HTTPException(status_code=404, detail="Session not found")
    delete_qa_session(session_id)
    return {"success": True}
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


def _create_combined_summary(summary_data: Dict[str, Any]) -> str:
    """Create a combined summary text from bullets and risks."""
    combined_parts = []
    
    # Add document summary bullets
    bullets = summary_data.get("bullets", [])
    if bullets:
        combined_parts.append("📋 **Document Summary:**")
        for bullet in bullets:
            if bullet.strip():
                combined_parts.append(f"• {bullet}")
    
    # Add potential risks
    risks = summary_data.get("risks", [])
    if risks:
        combined_parts.append("\n⚠️ **Potential Risks & Considerations:**")
        for risk in risks:
            if isinstance(risk, dict) and risk.get("label") and risk.get("explanation"):
                combined_parts.append(f"• **{risk['label']}:** {risk['explanation']}")
            elif isinstance(risk, str):
                combined_parts.append(f"• {risk}")
    
    # If no bullets or risks, provide a fallback
    if not combined_parts:
        combined_parts = ["Document processed successfully, but no summary content was generated."]
    
    return "\n".join(combined_parts)


def _clean_message_for_response(message: Dict[str, Any]) -> Dict[str, Any]:
    """Clean a message object to remove Firestore sentinels and make it JSON-serializable."""
    cleaned = dict(message)
    
    # Replace SERVER_TIMESTAMP with current ISO timestamp
    if "timestamp" in cleaned:
        timestamp = cleaned["timestamp"]
        if str(type(timestamp)) == "<class 'google.cloud.firestore_v1.transforms.Sentinel'>":
            cleaned["timestamp"] = datetime.utcnow().isoformat()
        elif hasattr(timestamp, "isoformat"):
            cleaned["timestamp"] = timestamp.isoformat()
    
    return cleaned


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

    # --- Start processing in background so embeddings are created immediately ---
    try:
        t = threading.Thread(target=_process_document_sync, args=(doc_id, user["uid"]), daemon=True)
        t.start()
        print(f"Background processing thread started for {doc_id}")
    except Exception as e:
        print(f"Failed to start background thread for processing: {e}")

    return {"document_id": doc_id, "status": "uploaded"}


@app.post("/api/process/{document_id}")
def process_document(document_id: str, user=Depends(verify_firebase_token)):
    # Synchronous request to (re-)process the document using same helper:
    _process_document_sync(document_id, user["uid"])
    return {"status": "processing_started"}


def _process_document_sync(document_id: str, owner_uid: str):
    """Synchronous processing function that chunks, embeds, stores chunks and summary.
       Can be called directly (synchronously) or from a background thread.
    """
    try:
        print(f"[processor] Starting processing for {document_id} (owner {owner_uid})")
        update_document_status(document_id, "processing")
        db = firestore.Client()
        doc_ref = db.collection(os.getenv("FIRESTORE_DOCUMENTS_COLLECTION", "documents")).document(document_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            print(f"[processor] Document {document_id} not found")
            update_document_status(document_id, "failed")
            return

        doc = snapshot.to_dict() or {}
        content = doc.get("documentContent", "")
        if not content:
            print(f"[processor] No content for {document_id}")
            update_document_status(document_id, "failed")
            return

        # create pages (you are storing as single-page extracted content)
        pages = [{"page": 1, "text": content}]
        chunks = chunk_text(pages)
        if not chunks:
            print(f"[processor] No chunks generated for {document_id}")
            update_document_status(document_id, "failed")
            return

        print(f"[processor] {len(chunks)} chunks created for {document_id} (preview: {chunks[0]['text'][:120]})")

        # embed in batches
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
            print(f"[processor] Embeddings generated for {len(chunks)} chunks.")
        except Exception as e:
            print(f"[processor] Embedding error for {document_id}: {e}")
            traceback.print_exc()
            update_document_status(document_id, "failed")
            return

        # persist chunks and summary
        try:
            add_chunks(chunks)
        except Exception as e:
            print(f"[processor] add_chunks failed for {document_id}: {e}")
            traceback.print_exc()
            update_document_status(document_id, "failed")
            return

        try:
            summary_data = generate_summary(chunks)
            # Create combined summary text
            combined_summary = _create_combined_summary(summary_data)
            
            summary_doc = {
                "documentId": document_id, 
                "bullets": summary_data.get("bullets", []),
                "risks": summary_data.get("risks", []),
                "summary": combined_summary  # Add the combined summary
            }
            print("Generated summary after processing:", summary_doc)
            add_summary(summary_doc)
        except Exception as e:
            print(f"[processor] add_summary failed for {document_id}: {e}")
            traceback.print_exc()
            # still mark processed if chunking/embeds worked; but mark partial
            update_document_status(document_id, "processed_with_summary_error")
            return

        update_document_status(document_id, "processed")
        print(f"[processor] Document {document_id} processed successfully.")
    except Exception as e:
        print(f"[processor] Unexpected error while processing {document_id}: {e}")
        traceback.print_exc()
        try:
            update_document_status(document_id, "failed")
        except Exception:
            pass


@app.get("/api/documents/{document_id}/summary")
def get_summary(document_id: str, user=Depends(verify_firebase_token)):
    summary_data = get_summary_by_doc_id(document_id)
    if not summary_data:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    # If we don't have a combined summary field, create it on the fly
    if "summary" not in summary_data:
        combined_summary = _create_combined_summary(summary_data)
        summary_data["summary"] = combined_summary
    
    print("Fetched summary of the document:", summary_data)
    return {**summary_data, "document_id": document_id}

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

from firestore_adapter import add_qa_session, get_qa_sessions_by_user, get_qa_session_by_id, update_qa_session_messages, delete_qa_session
# Add this import for title generation
import re

@app.post("/api/chat/session")
def create_chat_session(data: dict = Body(...), user=Depends(verify_firebase_token)):
    """Create a new chat session for a document."""
    document_id = data.get("documentId")
    session = {
        "userId": user["uid"],
        "documentId": document_id,
        "messages": [],
        "createdAt": firestore.SERVER_TIMESTAMP,
        "title": data.get("title") or "New Chat"
    }
    session_id = add_qa_session(session)
    
    # IMPORTANT: Update the session to include its own ID as a field
    from firestore_adapter import update_qa_session_field
    update_qa_session_field(session_id, "session_id", session_id)
    
    return {"session_id": session_id}

def generate_title_from_message(message_text: str) -> str:
    """Generate a title from the first user message."""
    # Clean the message
    clean_text = re.sub(r'[^\w\s]', '', message_text)
    words = clean_text.split()
    
    # Take first 4-6 words, max 40 characters
    if len(words) <= 4:
        title = ' '.join(words)
    else:
        title = ' '.join(words[:4])
    
    # Truncate if too long
    if len(title) > 40:
        title = title[:37] + "..."
    
    return title.strip() or "New Chat"

@app.post("/api/chat/session/{session_id}/message")
def add_message_to_session(session_id: str, data: dict = Body(...), user=Depends(verify_firebase_token)):
    """Add a message to a chat session and get AI response."""
    session = get_qa_session_by_id(session_id)
    if not session or session.get("userId") != user["uid"]:
        raise HTTPException(status_code=404, detail="Session not found")
    
    document_id = session["documentId"]
    
    # Check if this is the first message to generate title
    is_first_message = len(session.get("messages", [])) == 0
    
    # Create user message with current timestamp
    current_time = datetime.utcnow().isoformat()
    user_message = {
        "role": "user", 
        "text": data["text"], 
        "timestamp": current_time
    }
    
    # Generate AI response (same logic as before)
    chunks = get_chunks_by_doc_id(document_id)
    chunk_texts = [c["text"] for c in chunks]
    chunk_embs = [c["embedding"] for c in chunks]
    query_emb = embed_text(data["text"])
    sim_scores = [cosine_similarity(query_emb, emb) for emb in chunk_embs]
    pool_size = min(50, len(chunks))
    top_pool_idxs = sorted(range(len(sim_scores)), key=lambda i: sim_scores[i], reverse=True)[:pool_size]
    pool_embs = [chunk_embs[i] for i in top_pool_idxs]
    pool_texts = [chunk_texts[i] for i in top_pool_idxs]
    K = min(8, len(pool_embs))
    selected_idxs = mmr(query_emb, pool_embs, K=K, lambda_=0.7)
    selected_texts = [pool_texts[i] for i in selected_idxs]
    
    import google.generativeai as genai
    _API_KEY = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    context = "\n".join(selected_texts)
    prompt = f"Context: {context}\nQuestion: {data['text']}\nAnswer in plain English in ≤ 120 words. If uncertain, respond 'I don't know — please consult a lawyer' and show the top 2 source snippets used."
    response = model.generate_content(prompt)
    
    ai_message = {
        "role": "ai", 
        "text": response.text if hasattr(response, 'text') else "No answer.", 
        "timestamp": current_time
    }
    
    # Update session with new messages
    update_qa_session_messages(session_id, [user_message, ai_message])
    
    # Generate and update title if this is the first message
    updated_session = session  # Default
    if is_first_message:
        new_title = generate_title_from_message(data["text"])
        from firestore_adapter import update_qa_session_field
        update_qa_session_field(session_id, "title", new_title)
        # Get updated session
        updated_session = get_qa_session_by_id(session_id)
    
    return {
        "messages": [user_message, ai_message],
        "session": updated_session  # Include updated session info
    }

@app.get("/api/chat/sessions")
def list_chat_sessions(user=Depends(verify_firebase_token)):
    """List all chat sessions for the user."""
    sessions = get_qa_sessions_by_user(user["uid"])
    return {"sessions": sessions}

@app.get("/api/chat/session/{session_id}")
def get_chat_session(session_id: str, user=Depends(verify_firebase_token)):
    session = get_qa_session_by_id(session_id)
    if not session or session.get("userId") != user["uid"]:
        raise HTTPException(status_code=404, detail="Session not found")
    return session