@echo off
chcp 65001 >nul
title Soconie CRM - Đẩy mã nguồn lên GitHub socnieee
color 0b

echo ======================================================================
echo    SOCONIE CRM - LÊ MINH NGỌC - ĐẨY CODE LÊN GITHUB
echo ======================================================================
echo.
echo Đang kết nối tới https://github.com/minhngoc2612207-maker/socnieee.git...
echo.

set "PATH=C:\Users\THC\.git_portable\cmd;%PATH%"
cd /d "D:\Minh Ngọc BI"

echo 1. Kiểm tra trạng thái Git...
git status -s

echo.
echo 2. Đang đẩy toàn bộ thư mục (crm, api, templates, app.py) lên GitHub...
echo (Nếu có cửa sổ nhỏ GitHub hiện ra, bạn chỉ cần bấm "Sign in with your browser")
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================================
    echo    THÀNH CÔNG 100%! TẤT CẢ CODE ĐÃ LÊN GITHUB socnieee!
    echo    Vercel sẽ tự động build và chạy web mượt mà ngay bây giờ!
    echo ======================================================================
) else (
    echo ======================================================================
    echo    Đẩy code chưa hoàn tất. Vui lòng kiểm tra lại quyền đăng nhập GitHub.
    echo ======================================================================
)

echo.
pause
