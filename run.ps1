Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  NOVAMIND - AI Innovation & Idea Structuring Platform" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$uvPath = "$HOME\.local\bin\uv.exe"
if (Test-Path $uvPath) {
    & $uvPath run python run.py
} else {
    python run.py
}
