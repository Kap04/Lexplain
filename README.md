# Lexplain - Legal Document AI Assistant

A web application that demystifies legal documents using AI. Upload contracts, terms of service, or any legal text and get plain-English summaries, ask questions, and compare documents side-by-side.

**⚠️ Disclaimer:** This tool provides informational summaries only, not legal advice.

## 🏗️ Architecture

- **Frontend:** Next.js with TypeScript, Tailwind CSS, Firebase Auth
- **Backend:** FastAPI with Python, Google Cloud Firestore, Gemini AI
- **Storage:** Google Cloud Storage for documents, Firestore for metadata
- **AI:** Google Gemini for embeddings, summarization, and Q&A

## 📁 Project Structure

```
Lexplain/
├── frontend/          # Next.js React application
│   ├── app/           # Next.js app router pages
│   ├── components/    # Reusable UI components
│   └── README.md      # Frontend documentation
├── backend/           # FastAPI Python service
│   ├── main.py        # Main API endpoints
│   ├── pipeline.py    # AI processing pipeline
│   ├── firestore_adapter.py  # Database operations
│   └── README.md      # Backend documentation
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Google Cloud project with Firestore and Storage enabled
- Firebase project for authentication
- Gemini API key

### 1. Clone and Setup
```bash
git clone <repository-url>
cd Lexplain
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Copy and configure environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase configuration
```

### 4. Run Development Servers
```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🎯 Features

### Document Processing
- **Upload:** PDF, text, and image files
- **Text Extraction:** Automatic text extraction with fallback support
- **Chunking:** Smart text segmentation for better AI processing
- **Embeddings:** Vector embeddings for semantic search

### AI Capabilities
- **Summarization:** Plain-English summaries of legal documents
- **Q&A:** Ask questions about document content with source citations
- **Legal Analysis:** Identify key terms, risks, and important clauses
- **Document Comparison:** Side-by-side analysis of multiple documents

### User Experience
- **Authentication:** Email/password and Google sign-in
- **Real-time Chat:** Streaming AI responses with markdown formatting
- **Responsive Design:** Works on desktop and mobile devices
- **Export Options:** Download summaries and analyses as PDF

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
FIRESTORE_DOCUMENTS_COLLECTION=documents
FIRESTORE_EMBEDDINGS_COLLECTION=chunks
GCS_BUCKET_NAME=your-bucket-name
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

See `.env.example` files in each directory for complete configuration options.

## 🚀 Deployment

### Backend (Railway/Cloud Run)
1. Configure environment variables in your hosting platform
2. Deploy using the provided `Dockerfile`
3. Ensure proper Google Cloud service account permissions

### Frontend (Vercel/Netlify)
1. Connect your repository to your hosting platform
2. Configure environment variables
3. Deploy automatically on push to main branch

## 📚 Documentation

- [Backend Documentation](backend/README.md) - API endpoints, database schema, AI pipeline
- [Frontend Documentation](frontend/README.md) - Components, pages, state management

## 🛠️ Development

### Adding New Features
1. Backend: Add endpoints in `main.py`, database operations in `firestore_adapter.py`
2. Frontend: Create components in `components/`, pages in `app/`
3. Update documentation in respective README files

### Debugging
- Backend logs: Check console output from `uvicorn`
- Frontend: Use browser dev tools and Next.js error pages
- Database: Monitor Firestore console for query performance

## 📈 Performance Optimization

### Rate Limiting
- Gemini API has strict rate limits (15 RPM, 2000 TPM)
- Batch embedding requests when possible
- Implement caching for frequently accessed data
- Use exponential backoff for failed requests

### Caching Strategy
- Document embeddings cached in Firestore
- Summary results cached to avoid regeneration
- Frontend uses React Query for API response caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Commit: `git commit -am 'Add feature'`
5. Push: `git push origin feature-name`
6. Create a Pull Request

## 🐛 Troubleshooting

### Common Issues
- **Rate Limiting:** Reduce `GEMINI_EMBEDDING_RPM` in environment variables
- **Authentication:** Verify Firebase configuration and service account permissions
- **CORS Errors:** Ensure backend URL is correctly configured in frontend
- **Upload Failures:** Check Google Cloud Storage permissions and bucket configuration

### Getting Help
- Check the documentation in `backend/README.md` and `frontend/README.md`
- Review environment variable configuration
- Check logs for specific error messages

## 📄 License

This project is for educational and demonstration purposes.

---

**Important:** This application provides informational content only and should not be considered legal advice. Always consult with qualified legal professionals for legal matters.
