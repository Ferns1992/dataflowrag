from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DocumentBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    mime_type: str
    file_extension: str
    folder_id: Optional[int] = None
    is_public: bool = False


class DocumentCreate(DocumentBase):
    owner_id: int


class DocumentResponse(DocumentBase):
    id: int
    owner_id: int
    extracted_text: Optional[str] = None
    ocr_completed: bool
    vectorized: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    file_extension: str
    mime_type: str
    owner_id: int
    ocr_completed: bool
    vectorized: bool
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None


class FolderCreate(FolderBase):
    owner_id: int


class FolderResponse(FolderBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentAccessCreate(BaseModel):
    user_id: int
    can_read: bool = True
    can_write: bool = False
    can_delete: bool = False


class DocumentAccessResponse(DocumentAccessCreate):
    id: int
    document_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RAGSearchRequest(BaseModel):
    query: str
    top_k: int = 5


class RAGSearchResult(BaseModel):
    content: str
    document_id: int
    document_name: str
    score: float


class RAGSearchResponse(BaseModel):
    results: List[RAGSearchResult]


class RAGAskRequest(BaseModel):
    query: str
    top_k: int = 5
