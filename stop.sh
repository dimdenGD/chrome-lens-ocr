#!/usr/bin/env bash
# Stop everything started by run.sh: Cloudflare tunnel, Docker container and
# the native Apple Vision OCR server.
set -uo pipefail

cd "$(dirname "$0")"
RUN_DIR="$(pwd)/.run"

APPLE_PORT="${APPLE_PORT:-3001}"
TUNNEL_NAME="${TUNNEL_NAME:-ocr-01}"
TUNNEL_CONFIG="${TUNNEL_CONFIG:-$HOME/.cloudflared/$TUNNEL_NAME.yml}"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }

# matching_pids <pattern> <candidate pids...>: keep only live pids whose command contains pattern
matching_pids() {
    local pattern="$1"; shift
    [[ $# -gt 0 ]] || return 0   # bash 3.2 treats an empty "$@" as unbound under set -u
    for pid in "$@"; do
        ps -p "$pid" -o command= 2>/dev/null | grep -q -- "$pattern" && echo "$pid"
    done | sort -u
}

# stop_pids <name> <pids...>: SIGTERM, then SIGKILL after 10s
stop_pids() {
    local name="$1"; shift
    if [[ $# -eq 0 ]]; then
        ok "$name not running"
        return
    fi
    for pid in "$@"; do
        kill "$pid" 2>/dev/null
        for _ in {1..10}; do
            kill -0 "$pid" 2>/dev/null || break
            sleep 1
        done
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null
            ok "$name killed (pid $pid)"
        else
            ok "$name stopped (pid $pid)"
        fi
    done
}

# --- 1. Cloudflare tunnel -----------------------------------------------------
log "Cloudflare tunnel ($TUNNEL_NAME)"
candidates=$(cat "$RUN_DIR/tunnel.pid" 2>/dev/null; pgrep -f "cloudflared tunnel --config $TUNNEL_CONFIG run")
# shellcheck disable=SC2086
stop_pids tunnel $(matching_pids "cloudflared tunnel" $candidates)
rm -f "$RUN_DIR/tunnel.pid"

# --- 2. Docker container ------------------------------------------------------
log "Docker container"
if docker info >/dev/null 2>&1; then
    docker compose down >"$RUN_DIR/docker-down.log" 2>&1 && ok "container removed" || cat "$RUN_DIR/docker-down.log"
else
    ok "Docker is not running"
fi

# --- 3. Apple Vision OCR server ------------------------------------------------
log "Apple Vision OCR server (port $APPLE_PORT)"
candidates=$(cat "$RUN_DIR/apple.pid" 2>/dev/null; lsof -ti "tcp:$APPLE_PORT" -sTCP:LISTEN 2>/dev/null)
# shellcheck disable=SC2086
stop_pids apple $(matching_pids "server.js" $candidates)
rm -f "$RUN_DIR/apple.pid"
