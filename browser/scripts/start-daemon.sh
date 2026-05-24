#!/usr/bin/env bash
# start-daemon.sh — macOS / Linux launcher for Unykorn Daemon
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON_DIR="$SCRIPT_DIR/../daemon"
PID_FILE="$TMPDIR/unykorn-daemon.pid"

log() { echo "[unykorn] $*"; }

case "${1:-start}" in
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      kill "$PID" 2>/dev/null && log "Daemon (PID $PID) stopped." || log "Already gone."
      rm -f "$PID_FILE"
    else
      log "No PID file — daemon not tracked."
    fi
    exit 0 ;;

  status)
    if curl -sf http://127.0.0.1:40201/health | python3 -m json.tool 2>/dev/null; then
      log "Daemon online."
    else
      log "Daemon offline."
    fi
    exit 0 ;;

  start|*)
    # Check node
    command -v node >/dev/null 2>&1 || { log "Node.js not found — install from https://nodejs.org"; exit 1; }

    # Bootstrap .env
    if [ ! -f "$DAEMON_DIR/.env" ]; then
      cp "$DAEMON_DIR/.env.example" "$DAEMON_DIR/.env"
      log ".env created — add your keys to: $DAEMON_DIR/.env"
    fi

    # npm install if needed
    if [ ! -d "$DAEMON_DIR/node_modules" ]; then
      log "Running npm install..."
      npm install --silent --prefix "$DAEMON_DIR"
    fi

    # Already running?
    if curl -sf http://127.0.0.1:40201/health >/dev/null 2>&1; then
      log "Daemon already running."
      exit 0
    fi

    # Launch
    cd "$DAEMON_DIR"
    nohup node server.js > daemon.log 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if curl -sf http://127.0.0.1:40201/health >/dev/null 2>&1; then
      log "Daemon started (PID $(cat $PID_FILE)) ✓"
    else
      log "Daemon started — check $DAEMON_DIR/daemon.log"
    fi

    log ""
    log "Load extension in Chrome/Edge:"
    log "  1. chrome://extensions"
    log "  2. Enable 'Developer mode'"
    log "  3. 'Load unpacked' → $SCRIPT_DIR/../extension"
    log ""
    log "Then verify: node browser/scripts/verify.js"
    ;;
esac
