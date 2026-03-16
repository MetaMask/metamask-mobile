#!/bin/bash
# Start Metro bundler — or attach to an already-running instance.
#
# Behavior:
#   1. Probe http://localhost:$PORT/status to detect a running Metro.
#   2. If running: print a message and exit 0 (caller can tail .agent/metro.log).
#   3. If not running: start Metro in background, tee to .agent/metro.log,
#      write PID to .agent/metro.pid, wait for the ready signal.
#
# Sources WATCHER_PORT from .js.env (default 8081).

set -euo pipefail

cd "$(dirname "$0")/../../.."
[ -f .js.env ] && source .js.env

PORT="${WATCHER_PORT:-8081}"
LOGFILE=".agent/metro.log"
PIDFILE=".agent/metro.pid"
TIMEOUT=60

mkdir -p .agent

# --- Detect a running Metro via HTTP probe ---
if curl -sf "http://localhost:${PORT}/status" >/dev/null 2>&1; then
  echo "Metro already running on port $PORT."
  echo ""
  echo "To follow live logs:  tail -f $LOGFILE"
  echo "To reload apps:       ./scripts/perps/agentic/reload-metro.sh"
  echo "To stop Metro:        ./scripts/perps/agentic/stop-metro.sh"
  exit 0
fi

# --- No Metro detected — start fresh ---
> "$LOGFILE"

echo "Starting Metro on port $PORT..."
EXPO_NO_TYPESCRIPT_SETUP=1 yarn expo start --port "$PORT" >> "$LOGFILE" 2>&1 &
METRO_PID=$!
echo "$METRO_PID" > "$PIDFILE"
echo "Metro PID: $METRO_PID, logging to $LOGFILE"

# Wait for ready signal
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  if grep -q "Waiting on http://localhost:${PORT}" "$LOGFILE" 2>/dev/null; then
    echo "Metro ready after ${ELAPSED}s."
    echo ""
    echo "To follow live logs:  tail -f $LOGFILE"
    echo "To reload apps:       ./scripts/perps/agentic/reload-metro.sh"
    echo "To stop Metro:        ./scripts/perps/agentic/stop-metro.sh"
    exit 0
  fi
  if ! kill -0 "$METRO_PID" 2>/dev/null; then
    echo "ERROR: Metro exited unexpectedly. Last 10 lines:"
    tail -10 "$LOGFILE"
    rm -f "$PIDFILE"
    exit 1
  fi
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo "WARNING: Metro did not signal ready within ${TIMEOUT}s (PID $METRO_PID still running)."
echo "Last 10 lines of $LOGFILE:"
tail -10 "$LOGFILE"
exit 1
