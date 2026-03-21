from typing import List, Optional
import numpy as np
import requests
from sqlalchemy.orm import Session
from app.models.document import DocumentChunk, Document
from app.core.config import settings


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]

        if start > 0:
            chunk = text[start - overlap : start] + chunk

        chunk = chunk.strip()
        if chunk:
            chunks.append(chunk)

        start += chunk_size

    return chunks


def get_embedding(text: str, ollama_url: str = None) -> Optional[List[float]]:
    if ollama_url is None:
        ollama_url = settings.OLLAMA_URL

    try:
        response = requests.post(
            f"{ollama_url}/api/embeddings",
            json={"model": settings.EMBEDDING_MODEL, "prompt": text},
            timeout=30,
        )
        if response.status_code == 200:
            return response.json().get("embedding")
        print(f"Embedding error: {response.status_code} - {response.text}")
        return None
    except Exception as e:
        print(f"Embedding error: {e}")
        return None


def cosine_similarity(a: List[float], b: List[float]) -> float:
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def store_chunk_embeddings(
    db: Session, document_id: int, chunks: List[str], ollama_url: str = None
) -> bool:
    if ollama_url is None:
        ollama_url = settings.OLLAMA_URL

    try:
        existing_chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .all()
        )
        for chunk in existing_chunks:
            db.delete(chunk)
        db.commit()

        for i, chunk_text in enumerate(chunks):
            embedding = get_embedding(chunk_text, ollama_url)
            if embedding is None:
                print(f"Failed to get embedding for chunk {i}")
                continue

            chunk_record = DocumentChunk(
                document_id=document_id,
                chunk_index=i,
                content=chunk_text,
                embedding_id=f"doc_{document_id}_chunk_{i}",
            )
            db.add(chunk_record)

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error storing embeddings: {e}")
        return False


def search_similar_chunks(
    db: Session,
    query: str,
    user_id: int,
    top_k: int = 5,
    ollama_url: str = None,
) -> List[dict]:
    if ollama_url is None:
        ollama_url = settings.OLLAMA_URL

    try:
        query_embedding = get_embedding(query, ollama_url)
        if not query_embedding:
            return []

        accessible_docs = (
            db.query(Document.id)
            .filter((Document.owner_id == user_id) | (Document.is_public == True))
            .subquery()
        )

        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id.in_(accessible_docs))
            .all()
        )

        results = []
        for chunk in chunks:
            if not chunk.content:
                continue

            chunk_embedding = get_embedding(chunk.content[:1000], ollama_url)
            if not chunk_embedding:
                continue

            similarity = cosine_similarity(query_embedding, chunk_embedding)
            doc = db.query(Document).filter(Document.id == chunk.document_id).first()

            results.append(
                {
                    "content": chunk.content[:500],
                    "document_id": chunk.document_id,
                    "document_name": doc.original_filename if doc else "Unknown",
                    "score": float(similarity),
                }
            )

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
    except Exception as e:
        print(f"Search error: {e}")
        return []


def generate_answer(context: str, question: str, ollama_url: str = None) -> str:
    if ollama_url is None:
        ollama_url = settings.OLLAMA_URL

    try:
        prompt = f"""Based on the following documents, answer the question.

Documents:
{context}

Question: {question}

Answer:"""

        response = requests.post(
            f"{ollama_url}/api/generate",
            json={"model": settings.LLM_MODEL, "prompt": prompt, "stream": False},
            timeout=60,
        )

        if response.status_code == 200:
            return response.json().get("response", "No response generated")
        return f"Error: {response.status_code}"
    except Exception as e:
        return f"Error: {str(e)}"
