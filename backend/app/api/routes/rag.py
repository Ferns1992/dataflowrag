from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.document import Document

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/ingest/{doc_id}")
async def ingest_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        document = db.query(Document).filter(Document.id == doc_id).first()

        if not document:
            return {"message": "Document not found", "error": True}

        user_role = current_user.role
        if hasattr(user_role, "value"):
            user_role = user_role.value

        if document.owner_id != current_user.id and user_role != "admin":
            return {"message": "Not authorized", "error": True}

        if document.extracted_text:
            document.vectorized = True
            db.commit()
            return {"message": "Document marked as processed"}

        return {"message": "No text to process"}
    except Exception as e:
        return {"message": f"Error: {str(e)}", "error": True}


@router.post("/search")
async def search_documents(
    query: str = Query(...),
    top_k: int = Query(5),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        from app.models.document import DocumentAccess

        accessible_ids = [
            acc.document_id
            for acc in db.query(DocumentAccess)
            .filter(DocumentAccess.user_id == current_user.id)
            .all()
        ]

        documents = (
            db.query(Document)
            .filter(
                (Document.owner_id == current_user.id)
                | (Document.is_public == True)
                | (Document.id.in_(accessible_ids))
            )
            .filter(
                Document.original_filename.ilike(f"%{query}%")
                | Document.extracted_text.ilike(f"%{query}%")
            )
            .limit(top_k)
            .all()
        )

        return {
            "results": [
                {
                    "document_id": doc.id,
                    "document_name": doc.original_filename,
                    "content": doc.extracted_text[:500] if doc.extracted_text else "",
                    "score": 1.0,
                }
                for doc in documents
            ]
        }
    except Exception as e:
        return {"results": [], "error": str(e)}


@router.post("/ask")
async def ask_question(
    query: str = Query(...),
    top_k: int = Query(5),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        documents = (
            db.query(Document)
            .filter(
                (Document.owner_id == current_user.id) | (Document.is_public == True)
            )
            .filter(
                Document.extracted_text.isnot(None),
                Document.extracted_text.ilike(f"%{query}%"),
            )
            .limit(top_k)
            .all()
        )

        results = [
            {
                "document_id": doc.id,
                "document_name": doc.original_filename,
                "content": doc.extracted_text[:500] if doc.extracted_text else "",
                "score": 1.0,
            }
            for doc in documents
        ]

        if not results:
            return {"answer": "No documents found matching your query.", "sources": []}

        context = "\n\n".join(
            [f"[{r['document_name']}]: {r['content']}" for r in results]
        )

        return {
            "answer": f"Found {len(results)} document(s) matching your query:\n\n{context}",
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
        return {"answer": f"Error: {str(e)}", "sources": []}
