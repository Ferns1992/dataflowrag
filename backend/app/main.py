from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import auth, documents, rag, admin
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(rag.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    from app.init_db import init_db

    init_db()


@app.get("/")
async def root():
    static_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(static_path):
        return FileResponse(static_path)
    return RedirectResponse(url="/api")


@app.get("/{path:path}")
async def serve_frontend(path: str):
    static_path = os.path.join(os.path.dirname(__file__), "static", path)
    if os.path.exists(static_path) and os.path.isfile(static_path):
        return FileResponse(static_path)

    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {
        "error": "Frontend not built",
        "message": "Run build.sh to build the frontend",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
