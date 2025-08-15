# Lexplain MVP

A web app for legal document upload, summarization, and Q&A. Built with Next.js (frontend), FastAPI (backend), Firestore (metadata), and Google Cloud Storage (documents).

## Monorepo Structure

- `/frontend` — Next.js app (UI, auth, upload, Q&A)
- `/backend` — FastAPI app (API, processing, GCS/Firestore adapters)

## Prerequisites
- Node.js 14+
- Python 3.9+
- Google Cloud project (for GCS/Firestore)
- Firebase project (for Auth)

## Local Setup

1. **Clone repo**
2. **Frontend:**
   ```sh
   cd frontend
   npm install
   npm run dev
   ```
3. **Backend:**
   ```sh
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
4. **Environment Variables:**
   - See `.env.example` in each folder for required keys (GCS, Firestore, Firebase, Vertex).
   - For local dev, you can use mock mode (see backend/README.md).

## Features
- Firebase Auth (email/Google)
- Upload PDF/image/text to GCS
- OCR, chunking, embedding (mocked or Vertex)
- Firestore for metadata, vector search
- Summarization & Q&A with source citations
- Export summary as PDF
- Legal disclaimer everywhere

## Deployment
- Backend: Cloud Run (Dockerfile provided)
- Frontend: Firebase Hosting or Vercel

## Demo Script
- See `demo_script.md` for step-by-step walkthrough.

---
**Disclaimer:** This tool provides informational summaries only, not legal advice.
