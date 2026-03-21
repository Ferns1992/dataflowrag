#!/bin/bash

echo "Building DataFlowRAG..."

cd frontend
npm install
npm run build

mkdir -p ../backend/app/static
cp -r dist/* ../backend/app/static/

echo "Frontend built and copied to backend/app/static/"
echo ""
echo "Build complete! Deploy with:"
echo "  docker-compose up -d"
echo ""
echo "Access at http://localhost:4000"
echo "Login: admin / admin"
