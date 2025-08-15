import os
from google.cloud import firestore
from typing import Dict, Any

COLLECTION_DOCUMENTS = os.getenv("FIRESTORE_DOCUMENTS_COLLECTION", "documents")
COLLECTION_CHUNKS = os.getenv("FIRESTORE_EMBEDDINGS_COLLECTION", "chunks")
COLLECTION_SUMMARIES = os.getenv("FIRESTORE_SUMMARIES_COLLECTION", "summaries")
COLLECTION_QA = os.getenv("FIRESTORE_QA_COLLECTION", "qa_sessions")

db = firestore.Client()

def add_document_metadata(doc: Dict[str, Any]) -> str:
    ref = db.collection(COLLECTION_DOCUMENTS).add(doc)
    return ref[1].id

def update_document_status(doc_id: str, status: str):
    db.collection(COLLECTION_DOCUMENTS).document(doc_id).update({"status": status})

def add_chunks(chunks: list):
    batch = db.batch()
    for chunk in chunks:
        ref = db.collection(COLLECTION_CHUNKS).document()
        batch.set(ref, chunk)
    batch.commit()

def add_summary(summary: Dict[str, Any]):
    db.collection(COLLECTION_SUMMARIES).add(summary)

def add_qa_session(qa: Dict[str, Any]):
    db.collection(COLLECTION_QA).add(qa)

def get_summary_by_doc_id(doc_id: str):
    docs = db.collection(COLLECTION_SUMMARIES).where("documentId", "==", doc_id).stream()
    for doc in docs:
        return doc.to_dict()
    return None

def get_chunks_by_doc_id(doc_id: str):
    return [doc.to_dict() for doc in db.collection(COLLECTION_CHUNKS).where("documentId", "==", doc_id).stream()]
