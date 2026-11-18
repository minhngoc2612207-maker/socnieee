@echo off
chcp 65001 > nul
title Soconie CRM - Lê Minh Ngọc (Localhost)
color 0b
echo ============================================================
echo   SOCONIE CRM - MÁY CHỦ BÁN HÀNG ^& PHÂN TÍCH DỮ LIỆU
echo   Chủ sở hữu : Lê Minh Ngọc
echo   Hotline    : 0363 651 407
echo   Email      : minhngoc2612207@gmail.com
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/3] Đang kiểm tra trạng thái cổng 5000...
set OCCUPIED_PID=
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    set OCCUPIED_PID=%%a
)

if defined OCCUPIED_PID (
    echo [THÔNG BÁO] Máy chủ Soconie CRM đang hoạt động trên cổng 5000 (PID: %OCCUPIED_PID%).
    echo [2/3] Đang tự động mở trình duyệt tại http://localhost:5000/ ...
    start "" "http://localhost:5000/"
    echo.
    echo ============================================================
    echo   Máy chủ đã sẵn sàng tại: http://localhost:5000/
    echo   Để khởi động lại từ đầu, hãy chạy: Khoi_Dong_Lai_Soconie_CRM.bat
    echo ============================================================
    echo.
    pause
    exit /b
)

echo [2/3] Tự động mở trình duyệt tại Trang chủ http://localhost:5000 ...
start "" "http://localhost:5000/"

echo [3/3] Đang khởi động Flask Server tại http://localhost:5000 ...
echo.
echo Nhấn Ctrl + C để dừng máy chủ khi hoàn thành.
echo ============================================================
echo.
"C:\Users\THC\.python\python.exe" run_crm.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LỖI] Đang thử lệnh python mặc định...
    python run_crm.py
)
pause
