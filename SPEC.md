# DataFlowRAG - Document Management System

## Overview
Docker-deployable VPS webapp for document management with RAG (Retrieval-Augmented Generation), OCR, and user management.

## Tech Stack
- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React + Vite
- **Database**: PostgreSQL + pgvector (for embeddings)
- **OCR**: Tesseract + pdf2image
- **RAG**: LangChain + OpenAI embeddings
- **Auth**: JWT tokens
- **File Storage**: Local filesystem with organized structure
- **Container**: Docker + Docker Compose

## Architecture
```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   React     │────▶│   FastAPI   │────▶│  PostgreSQL  │
│   Frontend  │◀────│   Backend   │◀────│   + pgvector │
└─────────────┘     └─────────────┘     └──────────────┘
                           │
                    ┌──────┴──────┐
                    │ OCR Engine  │
                    │   (RAG)     │
                    └─────────────┘
```

## Features

### User Management
- User registration/login with JWT
- Role-based access (admin, editor, viewer)
- Password hashing with bcrypt

### Document Management
- Upload any file type (PDF, images, Office docs)
- Download documents
- Document metadata storage
- Folder organization
- Access control per document

### OCR Processing
- Extract text from images/PDFs
- Support for multiple languages
- Async processing with status tracking

### RAG Pipeline
- Chunk documents for embedding
- Vector storage with pgvector
- Semantic search
- Answer generation from documents

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/{id}` - Get document
- `GET /api/documents/{id}/download` - Download document
- `DELETE /api/documents/{id}` - Delete document

### RAG
- `POST /api/rag/ingest/{doc_id}` - Process document for RAG
- `POST /api/rag/search` - Semantic search
- `POST /api/rag/ask` - Query with context

### Admin
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/{id}/role` - Update user role

## Port Configuration
- **Frontend**: 3000
- **Backend API**: 4000
- **PostgreSQL**: 5432

## Environment Variables
```
DATABASE_URL=postgresql://user:password@db:5432/documents
SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-...
UPLOAD_DIR=/app/uploads
```

## Deployment
```bash
docker-compose up -d
```
