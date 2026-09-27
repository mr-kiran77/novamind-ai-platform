@echo off
echo ========================================================
echo   SHARE NOVAMIND WITH YOUR FRIENDS OVER THE INTERNET
echo ========================================================
echo.
echo Make sure the server is running (via run.bat).
echo.
echo Trying Cloudflare Tunnel (Free, zero-signup, instant HTTPS)...
where cloudflared >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    cloudflared tunnel --url http://127.0.0.1:8000
) else (
    echo Cloudflared not found in PATH.
    echo Trying localtunnel via npx...
    where npx >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        npx localtunnel --port 8000
    ) else (
        echo.
        echo To share your app online instantly with your friends:
        echo 1. Download Cloudflare tunnel: https://github.com/cloudflare/cloudflared/releases/latest
        echo    Or Ngrok: https://ngrok.com/download
        echo 2. Run: cloudflared tunnel --url http://127.0.0.1:8000
        echo    Or:  ngrok http 8000
        echo.
    )
)
pause
