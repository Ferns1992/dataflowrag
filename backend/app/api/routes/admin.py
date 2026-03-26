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
