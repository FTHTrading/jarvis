param(
    [switch]$Stop,
    [switch]$Status
)
<#
.SYNOPSIS
    Start / Stop / Status for the Unykorn Daemon + extension helper.

.USAGE
    powershell -ExecutionPolicy Bypass -File start-daemon.ps1
    powershell -ExecutionPolicy Bypass -File start-daemon.ps1 -Stop
    powershell -ExecutionPolicy Bypass -File start-daemon.ps1 -Status
#>

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$DaemonDir   = Join-Path $ScriptDir "..\daemon"
$EnvFile     = Join-Path $DaemonDir ".env"
$EnvExample  = Join-Path $DaemonDir ".env.example"
$PidFile     = Join-Path $env:TEMP "unykorn-daemon.pid"

function Write-Status($msg, $color = "Cyan") {
    Write-Host "[unykorn] $msg" -ForegroundColor $color
}

# ── Stop ─────────────────────────────────────────────────────────────────────
if ($Stop) {
    if (Test-Path $PidFile) {
        $pid = Get-Content $PidFile
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Remove-Item $PidFile -Force
            Write-Status "Daemon (PID $pid) stopped." "Yellow"
        } catch {
            Write-Status "Could not stop PID $pid — may already be gone." "Yellow"
            Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Status "No PID file found — daemon not running (or started externally)." "Yellow"
    }
    exit 0
}

# ── Status ────────────────────────────────────────────────────────────────────
if ($Status) {
    try {
        $r = Invoke-RestMethod "http://127.0.0.1:40201/health" -TimeoutSec 3
        Write-Status "Daemon ONLINE  brain=$($r.brain)  openclaw=$($r.openclawOnline)  ollama=$($r.ollamaOnline)" "Green"
    } catch {
        Write-Status "Daemon OFFLINE" "Red"
    }
    exit 0
}

# ── Start ─────────────────────────────────────────────────────────────────────
Write-Status "Starting Unykorn Daemon..."

# Node check
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Status "Node.js not found. Install from https://nodejs.org" "Red"
    exit 1
}

# .env bootstrap
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Status ".env created from .env.example — add your keys to: $EnvFile" "Yellow"
    } else {
        Write-Status ".env.example missing — cannot bootstrap config." "Red"
        exit 1
    }
}

# npm install if needed
if (-not (Test-Path (Join-Path $DaemonDir "node_modules"))) {
    Write-Status "Running npm install..."
    Push-Location $DaemonDir
    npm install --silent
    Pop-Location
}

# Check if already running
try {
    $r = Invoke-RestMethod "http://127.0.0.1:40201/health" -TimeoutSec 2
    Write-Status "Daemon already running  brain=$($r.brain)" "Green"
    exit 0
} catch {}

# Launch daemon
$proc = Start-Process node -ArgumentList "server.js" `
    -WorkingDirectory $DaemonDir `
    -WindowStyle Hidden `
    -PassThru
$proc.Id | Out-File $PidFile -Force

Start-Sleep -Seconds 2

try {
    $r = Invoke-RestMethod "http://127.0.0.1:40201/health" -TimeoutSec 3
    Write-Status "Daemon started (PID $($proc.Id))  brain=$($r.brain)" "Green"
    Write-Status "OpenClaw: $($r.openclawOnline)  Ollama: $($r.ollamaOnline)" "Cyan"
} catch {
    Write-Status "Daemon started but health check failed — check $DaemonDir\daemon.log" "Yellow"
}

Write-Host ""
Write-Status "Load the extension in Chrome/Edge:" "White"
Write-Status "  1. chrome://extensions  (or edge://extensions)" "White"
Write-Status "  2. Enable 'Developer mode'" "White"
Write-Status "  3. 'Load unpacked' → select: $ScriptDir\..\extension" "White"
