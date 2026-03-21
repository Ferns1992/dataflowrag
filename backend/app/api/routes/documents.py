from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_active_user, require_role
from app.models.user import User, UserRole
from app.models.document import Document, DocumentAccess, Folder
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    FolderCreate,
    FolderResponse,
    DocumentAccessCreate,
    DocumentAccessResponse,
)
from app.services.file_service import (
    save_upload_file,
    is_allowed_file,
    get_mime_type,
    is_image_file,
    is_pdf_file,
)
from app.services.ocr_service import extract_text_from_file
import os

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED
)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    is_public: bool = Form(False),
    run_ocr: bool = Form(True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_path, original_filename, file_size = await save_upload_file(
        file, current_user.id
    )
    file_extension = os.path.splitext(original_filename)[1].lower()
    mime_type = get_mime_type(original_filename)

    document = Document(
        filename=os.path.basename(file_path),
        original_filename=original_filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        file_extension=file_extension,
        folder_id=folder_id,
        owner_id=current_user.id,
        is_public=is_public,
    )

    if run_ocr and (
        is_image_file(original_filename)
        or is_pdf_file(original_filename)
        or file_extension in {".txt", ".doc", ".docx"}
    ):
        try:
            extracted_text = extract_text_from_file(file_path, file_extension)
            document.extracted_text = extracted_text
            document.ocr_completed = True
        except Exception as e:
            print(f"OCR error: {e}")

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


@router.get("", response_model=List[DocumentListResponse])
async def list_documents(
    folder_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Document).filter(
        (Document.owner_id == current_user.id) | (Document.is_public == True)
    )

    if folder_id is not None:
        query = query.filter(Document.folder_id == folder_id)

    if search:
        query = query.filter(Document.original_filename.ilike(f"%{search}%"))

    documents = (
        query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    )
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and not document.is_public:
        access = (
            db.query(DocumentAccess)
            .filter(
                DocumentAccess.document_id == document_id,
                DocumentAccess.user_id == current_user.id,
            )
            .first()
        )

        if not access or not access.can_read:
            raise HTTPException(status_code=403, detail="Access denied")

    return document


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and not document.is_public:
        access = (
            db.query(DocumentAccess)
            .filter(
                DocumentAccess.document_id == document_id,
                DocumentAccess.user_id == current_user.id,
            )
            .first()
        )

        if not access or not access.can_read:
            raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        document.file_path,
        filename=document.original_filename,
        media_type=document.mime_type,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this document"
        )

    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    db.delete(document)
    db.commit()


@router.post("/{document_id}/access", response_model=DocumentAccessResponse)
async def grant_access(
    document_id: int,
    access_data: DocumentAccessCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to manage access")

    existing_access = (
        db.query(DocumentAccess)
        .filter(
            DocumentAccess.document_id == document_id,
            DocumentAccess.user_id == access_data.user_id,
        )
        .first()
    )

    if existing_access:
        existing_access.can_read = access_data.can_read
        existing_access.can_write = access_data.can_write
        existing_access.can_delete = access_data.can_delete
        db.commit()
        db.refresh(existing_access)
        return existing_access

    access = DocumentAccess(
        document_id=document_id,
        user_id=access_data.user_id,
        can_read=access_data.can_read,
        can_write=access_data.can_write,
        can_delete=access_data.can_delete,
    )
    db.add(access)
    db.commit()
    db.refresh(access)
    return access


@router.get("/{document_id}/rerun-ocr", response_model=DocumentResponse)
async def rerun_ocr(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        extracted_text = extract_text_from_file(
            document.file_path, document.file_extension
        )
        document.extracted_text = extracted_text
        document.ocr_completed = True
        db.commit()
        db.refresh(document)
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
