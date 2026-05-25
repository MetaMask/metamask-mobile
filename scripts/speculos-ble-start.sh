#!/usr/bin/env bash
set -euo pipefail

SPECULOS_IMAGE="${SPECULOS_IMAGE:-ghcr.io/nicehash/speculos:latest}"
SPECULOS_APP="${SPECULOS_APP:-ethereum}"
SPECULOS_SEED="${SPECULOS_SEED:-}"
TRANSPORT="${TRANSPORT:-usb}"
SPECULOS_HOST="${SPECULOS_HOST:-127.0.0.1}"
CONTROL_PORT="${CONTROL_PORT:-5002}"
APDU_PORT="${APDU_PORT:-9999}"
API_PORT="${API_PORT:-5000}"

cleanup() {
    if [ -n "${SPECULOS_PID:-}" ]; then
        kill "$SPECULOS_PID" 2>/dev/null || true
    fi
    if [ -n "${BLE_PID:-}" ]; then
        kill "$BLE_PID" 2>/dev/null || true
    fi
    docker stop speculos 2>/dev/null || true
    docker rm speculos 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting Speculos emulator..."
SEED_ARG=""
if [ -n "$SPECULOS_SEED" ]; then
    SEED_ARG="--seed $SPECULOS_SEED"
fi

docker run -d --name speculos \
    -p "$APDU_PORT:9999" \
    -p "$API_PORT:5000" \
    "$SPECULOS_IMAGE" \
    run $SEED_ARG --apdu-port 9999 --api-port 5000 "$SPECULOS_APP" &

SPECULOS_PID=$!
echo "Speculos container starting (PID: $SPECULOS_PID)"

echo "Waiting for Speculos API on $SPECULOS_HOST:$API_PORT..."
for i in $(seq 1 30); do
    if curl -sf "http://$SPECULOS_HOST:$API_PORT/apdu" -o /dev/null 2>/dev/null; then
        echo "Speculos API ready."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: Speculos API did not become ready in 30s"
        exit 1
    fi
    sleep 1
done

echo "Starting speculos-ble virtual device (transport: $TRANSPORT)..."
speculos-ble \
    --transport "$TRANSPORT" \
    --speculos-host "$SPECULOS_HOST" \
    --speculos-apdu-port "$APDU_PORT" \
    --speculos-api-port "$API_PORT" \
    --control-api-port "$CONTROL_PORT" \
    --verbose &
BLE_PID=$!

echo "Waiting for control API on $SPECULOS_HOST:$CONTROL_PORT..."
for i in $(seq 1 30); do
    if curl -sf "http://$SPECULOS_HOST:$CONTROL_PORT/health" -o /dev/null 2>/dev/null; then
        echo "Control API ready."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: Control API did not become ready in 30s"
        exit 1
    fi
    sleep 1
done

echo ""
echo "=== Speculos BLE Environment Ready ==="
echo "  Speculos API:  http://$SPECULOS_HOST:$API_PORT"
echo "  Speculos APDU: tcp://$SPECULOS_HOST:$APDU_PORT"
echo "  Control API:   http://$SPECULOS_HOST:$CONTROL_PORT"
echo ""
echo "Press Ctrl+C to stop."

wait
