# DataFlowRAG

Modern Document Management System with OCR, Search, and User Access Control

## Features

- **User Management**: JWT authentication with role-based access (admin, editor, viewer)
- **Document Management**: Upload, download, and organize documents
- **Document Sharing**: Share documents with specific users or make public
- **OCR Processing**: Automatic text extraction from images, PDFs, and scanned documents
- **Full-Text Search**: Search through all your document content
- **Admin Panel**: Manage users and document access permissions
- **Modern UI**: Dark/Light mode with glass-morphism design
- **Docker Deployable**: Ready for VPS deployment with Portainer

## Quick Start

### Deployment with Portainer

1. Go to **Stacks** → **Add stack**
2. Select **Git repository**
3. Repository URL: `https://github.com/Ferns1992/dataflowrag.git`
4. Click **Deploy stack**

### Manual Deployment

```bash
git clone https://github.com/Ferns1992/dataflowrag.git
cd dataflowrag
docker-compose up -d
```

### Access

- **App**: http://your-vps-ip:4030
- **API Docs**: http://your-vps-ip:4030/docs

### Default Login
- **Username**: `admin`
- **Password**: `admin`

## Features

### Document Upload
- Drag & drop support
- Optional OCR processing (disabled by default to save CPU)
- Supports: PDF, Images, Word, Excel, PowerPoint, CSV, TXT
- File size limit: 50MB

### Document Sharing
- **Share button** on each document to grant access to specific users
- Make documents public to share with everyone
- Remove access anytime
- Admin can manage access from Admin panel

### Search
- Full-text search across all documents and their content
- Filter by filename
- Results show document content snippets

### Admin Panel
- **User Management**: Create, edit, delete users
- **Document Access**: Manage which users can access which documents
- Toggle user active/inactive status
- Change user roles (viewer, editor, admin)

### Modern UI
- Dark/Light theme toggle
- Glass-morphism cards
- Smooth animations
- Responsive design

## Supported File Types

| Type | Extensions |
|------|------------|
| Images | PNG, JPG, JPEG, GIF, BMP, TIFF |
| Documents | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX |
| Text | TXT, MD, CSV, JSON, XML, HTML, RTF |

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, Vite, TypeScript
- **OCR**: Tesseract
- **Auth**: JWT with bcrypt
- **Container**: Docker, Portainer

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `postgres` | Database password |
| `SECRET_KEY` | - | JWT secret key (change in production) |

## License

MIT
