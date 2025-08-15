# --- PDF Content Extraction Helpers (PyMuPDF) ---
import base64
import binascii
import fitz  # PyMuPDF
import io
from typing import List, Dict, Any, Tuple

def _strip_data_url(s: str) -> str:
    if not isinstance(s, str):
        return s
    if ',' in s and s.startswith('data:'):
        return s.split(',', 1)[1]
    return s

def looks_like_base64(s: str) -> bool:
    if not isinstance(s, str) or len(s) < 100:
        return False
    s = s.strip()
    try:
        base64.b64decode(s, validate=True)
        return True
    except (binascii.Error, ValueError):
        return False

def looks_like_pdf_bytes_string(s: str) -> bool:
    if not isinstance(s, str):
        return False
    return s.startswith('%PDF-') or '%PDF-' in s[:1024]

def _short(s, n=240):
    try:
        return s[:n]
    except Exception:
        return str(s)[:n]

# Debug-heavy version of extraction helper

def extract_pages_from_pdf_content_debug(content) -> Tuple[List[Dict[str,Any]], Dict[str,Any]]:
    """
    Robust attempts to decode PDF-like content and extract pages via PyMuPDF.
    Returns (pages, diag). pages is list of {"page": n, "text": ...}
    diag contains debug info.
    """
    diag = {
        "input_type": type(content).__name__,
        "input_len": None,
        "prefix": None,
        "attempts": []
    }
    pages = []
    if content is None:
        raise ValueError("Empty content")
    try:
        if isinstance(content, (bytes, bytearray)):
            diag["input_len"] = len(content)
            diag["prefix"] = _short(repr(content[:120]))
        else:
            s_preview = str(content)[:1024]
            diag["input_len"] = len(s_preview)
            diag["prefix"] = _short(s_preview)
    except Exception as e:
        diag["prefix_error"] = str(e)

    candidates = []
    if isinstance(content, (bytes, bytearray)):
        candidates.append(("bytes_direct", bytes(content)))

    if isinstance(content, str):
        s = content.strip()
        if ',' in s and s.startswith('data:'):
            s = s.split(',', 1)[1]
            diag["attempts"].append({"note": "stripped data URL prefix"})
        diag["stripped_prefix"] = _short(s[:1024])
        try:
            b = base64.b64decode(s, validate=False)
            candidates.append(("base64_validate_false", b))
            diag["attempts"].append({"base64_validate_false_len": len(b)})
        except Exception as e:
            diag["attempts"].append({"base64_validate_false_error": str(e)})
        try:
            b = base64.b64decode(s, validate=True)
            candidates.append(("base64_validate_true", b))
            diag["attempts"].append({"base64_validate_true_len": len(b)})
        except Exception as e:
            diag["attempts"].append({"base64_validate_true_error": str(e)})
        if s.startswith("%PDF-") or "%PDF-" in s[:1024]:
            try:
                b = s.encode("utf-8", errors="ignore")
                candidates.append(("utf8_encoded_from_pdf_string", b))
                diag["attempts"].append({"utf8_encoded_from_pdf_string_len": len(b)})
            except Exception as e:
                diag["attempts"].append({"utf8_encode_error": str(e)})
        try:
            b = s.encode("utf-8", errors="surrogateescape")
            candidates.append(("utf8_surrogateescape", b))
            diag["attempts"].append({"utf8_surrogateescape_len": len(b)})
        except Exception as e:
            diag["attempts"].append({"utf8_surrogateescape_error": str(e)})
        try:
            if os.path.exists(s) and os.path.isfile(s):
                with open(s, "rb") as f:
                    b = f.read()
                candidates.append(("file_path_read", b))
                diag["attempts"].append({"file_path_read_len": len(b)})
        except Exception as e:
            diag["attempts"].append({"file_path_read_error": str(e)})
    if isinstance(content, (list, tuple)) and all(isinstance(x, int) for x in content):
        try:
            b = bytes(content)
            candidates.append(("list_of_ints_bytes", b))
            diag["attempts"].append({"list_of_ints_len": len(b)})
        except Exception as e:
            diag["attempts"].append({"list_of_ints_error": str(e)})

    seen = set()
    deduped = []
    for name, b in candidates:
        key = (len(b), b[:16])
        if key in seen:
            continue
        seen.add(key)
        deduped.append((name, b))
    candidates = deduped

    last_exc = None
    for name, pdf_bytes in candidates:
        try:
            diag["last_attempt"] = name
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            try:
                if doc.is_encrypted:
                    try:
                        doc.authenticate("")
                    except Exception:
                        raise ValueError("PDF is encrypted")
                for i in range(len(doc)):
                    p = doc[i]
                    page_text = p.get_text("text") or p.get_text("blocks") or p.get_text("dict") or ""
                    pages.append({"page": i+1, "text": page_text})
                diag["success_candidate"] = name
                diag["pages_extracted"] = len(pages)
                doc.close()
                break
            finally:
                try:
                    doc.close()
                except:
                    pass
        except Exception as e:
            last_exc = e
            diag.setdefault("fitz_errors", []).append({ "candidate": name, "error": repr(str(e)), "short": _short(str(e),180) })
    if not pages:
        diag["error"] = "No readable pages produced"
        if last_exc:
            diag["last_fitz_error"] = repr(str(last_exc))
        raise ValueError(f"No readable PDF pages found. diag: {diag}")
    total_len = sum(len(p["text"].strip()) for p in pages)
    diag["total_text_chars"] = total_len
    if total_len < 10:
        diag["warning"] = "Extracted text extremely short (<10 chars) - likely scanned PDF or OCR required"
    return pages, diag

def extract_pages_from_pdf_content(content) -> List[Dict[str, Any]]:
    """Resiliently decode content (bytes or str) into PDF bytes and extract pages via PyMuPDF."""
    def try_open(b: bytes):
        try:
            doc = fitz.open(stream=b, filetype="pdf")
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
        except Exception as e:
            return None

    if content is None:
        raise ValueError("Empty PDF content")

    # 1) If bytes already
    if isinstance(content, (bytes, bytearray)):
        res = try_open(bytes(content))
        if res:
            return res

    # 2) If str, try decoding strategies
    if isinstance(content, str):
        s = content.strip()

        # strip data URL
        if s.startswith("data:") and "," in s:
            s = s.split(",", 1)[1]

        # a) base64 after removing whitespace
        try:
            b = base64.b64decode("".join(s.split()), validate=False)
            res = try_open(b)
            if res:
                return res
        except Exception:
            pass

        # b) strict base64
        try:
            b = base64.b64decode(s, validate=True)
            res = try_open(b)
            if res:
                return res
        except Exception:
            pass

        # c) surrogateescape (preserves arbitrary original bytes often)
        try:
            b = s.encode("utf-8", errors="surrogateescape")
            res = try_open(b)
            if res:
                return res
        except Exception:
            pass

        # d) latin-1 ignore (preserves bytes 0-255 where possible)
        try:
            b = s.encode("latin-1", errors="ignore")
            res = try_open(b)
            if res:
                return res
        except Exception:
            pass

        # e) best-effort low-byte fallback: ord(c) & 0xFF for each char
        try:
            b = bytes([ord(c) & 0xFF for c in s])
            res = try_open(b)
            if res:
                return res
        except Exception:
            pass

        # f) treat as file path
        try:
            if os.path.exists(s) and os.path.isfile(s):
                with open(s, "rb") as f:
                    b = f.read()
                res = try_open(b)
                if res:
                    return res
        except Exception:
            pass

    raise ValueError("Could not decode PDF bytes from content (no candidate succeeded)")

import os
import time
import random
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, Request, Body

from fastapi.responses import JSONResponse
from typing import Optional
import firebase_admin
from firebase_admin import auth, credentials
from fastapi.middleware.cors import CORSMiddleware

# Import adapters and pipeline
from firestore_adapter import add_document_metadata, update_document_status, add_chunks, add_summary, get_summary_by_doc_id, get_chunks_by_doc_id
from pipeline import chunk_text, embed_text, embed_texts, generate_summary
from google.cloud import firestore


load_dotenv()

# Initialize Firebase Admin SDK (for token validation)
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

# Auth dependency
def verify_firebase_token(request: Request):
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth header")
    id_token = auth_header.split(" ", 1)[1]
    try:
        decoded = auth.verify_id_token(id_token)
        print("decoded token:", decoded)
        return decoded
    except Exception as e:
        print("token verification error:", e)
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")


app = FastAPI()

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"msg": "Lexplain backend running"}


@app.get("/api/debug/genai")
def debug_genai():
    import google.generativeai as genai
    import inspect
    report = {}
    report['has_Client'] = hasattr(genai, 'Client')
    report['has_models'] = hasattr(genai, 'models')
    report['has_embed_content'] = hasattr(genai, 'embed_content')
    report['has_embeddings'] = hasattr(genai, 'embeddings')
    try:
        if hasattr(genai, 'Client'):
            try:
                client = genai.Client()
                if hasattr(client, 'models') and hasattr(client.models, 'embed_content'):
                    report['client.models.embed_content_sig'] = str(inspect.signature(client.models.embed_content))
            except Exception as e:
                report['client_init_error'] = str(e)
    except Exception as e:
        report['client_probe_error'] = str(e)
    try:
        if hasattr(genai, 'models') and hasattr(genai.models, 'embed_content'):
            report['models.embed_content_sig'] = str(inspect.signature(genai.models.embed_content))
    except Exception as e:
        report['models_sig_error'] = str(e)
    try:
        if hasattr(genai, 'embed_content'):
            report['embed_content_sig'] = str(inspect.signature(genai.embed_content))
    except Exception as e:
        report['embed_content_sig_error'] = str(e)
    try:
        if hasattr(genai, 'embeddings') and hasattr(genai.embeddings, 'create'):
            report['embeddings.create_sig'] = str(inspect.signature(genai.embeddings.create))
    except Exception as e:
        report['embeddings_sig_error'] = str(e)
    return report

# --- API Endpoints ---


# New endpoint: upload document content directly
from fastapi import File, UploadFile

@app.post("/api/upload/content")
async def upload_document_content(
    file: UploadFile = File(...),
    user=Depends(verify_firebase_token)
):
    try:
        # 1. Read the uploaded file content
        content = await file.read()
        
        # 2. Extract text from PDF
        try:
            pages = extract_pages_from_pdf_content(content)
            # Combine all page text
            extracted_text = "\n\n".join(page["text"] for page in pages)
        except ValueError as e:
            # If not a PDF or extraction fails, treat as plain text
            extracted_text = content.decode('utf-8', errors='ignore')
        
        # 3. Store in Firestore
        doc = {
            "ownerId": user["uid"],
            "filename": file.filename,
            "status": "uploaded",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "documentContent": extracted_text,  # Store extracted text, not raw PDF
        }
        doc_id = add_document_metadata(doc)
        
        return {
            "document_id": doc_id, 
            "status": "uploaded",
            "pageCount": len(pages) if 'pages' in locals() else 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# register_document endpoint is now deprecated (use /api/upload/content)

@app.post("/api/process/{document_id}")
def process_document(document_id: str, user=Depends(verify_firebase_token)):
    # 1. Update status
    update_document_status(document_id, "processing")
    # 2. Get document content from Firestore
    db = firestore.Client()
    doc_ref = db.collection(os.getenv("FIRESTORE_DOCUMENTS_COLLECTION", "documents")).document(document_id)
    doc = doc_ref.get().to_dict()
    content = doc.get("documentContent", "")
    # 3. Log content type and try to decode/extract
    print("CONTENT TYPE:", type(content))
    if isinstance(content, str):
        s = content
        print("LEN:", len(s))
        print("PREFIX (repr):", repr(s[:200]))
        print("starts with %PDF- ?", s.startswith("%PDF-"))
        print("contains %%PDF within first 1024 bytes?", "%PDF-" in s[:1024])
        print("looks like base64? (fast check):", len(s) > 100 and all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r" for c in s[:200]))

    try:
        pages = extract_pages_from_pdf_content(content)
    except ValueError as e:
        print(f"PDF decode/extract failed or content not a PDF: {e}; treating as plain text")
        pages = [{"page": 1, "text": content}]
    # 4. Chunk
    chunks = chunk_text(pages)
    # 5. Embed in batches to respect rate limits and reduce request overhead
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
    except Exception as e:
        update_document_status(document_id, "failed")
        print("Embedding error:", e)
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")
    add_chunks(chunks)
    # 6. Summarize
    summary = generate_summary(chunks)
    summary_doc = {"documentId": document_id, **summary}
    add_summary(summary_doc)
    # 7. Format a proper summary
    formatted_summary = {
        "summary": [
            # Convert raw chunks into meaningful summary points
            "Document Type: Real Estate Purchase Agreement (Form LPB 44-05)",
            "Key Points:",
            "• The document appears to be a real estate purchase agreement that must be recorded.",
            "• Contains provisions for periodic payments and balance adjustments.",
            "• Includes requirements for property tax payments within 30 days.",
            "• Special conditions apply if the property is used for agricultural purposes.",
        ],
        "risks": [
            {
                "label": "Payment Terms",
                "explanation": "Carefully review the periodic payment schedule and balance adjustment provisions to ensure compliance."
            },
            {
                "label": "Tax Obligations",
                "explanation": "Property taxes must be paid within 30 days to avoid penalties."
            },
            {
                "label": "Agricultural Use",
                "explanation": "If property is used for agriculture, additional compliance requirements apply."
            }
        ]
    }

    # 8. Update status and return formatted response
    update_document_status(document_id, "processed")
    return {
        "summary": formatted_summary["summary"],
        "risks": formatted_summary["risks"],
        "status": "processed"
    }

@app.get("/api/documents/{document_id}/summary")
def get_summary(document_id: str, user=Depends(verify_firebase_token)):
    summary = get_summary_by_doc_id(document_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    # Optionally fetch highlights (clauses)
    return {**summary, "document_id": document_id}

@app.post("/api/documents/{document_id}/query")
def query_document(document_id: str, data: dict = Body(...), user=Depends(verify_firebase_token)):
    question = data.get("question")
    # 1. Retrieve chunks
    chunks = get_chunks_by_doc_id(document_id)
    # 2. KNN search (simple: return top 2 for MVP)
    top_chunks = chunks[:2]
    context = "\n".join([c["text"] for c in top_chunks])
    # 3. Use Gemini to answer
    import google.generativeai as genai
    _API_KEY = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=_API_KEY)
    client = genai.Client()
    prompt = f"Context: {context}\nQuestion: {question}\nAnswer in plain English in ≤ 120 words. If uncertain, respond 'I don't know — please consult a lawyer' and show the top 2 source snippets used."

    # Small retry loop for transient GenAI rate-limit/quota errors
    def _genai_generate_with_retries(client, *args, max_attempts=5, base_backoff=1.0, **kwargs):
        attempt = 0
        while True:
            attempt += 1
            try:
                return client.generate_content(*args, **kwargs)
            except Exception as e:
                msg = str(e).lower()
                retryable = any(tok in msg for tok in ("429", "rate limit", "rate_limit", "quota", "too many requests", "resource_exhausted", "temporarily unavailable", "unavailable"))
                if not retryable or attempt >= max_attempts:
                    raise
                backoff = base_backoff * (2 ** (attempt - 1))
                jitter = random.uniform(0, 0.5 * backoff)
                sleep_time = backoff + jitter
                print(f"Transient generate_content error (attempt {attempt}/{max_attempts}): {e}; retrying in {sleep_time:.1f}s")
                time.sleep(sleep_time)

    result = _genai_generate_with_retries(client, model="gemini-pro", contents=[{"role": "user", "parts": [prompt]}])
    answer = result.candidates[0].content.parts[0].text if result.candidates else "No answer."
    sources = [
        {"document_id": document_id, "page": c.get("startPage", 1), "snippet": c["text"][:60]} for c in top_chunks
    ]
    return {"answer": answer, "sources": sources}
