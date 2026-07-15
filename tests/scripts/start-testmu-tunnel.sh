#!/usr/bin/env bash
# Start the TestMu AI (LambdaTest) tunnel binary for mm-connect performance tests.
# Uses shell only — no third-party GitHub Actions (enterprise allowlist compatible).
#
# Usage:
#   LT_USERNAME=... LT_ACCESS_KEY=... TUNNEL_NAME=my-tunnel ./tests/scripts/start-testmu-tunnel.sh
#
# Environment:
#   LT_USERNAME     Required. TestMu AI username.
#   LT_ACCESS_KEY   Required. TestMu AI access key.
#   TUNNEL_NAME     Required. Unique tunnel name (must match TESTMU_TUNNEL_NAME capability).
#   TUNNEL_DIR      Optional. Working directory. Defaults to ./tmp/testmu-tunnel.
#   TUNNEL_WAIT_SEC Optional. Max seconds to wait for tunnel ready. Defaults to 60.

set -euo pipefail

TUNNEL_DIR="${TUNNEL_DIR:-./tmp/testmu-tunnel}"
TUNNEL_WAIT_SEC="${TUNNEL_WAIT_SEC:-60}"
LT_ZIP_URL="https://downloads.lambdatest.com/tunnel/v3/linux/64bit/LT_linux.zip"

if [[ -z "${LT_USERNAME:-}" || -z "${LT_ACCESS_KEY:-}" || -z "${TUNNEL_NAME:-}" ]]; then
  echo "❌ LT_USERNAME, LT_ACCESS_KEY, and TUNNEL_NAME are required" >&2
  exit 1
fi

mkdir -p "$TUNNEL_DIR"

if [[ ! -x "$TUNNEL_DIR/LT" ]]; then
  echo "Downloading TestMu AI tunnel binary..."
  curl -fsSL -o "$TUNNEL_DIR/LT_linux.zip" "$LT_ZIP_URL"
  unzip -o "$TUNNEL_DIR/LT_linux.zip" -d "$TUNNEL_DIR"
  chmod +x "$TUNNEL_DIR/LT"
fi

echo "Starting TestMu AI tunnel: $TUNNEL_NAME"
"$TUNNEL_DIR/LT" \
  --user "$LT_USERNAME" \
  --key "$LT_ACCESS_KEY" \
  --tunnelName "$TUNNEL_NAME" \
  --verbose \
  > "$TUNNEL_DIR/tunnel.log" 2>&1 &

echo $! > "$TUNNEL_DIR/tunnel.pid"
echo "Tunnel PID: $(cat "$TUNNEL_DIR/tunnel.pid")"

deadline=$((SECONDS + TUNNEL_WAIT_SEC))
while (( SECONDS < deadline )); do
  if grep -qiE 'You can start testing now|Tunnel started successfully|Secure connection established' \
    "$TUNNEL_DIR/tunnel.log" 2>/dev/null; then
    echo "✅ TestMu AI tunnel is ready"
    exit 0
  fi
  if ! kill -0 "$(cat "$TUNNEL_DIR/tunnel.pid")" 2>/dev/null; then
    echo "❌ TestMu AI tunnel process exited early. Log:" >&2
    cat "$TUNNEL_DIR/tunnel.log" >&2 || true
    exit 1
  fi
  sleep 2
done

echo "⚠️ Tunnel ready message not detected within ${TUNNEL_WAIT_SEC}s; continuing anyway."
echo "--- tunnel.log (tail) ---"
tail -n 40 "$TUNNEL_DIR/tunnel.log" || true
