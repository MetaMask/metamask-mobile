#!/usr/bin/env bash
# Stop the TestMu AI tunnel started by start-testmu-tunnel.sh.
#
# Usage:
#   TUNNEL_DIR=./tmp/testmu-tunnel ./tests/scripts/stop-testmu-tunnel.sh

set -euo pipefail

TUNNEL_DIR="${TUNNEL_DIR:-./tmp/testmu-tunnel}"
PID_FILE="$TUNNEL_DIR/tunnel.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No TestMu AI tunnel PID file found — nothing to stop"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping TestMu AI tunnel (PID $PID)..."
  kill "$PID" 2>/dev/null || true
  sleep 2
  kill -9 "$PID" 2>/dev/null || true
else
  echo "TestMu AI tunnel process $PID is not running"
fi

rm -f "$PID_FILE"
echo "TestMu AI tunnel stopped"
