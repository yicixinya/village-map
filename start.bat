@echo off
echo ========================================
echo   Village Map - Starting local server
echo ========================================
echo Keep this window open. Press Ctrl+C to stop.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause