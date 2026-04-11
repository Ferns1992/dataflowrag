from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_role, get_current_active_user
from app.models.user import User, UserRole
from app.models.document import Document, DocumentAccess
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.document import DocumentAccessCreate, DocumentAccessResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: UserUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if role_data.role:
        user.role = role_data.role

    if role_data.is_active is not None:
        user.is_active = role_data.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()


@router.get("/documents", response_model=List[dict])
async def list_all_documents(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    documents = db.query(Document).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "original_filename": doc.original_filename,
            "owner_id": doc.owner_id,
            "owner_name": doc.owner.username if doc.owner else None,
            "file_size": doc.file_size,
            "is_public": doc.is_public,
            "created_at": doc.created_at,
        }
        for doc in documents
    ]


@router.get("/documents/{document_id}/access")
async def get_document_access(
    document_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    access_list = (
        db.query(DocumentAccess).filter(DocumentAccess.document_id == document_id).all()
    )
    users_with_access = [
        {
            "user_id": acc.user_id,
            "username": acc.user.username,
            "email": acc.user.email,
            "can_read": acc.can_read,
            "can_write": acc.can_write,
            "can_delete": acc.can_delete,
        }
        for acc in access_list
    ]
    return {
        "document": {
            "id": document.id,
            "original_filename": document.original_filename,
            "owner_id": document.owner_id,
            "owner_name": document.owner.username if document.owner else None,
            "is_public": document.is_public,
        },
        "access_list": users_with_access,
    }


@router.post("/documents/{document_id}/access")
async def manage_document_access(
    document_id: int,
    access_data: DocumentAccessCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    existing = (
        db.query(DocumentAccess)
        .filter(
            DocumentAccess.document_id == document_id,
            DocumentAccess.user_id == access_data.user_id,
        )
        .first()
    )

    if existing:
        existing.can_read = access_data.can_read
        existing.can_write = access_data.can_write
        existing.can_delete = access_data.can_delete
        db.commit()
        return existing

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


@router.delete("/documents/{document_id}/access/{user_id}", status_code=204)
async def remove_document_access(
    document_id: int,
    user_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    access = (
        db.query(DocumentAccess)
        .filter(
            DocumentAccess.document_id == document_id,
            DocumentAccess.user_id == user_id,
        )
        .first()
    )
    if access:
        db.delete(access)
        db.commit()


@router.put("/documents/{document_id}/public")
async def toggle_document_public(
    document_id: int,
    is_public: bool,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    document.is_public = is_public
    db.commit()
    return {"id": document.id, "is_public": document.is_public}


@router.get("/database/export")
async def export_database(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    import json
    from datetime import datetime

    users_data = []
    for user in db.query(User).all():
        users_data.append(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "hashed_password": user.hashed_password,
                "role": user.role.value if hasattr(user.role, "value") else user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )

    documents_data = []
    for doc in db.query(Document).all():
        documents_data.append(
            {
                "id": doc.id,
                "filename": doc.filename,
                "original_filename": doc.original_filename,
                "file_path": doc.file_path,
                "file_size": doc.file_size,
                "mime_type": doc.mime_type,
                "file_extension": doc.file_extension,
                "folder_id": doc.folder_id,
                "owner_id": doc.owner_id,
                "is_public": doc.is_public,
                "ocr_completed": doc.ocr_completed,
                "vectorized": doc.vectorized,
                "extracted_text": doc.extracted_text,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
        )

    access_data = []
    for access in db.query(DocumentAccess).all():
        access_data.append(
            {
                "id": access.id,
                "document_id": access.document_id,
                "user_id": access.user_id,
                "can_read": access.can_read,
                "can_write": access.can_write,
                "can_delete": access.can_delete,
            }
        )

    export_data = {
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "users": users_data,
        "documents": documents_data,
        "document_access": access_data,
    }

    return export_data


@router.post("/database/import")
async def import_database(
    data: dict,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db),
):
    from datetime import datetime

    if not data.get("version") or not data.get("users"):
        raise HTTPException(status_code=400, detail="Invalid backup file format")

    users_imported = 0
    documents_imported = 0

    existing_usernames = {u.username for u in db.query(User).all()}
    existing_emails = {u.email for u in db.query(User).all()}

    for user_data in data.get("users", []):
        if user_data["username"] in existing_usernames:
            continue

        if user_data.get("email") and user_data["email"] in existing_emails:
            continue

        user = User(
            username=user_data["username"],
            email=user_data.get("email", ""),
            hashed_password=user_data["hashed_password"],
            role=user_data.get("role", "viewer"),
            is_active=user_data.get("is_active", True),
        )
        db.add(user)
        users_imported += 1

    existing_doc_ids = {d.id for d in db.query(Document).all()}

    for doc_data in data.get("documents", []):
        if doc_data["id"] in existing_doc_ids:
            continue

        document = Document(
            filename=doc_data["filename"],
            original_filename=doc_data["original_filename"],
            file_path=doc_data.get("file_path", ""),
            file_size=doc_data.get("file_size", 0),
            mime_type=doc_data.get("mime_type", ""),
            file_extension=doc_data.get("file_extension", ""),
            folder_id=doc_data.get("folder_id"),
            owner_id=doc_data.get("owner_id"),
            is_public=doc_data.get("is_public", False),
            ocr_completed=doc_data.get("ocr_completed", False),
            vectorized=doc_data.get("vectorized", False),
            extracted_text=doc_data.get("extracted_text"),
        )
        db.add(document)
        documents_imported += 1

    for access_data in data.get("document_access", []):
        existing = (
            db.query(DocumentAccess)
            .filter(
                DocumentAccess.document_id == access_data["document_id"],
                DocumentAccess.user_id == access_data["user_id"],
            )
            .first()
        )

        if not existing:
            access = DocumentAccess(
                document_id=access_data["document_id"],
                user_id=access_data["user_id"],
                can_read=access_data.get("can_read", True),
                can_write=access_data.get("can_write", False),
                can_delete=access_data.get("can_delete", False),
            )
            db.add(access)

    db.commit()

    return {
        "message": "Import completed",
        "users_imported": users_imported,
        "documents_imported": documents_imported,
    }
