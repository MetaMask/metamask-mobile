#!/bin/bash
# Stop a Metro bundler instance started by start-metro.sh.
#
# Behavior:
#   1. If .agent/metro.pid exists and the process is alive, kill it.
#   2. As a fallback, kill any process listening on $WATCHER_PORT.
#   3. Clean up the PID file.
#
# Exit 0 if Metro was stopped (or wasn't running). Exit 1 on errors.

set -euo pipefail

cd "$(dirname "$0")/../../.."
[ -f .js.env ] && source .js.env

PORT="${WATCHER_PORT:-8081}"
PIDFILE=".agent/metro.pid"

stopped=false

# --- Try the PID file first ---
if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping Metro (PID $PID)..."
    kill "$PID" 2>/dev/null
    # Wait up to 5s for graceful exit
    for i in $(seq 1 5); do
      kill -0 "$PID" 2>/dev/null || break
      sleep 1
    done
    # Force kill if still alive
    if kill -0 "$PID" 2>/dev/null; then
      echo "Forcing kill (PID $PID)..."
      kill -9 "$PID" 2>/dev/null || true
    fi
    stopped=true
  else
    echo "PID $PID from $PIDFILE is not running."
  fi
  rm -f "$PIDFILE"
fi

# --- Fallback: kill anything on the port ---
PORT_PID=$(lsof -ti:"$PORT" 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
  echo "Killing process on port $PORT (PID $PORT_PID)..."
  kill "$PORT_PID" 2>/dev/null || true
  sleep 1
  # Force kill if still alive
  REMAINING=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [ -n "$REMAINING" ]; then
    kill -9 "$REMAINING" 2>/dev/null || true
  fi
  stopped=true
fi

if [ "$stopped" = true ]; then
  echo "Metro stopped."
else
  echo "Metro was not running."
fi
