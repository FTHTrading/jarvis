# One-click Jarvis launcher for Windows (Primary / DIGITALGIANT).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-jarvis.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "== Jarvis launcher ==" -ForegroundColor Cyan
Write-Host "Repo: $Root"

# Optional: verify FTH stack (non-blocking)
foreach ($url in @(
    "http://127.0.0.1:18789/health",
    "http://127.0.0.1:3080/health",
    "http://127.0.0.1:11434/api/tags"
)) {
    try {
        $code = & curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 2 $url
        $color = if ($code -eq "200") { "Green" } else { "Yellow" }
        Write-Host "  $url -> HTTP $code" -ForegroundColor $color
    } catch {
        Write-Host "  $url -> unreachable" -ForegroundColor Yellow
    }
}

if (-not (Test-Path "$Root\.env")) {
    if (Test-Path "$Root\.env.example") {
        Copy-Item "$Root\.env.example" "$Root\.env"
        Write-Host "Created .env from .env.example — add API keys before first run." -ForegroundColor Yellow
    }
}

$venvPython = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating venv..." -ForegroundColor Cyan
    python -m venv .venv
    & "$Root\.venv\Scripts\pip.exe" install -r requirements.txt
}

Write-Host "Starting Jarvis (python -m jarvis)..." -ForegroundColor Green
& $venvPython -m jarvis
