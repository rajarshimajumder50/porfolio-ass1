@echo off
cd /d "%~dp0"
echo ===================================================
echo   RAJARSHI MAJUMDAR PORTFOLIO - LOCAL SERVER
echo   Opening: http://localhost:3000
echo ===================================================
start http://localhost:3000
python -m http.server 3000
pause
