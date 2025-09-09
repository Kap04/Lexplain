# Lexplain Backend

FastAPI service for document processing, AI analysis, and chat functionality with Google Cloud integration.

## 🏗️ Architecture Overview

The backend handles document upload, text extraction, AI processing, and real-time chat sessions. It integrates with Google Cloud services for storage and AI capabilities.

```
Backend Flow:
Upload → Text Extraction → Chunking → Embeddings → Storage → Q&A/Analysis
```

## 📁 File Structure

```
backend/
├── main.py                 # FastAPI app, API endpoints, WebSocket management
├── pipeline.py            # AI processing pipeline (embeddings, chunking, summarization)
├── firestore_adapter.py   # Firestore database operations and helpers
├── caching_system.py      # Document and response caching logic
├── token_counter.py       # Token estimation and usage tracking
├── requirements.txt       # Python dependencies
├── Dockerfile             # Container configuration for deployment
├── .env.example          # Environment variables template
└── README.md             # This file
```

## 🔧 Core Components

### main.py
**Purpose:** FastAPI application with all API endpoints and WebSocket management

**Key Features:**
- Document upload and processing endpoints
- Chat session management
- Real-time WebSocket updates for document processing status
- Authentication middleware with Firebase token verification
- CORS configuration for frontend integration

**Major Endpoints:**
- `POST /api/upload/content` - Upload and process documents
- `POST /api/chat/session/new` - Create new chat session
- `POST /api/chat/session/{session_id}/message` - Send chat message
- `GET /api/chat/session/{session_id}/message/stream` - Streaming chat responses
- `POST /api/documents/{doc_id}/summarize` - Generate document summary
- `POST /api/documents/{doc_id}/legal-analysis` - Perform legal analysis
- `POST /api/documents/compare` - Compare multiple documents

### pipeline.py
**Purpose:** AI processing pipeline with Gemini API integration

**Key Features:**
- Text chunking with smart overlap handling
- Vector embeddings generation with rate limiting
- Document summarization using Gemini AI
- Legal analysis and risk assessment
- Batch processing for improved performance

**Rate Limiting Configuration:**
- RPM (Requests Per Minute): 30 (configurable via `GEMINI_EMBEDDING_RPM`)
- TPM (Tokens Per Minute): 5000 (configurable via `GEMINI_EMBEDDING_TPM`)
- RPD (Requests Per Day): 1000 (configurable via `GEMINI_EMBEDDING_RPD`)

**Performance Optimizations:**
- **Aggressive Rate Limiting:** Reduced wait times from 60+ seconds to 2-3 seconds maximum
- **Smart Batching:** Larger batch sizes (3000 tokens) for fewer API calls
- **Minimal Inter-batch Delays:** Only 0.3 seconds between batches (down from 1.5s)
- **Optimistic Token Limits:** 50% buffer before blocking (allows temporary over-limit)

**Functions:**
- `chunk_text()` - Split text into manageable chunks
- `embed_text()` - Generate embeddings for single text
- `embed_texts()` - Batch embedding generation
- `generate_summary()` - Create document summaries
- `generate_legal_analysis()` - Perform legal document analysis

### firestore_adapter.py
**Purpose:** Database operations and Firestore interaction layer

**Key Features:**
- Document metadata management
- Chat session storage and retrieval
- User session management
- Chunk and embedding storage
- Query optimization with proper indexing

**Collections:**
- `documents` - Document metadata and processing status
- `chunks` - Text chunks with embeddings for semantic search
- `summaries` - Generated document summaries
- `qa_sessions` - Chat sessions and message history

**Functions:**
- `add_document_metadata()` - Store document information
- `get_qa_sessions_by_user()` - Retrieve user chat sessions
- `update_qa_session_messages()` - Add messages to chat sessions
- `get_chunks_by_doc_id()` - Retrieve document chunks for search

### caching_system.py
**Purpose:** Performance optimization through intelligent caching

**Key Features:**
- In-memory caching for frequently accessed data
- Document content caching to avoid repeated processing
- Summary and analysis result caching
- Cache invalidation strategies

### token_counter.py
**Purpose:** Token usage tracking and cost estimation

**Key Features:**
- Token counting for API usage monitoring
- Cost estimation for different AI operations
- Usage analytics and reporting

## 🚀 Getting Started

### 1. Environment Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` file from `.env.example`:

```bash
# Google Cloud & AI
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Firestore Collections
FIRESTORE_DOCUMENTS_COLLECTION=documents
FIRESTORE_EMBEDDINGS_COLLECTION=chunks
FIRESTORE_SUMMARIES_COLLECTION=summaries
FIRESTORE_QA_COLLECTION=qa_sessions

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name

# Rate Limiting (Optional - defaults provided)
# These are MUCH more aggressive settings for better user experience
GEMINI_EMBEDDING_RPM=30        # 30 requests per minute (was 5)
GEMINI_EMBEDDING_TPM=5000      # 5000 tokens per minute (was 500) 
GEMINI_EMBEDDING_RPD=1000      # 1000 requests per day (was 100)

# For even faster development (use at your own risk):
# GEMINI_EMBEDDING_RPM=60      # 1 request per second
# GEMINI_EMBEDDING_TPM=10000   # Very high token limit

# Firebase Auth (for token verification)
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 3. Google Cloud Setup

1. **Create Google Cloud Project**
2. **Enable APIs:**
   - Firestore API
   - Cloud Storage API
   - Vertex AI API (if using Vertex embeddings)
3. **Create Service Account:**
   - Download JSON key file
   - Set `GOOGLE_APPLICATION_CREDENTIALS` path
4. **Set up Firestore:**
   - Create database in native mode
   - Configure security rules
5. **Create Storage Bucket:**
   - Set appropriate permissions
   - Configure CORS for web access

### 4. Run Development Server

```bash
uvicorn main:app --reload --port 8000
```

API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## 📊 API Documentation

### Authentication
All endpoints require Firebase authentication token in header:
```
Authorization: Bearer <firebase_id_token>
```

### Document Upload Flow
1. `POST /api/upload/content` - Upload document
2. Background processing starts (chunking, embeddings)
3. WebSocket updates sent to frontend
4. Document ready for Q&A and analysis

### Chat Session Flow
1. `POST /api/chat/session/new` - Create session
2. `POST /api/chat/session/{id}/message` - Send message
3. `GET /api/chat/session/{id}/message/stream` - Receive streaming response

### Response Formats
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

Error responses:
```json
{
  "detail": "Error description",
  "error_code": "SPECIFIC_ERROR_CODE"
}
```

## 🔒 Security

### Authentication
- Firebase ID token verification for all endpoints
- User isolation - users can only access their own documents
- Session-based access control

### Data Protection
- Documents stored in Google Cloud Storage with proper access controls
- Firestore security rules prevent unauthorized access
- No sensitive data in logs

### API Security
- CORS properly configured for frontend domains
- Rate limiting to prevent abuse
- Input validation and sanitization

## 🚀 Deployment

### Railway Deployment
1. Connect repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Docker Deployment
```bash
# Build image
docker build -t lexplain-backend .

# Run container
docker run -p 8000:8000 \
  -e GEMINI_API_KEY=your_key \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json \
  -v /path/to/service-account.json:/app/service-account.json \
  lexplain-backend
```

### Cloud Run Deployment
```bash
# Build and deploy
gcloud run deploy lexplain-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 🐛 Troubleshooting

### Common Issues

**Rate Limiting Errors:**
```
Error: Rate limit exceeded
```
- Solution: Reduce `GEMINI_EMBEDDING_RPM` or implement request queuing
- Check current quota usage in Google Cloud Console

**Authentication Failures:**
```
Error: Invalid token
```
- Verify Firebase project configuration
- Check service account permissions
- Ensure `GOOGLE_APPLICATION_CREDENTIALS` path is correct

**Firestore Connection Issues:**
```
Error: Could not connect to Firestore
```
- Verify Firestore API is enabled
- Check service account has Firestore permissions
- Ensure database exists and is in native mode

**Embedding Generation Failures:**
```
Error: Failed to generate embeddings
```
- Check Gemini API key validity
- Verify rate limiting configuration
- Monitor token usage limits

### Performance Optimization

**Slow Response Times:**
- Enable caching in `caching_system.py`
- Increase batch sizes for embeddings
- Use connection pooling for database operations

**High Memory Usage:**
- Implement streaming for large documents
- Clean up temporary files after processing
- Monitor chunk sizes and adjust accordingly

### Monitoring

**Logging:**
- Enable detailed logging in production
- Monitor API response times
- Track error rates and patterns

**Metrics:**
- Document processing times
- API request volumes
- Token usage and costs
- Cache hit rates

## 🧪 Testing

### Unit Tests
```bash
# Run tests
python -m pytest tests/

# Run with coverage
python -m pytest --cov=. tests/
```

### API Testing
```bash
# Test with curl
curl -X POST "http://localhost:8000/api/upload/content" \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-document.pdf"
```

### Load Testing
```bash
# Install locust
pip install locust

# Run load tests
locust -f tests/load_test.py --host=http://localhost:8000
```

## 📈 Performance Metrics

### Typical Performance
- Document upload: < 2 seconds
- Text extraction: < 5 seconds
- Embedding generation: 2-10 seconds (depending on document size)
- Summary generation: 5-15 seconds
- Q&A response: 2-5 seconds

### Optimization Targets
- Reduce embedding generation time through batching
- Implement smart caching for repeated operations
- Optimize database queries with proper indexing

## 🤝 Contributing

### Code Style
- Follow PEP 8 conventions
- Use type hints for function parameters and returns
- Add docstrings for all functions and classes

### Adding New Features
1. Create feature branch from main
2. Implement feature with tests
3. Update documentation
4. Submit pull request

### Testing Guidelines
- Write unit tests for all new functions
- Test error handling and edge cases
- Verify API endpoints with integration tests

---

**Note:** This backend is designed to work with the Lexplain frontend. Ensure both components are properly configured for full functionality.
