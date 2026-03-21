import os
import uuid
import aiofiles
from typing import Optional
from fastapi import UploadFile
from app.core.config import settings


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".tiff",
    ".tif",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".rtf",
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif"}
PDF_EXTENSIONS = {".pdf"}


def get_mime_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    mime_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".json": "application/json",
        ".xml": "application/xml",
        ".html": "text/html",
        ".rtf": "application/rtf",
    }
    return mime_types.get(ext, "application/octet-stream")


def is_allowed_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS


def is_image_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTENSIONS


def is_pdf_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in PDF_EXTENSIONS


async def save_upload_file(
    upload_file: UploadFile, owner_id: int
) -> tuple[str, str, int]:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, str(owner_id)), exist_ok=True)

    file_id = str(uuid.uuid4())
    original_filename = upload_file.filename
    ext = os.path.splitext(original_filename)[1].lower()
    new_filename = f"{file_id}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, str(owner_id), new_filename)

    file_size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await upload_file.read(8192):
            file_size += len(chunk)
            await f.write(chunk)

    return file_path, original_filename, file_size
