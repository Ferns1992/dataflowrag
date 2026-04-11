
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn==21.2.0

COPY backend/app/ ./app/

RUN mkdir -p /app/uploads /app/static && chmod 777 /app/uploads /app/static

COPY frontend/dist/* ./app/static/

RUN if [ ! -f /app/app/static/index.html ]; then \
    echo '<!DOCTYPE html><html><head><title>DataFlowRAG</title></head><body><h1>Error: Frontend not built. Run: cd frontend && npm install && npm run build</h1></body></html>' > /app/app/static/index.html; \
    fi

EXPOSE 4000

RUN chmod -R 777 /app/uploads /app/app/static

CMD ["gunicorn", "--bind", "0.0.0.0:4000", "--workers", "1", "--worker-class", "uvicorn.workers.UvicornWorker", "--max-requests", "50", "--max-requests-jitter", "10", "--timeout", "30", "--keep-alive", "5", "--access-logfile", "-", "--error-logfile", "-", "app.main:app"]

