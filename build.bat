@echo off
echo Building DataFlowRAG...

cd frontend
call npm install
call npm run build

if not exist ..\backend\app\static mkdir ..\backend\app\static
xcopy /s /e /y dist\* ..\backend\app\static\

echo.
echo Frontend built and copied to backend\app\static
echo.
echo Build complete! Deploy with:
echo   docker-compose up -d
echo.
echo Access at http://localhost:4000
echo Login: admin / admin
