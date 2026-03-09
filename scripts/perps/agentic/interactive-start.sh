#!/bin/bash
# Interactive Metro session for MetaMask Mobile agentic development.
#
# Starts Metro (if not running), tails logs, and provides an interactive
# menu for common agentic operations.
#
# Usage:
#   scripts/perps/agentic/interactive-start.sh [--port <port>]
#
# Keyboard shortcuts:
#   r  — Reload JS bundle
#   s  — Take screenshot
#   u  — Unlock wallet (prompts for password or uses MM_PASSWORD)
#   n  — Navigate to a route (prompts)
#   e  — Eval JS expression (prompts)
#   p  — Press a testID (prompts)
#   t  — Get current route / status
#   d  — Enable Sentry debug mode
#   l  — Show last 50 lines of Metro log
#   c  — Clear screen
#   ?  — Show help
#   q  — Quit (stops Metro)

set -euo pipefail

cd "$(dirname "$0")/../../.."
[ -f .js.env ] && source .js.env

# Parse --port flag
PORT="${WATCHER_PORT:-8081}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

LOGFILE=".agent/metro.log"
PIDFILE=".agent/metro.pid"
SCRIPTS_DIR="scripts/perps/agentic"
BRIDGE="node $SCRIPTS_DIR/cdp-bridge.js"

mkdir -p .agent

# ── Colors ────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${GREEN}> $*${RESET}"; }
warn()  { echo -e "${YELLOW}> $*${RESET}"; }
err()   { echo -e "${RED}> $*${RESET}"; }

# ── Ensure Metro is running ──────────────────────────────────────────────
if ! curl -sf "http://localhost:${PORT}/status" >/dev/null 2>&1; then
  info "Starting Metro on port $PORT..."
  WATCHER_PORT="$PORT" "$SCRIPTS_DIR/start-metro.sh"
fi

# ── Show help ────────────────────────────────────────────────────────────
show_help() {
  echo ""
  echo -e "${BOLD}MetaMask Mobile — Agentic Interactive Session${RESET}"
  echo -e "${DIM}Metro running on port $PORT${RESET}"
  echo ""
  echo "  r  Reload JS bundle"
  echo "  s  Take screenshot"
  echo "  u  Unlock wallet"
  echo "  n  Navigate to route"
  echo "  e  Eval JS expression"
  echo "  p  Press testID"
  echo "  t  Status (route + account)"
  echo "  d  Toggle Sentry debug mode"
  echo "  l  Show last 50 lines of log"
  echo "  c  Clear screen"
  echo "  ?  Show this help"
  echo "  q  Quit (detach, Metro keeps running)"
  echo "  Q  Quit and STOP Metro"
  echo ""
}

# ── Read a line from user (non-raw mode temporarily) ─────────────────────
read_input() {
  local prompt="$1"
  # Restore cooked mode for readline
  if [ -t 0 ]; then
    stty -raw echo 2>/dev/null || true
  fi
  echo -ne "${YELLOW}${prompt}: ${RESET}" >&2
  read -r REPLY
  # Back to raw mode
  if [ -t 0 ]; then
    stty raw -echo 2>/dev/null || true
  fi
  echo "$REPLY"
}

# ── Tail log in background ──────────────────────────────────────────────
if [ -f "$LOGFILE" ]; then
  # Show last 20 lines to catch up
  tail -20 "$LOGFILE" 2>/dev/null || true
fi

# Start background log tail
tail -f "$LOGFILE" 2>/dev/null &
TAIL_PID=$!

# ── Cleanup on exit ─────────────────────────────────────────────────────
cleanup() {
  kill "$TAIL_PID" 2>/dev/null || true
  if [ -t 0 ]; then
    stty -raw echo 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# ── Main loop ────────────────────────────────────────────────────────────
show_help

SENTRY_DEBUG_ENABLED=false

if [ -t 0 ]; then
  stty raw -echo 2>/dev/null || true
fi

while true; do
  # Read single character
  if [ -t 0 ]; then
    KEY=$(dd bs=1 count=1 2>/dev/null) || break
  else
    read -r -n1 KEY || break
  fi

  case "$KEY" in
    r)
      info "Reloading..."
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      "$SCRIPTS_DIR/reload-metro.sh" 2>&1 || err "Reload failed"
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    s)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      LABEL=$(read_input "Screenshot label (default: screenshot)")
      LABEL="${LABEL:-screenshot}"
      info "Taking screenshot..."
      "$SCRIPTS_DIR/screenshot.sh" "$LABEL" 2>&1 || err "Screenshot failed"
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    u)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      if [ -n "${MM_PASSWORD:-}" ]; then
        info "Unlocking with MM_PASSWORD..."
        $BRIDGE unlock "$MM_PASSWORD" 2>&1 || err "Unlock failed"
      else
        PW=$(read_input "Password")
        info "Unlocking..."
        $BRIDGE unlock "$PW" 2>&1 || err "Unlock failed"
      fi
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    n)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      ROUTE=$(read_input "Route name (e.g. PerpsMarketListView)")
      if [ -n "$ROUTE" ]; then
        info "Navigating to $ROUTE..."
        $BRIDGE navigate "$ROUTE" 2>&1 || err "Navigate failed"
      fi
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    e)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      EXPR=$(read_input "JS expression")
      if [ -n "$EXPR" ]; then
        $BRIDGE eval "$EXPR" 2>&1 || err "Eval failed"
      fi
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    p)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      TESTID=$(read_input "testID to press")
      if [ -n "$TESTID" ]; then
        info "Pressing $TESTID..."
        $BRIDGE press-test-id "$TESTID" 2>&1 || err "Press failed"
      fi
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    t)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      $BRIDGE status 2>&1 || err "Status failed"
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    d)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      if [ "$SENTRY_DEBUG_ENABLED" = true ]; then
        info "Disabling Sentry debug mode..."
        $BRIDGE sentry-debug disable 2>&1 || err "Failed"
        SENTRY_DEBUG_ENABLED=false
      else
        info "Enabling Sentry debug mode..."
        $BRIDGE sentry-debug enable 2>&1 || err "Failed"
        SENTRY_DEBUG_ENABLED=true
      fi
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    l)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      echo ""
      tail -50 "$LOGFILE" 2>/dev/null || true
      echo ""
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    c)
      printf '\033[2J\033[H'
      ;;
    "?"|h)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      show_help
      stty raw -echo 2>/dev/null || true
      tail -f "$LOGFILE" 2>/dev/null &
      TAIL_PID=$!
      ;;
    q)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      info "Detached. Metro still running on port $PORT."
      exit 0
      ;;
    Q)
      kill "$TAIL_PID" 2>/dev/null || true
      stty -raw echo 2>/dev/null || true
      info "Stopping Metro..."
      "$SCRIPTS_DIR/stop-metro.sh" 2>&1 || true
      exit 0
      ;;
    $'\x03')  # Ctrl+C
      exit 0
      ;;
  esac
done
