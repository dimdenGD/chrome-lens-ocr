#!/usr/bin/env bash
# Start the whole OCR stack on a Mac, detached from the terminal so it keeps
# running after VS Code or the terminal is closed:
#   1. native Apple Vision OCR server (port 3001)
#   2. Docker container with the API (port 3000)
#   3. Cloudflare tunnel (skipped when its config file does not exist)
# Safe to run again: components that are already running are left alone.
# Stop everything with ./stop.sh. Logs and pid files live in .run/
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"
RUN_DIR="$ROOT/.run"

APPLE_PORT="${APPLE_PORT:-3001}"
API_PORT="${API_PORT:-3000}"
TUNNEL_NAME="${TUNNEL_NAME:-ocr-01}"
TUNNEL_CONFIG="${TUNNEL_CONFIG:-$HOME/.cloudflared/$TUNNEL_NAME.yml}"
PUBLIC_URL="${PUBLIC_URL:-https://ocr-01.webmcp.vn}"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  !\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m  ✗\033[0m %s\n' "$*" >&2; exit 1; }

# Run a command in a new session, ignoring SIGHUP, so closing the terminal does not kill it
detach() {
    local name="$1"; shift
    nohup python3 -c 'import os, sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])' "$@" \
        >"$RUN_DIR/$name.log" 2>&1 </dev/null &
    echo $! >"$RUN_DIR/$name.pid"
}

# wait_for <seconds> <command...>: retry the command every second until it succeeds
wait_for() {
    local timeout="$1"; shift
    for ((i = 0; i < timeout; i++)); do
        if "$@" >/dev/null 2>&1; then return 0; fi
        sleep 1
    done
    return 1
}

healthy() { curl -fsS -m 2 "http://127.0.0.1:$1/health"; }
tunnel_registered() { grep -q "Registered tunnel connection" "$RUN_DIR/tunnel.log"; }
tunnel_pids() { pgrep -f "cloudflared tunnel --config $TUNNEL_CONFIG run"; }

# --- Prerequisites ----------------------------------------------------------
[[ "$(uname)" == Darwin ]] || die "run.sh needs macOS (Apple Vision). On Linux use: docker compose up -d"
for cmd in node npm docker python3 curl; do
    command -v "$cmd" >/dev/null || die "$cmd not found"
done
mkdir -p "$RUN_DIR"

if [[ ! -d node_modules ]]; then
    log "Installing Node dependencies"
    npm ci
fi
if [[ ! -x bin/apple-ocr || apple-ocr/AppleOCR.swift -nt bin/apple-ocr ]]; then
    log "Building Apple OCR binary"
    npm run build:apple >"$RUN_DIR/build.log" 2>&1 || { tail -20 "$RUN_DIR/build.log"; die "build failed"; }
fi
if ! grep -q '^APPLE_OCR_URL=' .env 2>/dev/null; then
    echo "APPLE_OCR_URL=http://host.docker.internal:$APPLE_PORT" >>.env
fi

# --- 1. Apple Vision OCR server ------------------------------------------------
log "Apple Vision OCR server (port $APPLE_PORT)"
if healthy "$APPLE_PORT" >/dev/null 2>&1; then
    ok "already running"
else
    detach apple env PORT="$APPLE_PORT" HOST=127.0.0.1 NODE_ENV=production node "$ROOT/server.js"
    wait_for 30 healthy "$APPLE_PORT" || die "did not start, see .run/apple.log"
    ok "started (pid $(cat "$RUN_DIR/apple.pid"))"
fi

# --- 2. Docker container ------------------------------------------------------
log "Docker container (port $API_PORT)"
if ! docker info >/dev/null 2>&1; then
    log "Starting Docker Desktop"
    open -a Docker
    wait_for 120 docker info || die "Docker Desktop did not start"
fi
docker compose up -d --build >"$RUN_DIR/docker.log" 2>&1 || { tail -20 "$RUN_DIR/docker.log"; die "docker compose failed"; }
wait_for 60 healthy "$API_PORT" || die "API not responding, see: docker compose logs"
apple_state=$(healthy "$API_PORT" | python3 -c '
import json, sys
a = json.load(sys.stdin)["engines"]["apple"]
print(a["mode"] if a.get("available") else "unavailable (" + a.get("reason", "") + ")")')
ok "running, Apple OCR: $apple_state"

# --- 3. Cloudflare tunnel -----------------------------------------------------
log "Cloudflare tunnel ($TUNNEL_NAME)"
if [[ ! -f "$TUNNEL_CONFIG" ]]; then
    warn "skipped: $TUNNEL_CONFIG not found"
elif ! command -v cloudflared >/dev/null; then
    warn "skipped: cloudflared not installed"
elif tunnel_pids >/dev/null; then
    ok "already running"
else
    detach tunnel cloudflared tunnel --config "$TUNNEL_CONFIG" run "$TUNNEL_NAME"
    wait_for 30 tunnel_registered || die "tunnel did not connect, see .run/tunnel.log"
    ok "connected (pid $(cat "$RUN_DIR/tunnel.pid"))"
fi

echo
ok "Local:  http://localhost:$API_PORT"
[[ -f "$TUNNEL_CONFIG" ]] && ok "Public: $PUBLIC_URL"
echo "     Logs: .run/*.log    Stop: ./stop.sh"
