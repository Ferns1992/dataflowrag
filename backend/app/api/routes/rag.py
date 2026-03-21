from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.schemas.document import (
    RAGSearchRequest,
    RAGSearchResponse,
    RAGAskRequest,
    RAGSearchResult,
)
from app.services.rag_service import (
    search_similar_chunks,
    chunk_text,
    store_chunk_embeddings,
)
from typing import List

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/ingest/{doc_id}")
async def ingest_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == doc_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    if not document.extracted_text:
        raise HTTPException(
            status_code=400, detail="Document has no extracted text. Run OCR first."
        )

    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    chunks = chunk_text(document.extracted_text)

    success = store_chunk_embeddings(
        db=db,
        document_id=document.id,
        chunks=chunks,
        openai_api_key=settings.OPENAI_API_KEY,
    )

    if success:
        document.vectorized = True
        db.commit()
        return {"message": f"Document ingested with {len(chunks)} chunks"}

    raise HTTPException(status_code=500, detail="Failed to ingest document")


@router.post("/search", response_model=RAGSearchResponse)
async def search_documents(
    request: RAGSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    results = search_similar_chunks(
        db=db,
        query=request.query,
        user_id=current_user.id,
        top_k=request.top_k,
        openai_api_key=settings.OPENAI_API_KEY,
    )

    return RAGSearchResponse(
        results=[
            RAGSearchResult(
                content=r["content"],
                document_id=r["document_id"],
                document_name=r["document_name"],
                score=r["score"],
            )
            for r in results
        ]
    )


@router.post("/ask")
async def ask_question(
    request: RAGAskRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        results = search_similar_chunks(
            db=db,
            query=request.query,
            user_id=current_user.id,
            top_k=request.top_k,
            openai_api_key=settings.OPENAI_API_KEY,
        )

        if not results:
            return {
                "answer": "No relevant documents found to answer your question.",
                "sources": [],
            }

        context = "\n\n".join(
            [f"[{r['document_name']}]: {r['content']}" for r in results]
        )

        prompt = f"""Based on the following documents, answer the question.

Documents:
{context}

Question: {request.query}

Answer:"""

        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that answers questions based on the provided documents. Always cite which document you're referencing.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=1000,
        )

        answer = response.choices[0].message.content

        return {
            "answer": answer,
            "sources": [
                {
                    "document_id": r["document_id"],
                    "document_name": r["document_name"],
                    "score": r["score"],
                }
                for r in results
            ],
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating answer: {str(e)}"
        )
