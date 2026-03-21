FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/

RUN mkdir -p /app/uploads /app/static

RUN echo '<!DOCTYPE html><html><head><title>DataFlowRAG</title></head><body><h1>Building...</h1><p>Frontend not built. Access API at <a href="/api">/api</a></p></body></html>' > /app/static/index.html

EXPOSE 4000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4000"]
