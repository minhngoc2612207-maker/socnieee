@echo off
chcp 65001 > nul
title Soconie CRM - Khởi Động Lại Máy Chủ (Localhost)
color 0e
echo ============================================================
echo   SOCONIE CRM - LÀM MỚI ^& KHỞI ĐỘNG LẠI MÁY CHỦ LOCALHOST
echo   Chủ sở hữu : Lê Minh Ngọc
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/3] Đang giải phóng cổng 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Đang tắt tiến trình cũ (PID: %%a)...
    taskkill /f /pid %%a > nul 2>&1
)
timeout /t 1 > nul

echo [2/3] Tự động mở trình duyệt tại http://localhost:5000/ ...
start "" "http://localhost:5000/"

echo [3/3] Đang khởi động Flask Server mới tại http://localhost:5000 ...
echo.
"C:\Users\THC\.python\python.exe" run_crm.py
if %ERRORLEVEL% NEQ 0 (
    python run_crm.py
)
pause
