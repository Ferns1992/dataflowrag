FROM node:20-slim AS frontend-builder

WORKDIR /build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=frontend-builder /build/dist ./static/
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app/ ./app/

RUN mkdir -p /app/uploads /app/static
RUN if [ ! -f /app/static/index.html ]; then \
    echo '<!DOCTYPE html><html><head><title>DataFlowRAG</title></head><body><h1>Error: Frontend not built</h1></body></html>' > /app/static/index.html; \
    fi

EXPOSE 4000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4000"]
