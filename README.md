# DataFlowRAG

Document Management System with RAG, OCR, and User Management

## Features

- **User Management**: JWT authentication with role-based access (admin, editor, viewer)
- **Document Management**: Upload, download, and organize documents
- **OCR Processing**: Extract text from images, PDFs, and scanned documents
- **RAG Pipeline**: Semantic search and AI-powered Q&A on your documents
- **Docker Deployable**: Ready for VPS deployment

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenAI API Key (optional for RAG features)

### Deployment

1. Build the frontend:
   ```bash
   # Windows
   build.bat
   
   # Linux/Mac
   ./build.sh
   ```

2. Start the application:
   ```bash
   docker-compose up -d
   ```

3. Access at **http://localhost:4030**

### Default Login
- **Username**: admin
- **Password**: admin

## API Documentation

- **API Docs**: http://localhost:4030/docs

## Supported File Types

- Images: PNG, JPG, JPEG, GIF, BMP, TIFF
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Text: TXT, MD, CSV, JSON, XML, HTML, RTF

## Architecture

```
Frontend (React) ←→ Backend (FastAPI) ←→ PostgreSQL
                        ↓
                   OCR Engine + RAG Pipeline
```

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, Vite, TypeScript
- **OCR**: Tesseract
- **RAG**: OpenAI Embeddings + GPT
- **Auth**: JWT with bcrypt

## Development

### Backend (Local)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Local)
```bash
cd frontend
npm install
npm run dev
```

## License

MIT
