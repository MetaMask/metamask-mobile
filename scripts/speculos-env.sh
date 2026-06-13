#!/usr/bin/env bash
set -euo pipefail

# speculos-env.sh — Start Speculos + Anvil + speculos-ble for manual Ledger testing
#
# Usage:
#   ./scripts/speculos-env.sh start    # Start all services
#   ./scripts/speculos-env.sh stop     # Stop all services
#   ./scripts/speculos-env.sh status   # Check status
#   ./scripts/speculos-env.sh logs     # Tail logs
#
# After starting, launch the app via Metro:
#   yarn start:android
#
# Or run a single Ledger E2E test:
#   LEDGER_E2E=1 yarn detox test -c android.emu.main.speculos.debug --testPathPattern='ledger-send-eth'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SPECULOS_BLE_DIR="$ROOT_DIR/packages/speculos-ble"
HW_EMULATOR_DIR="$ROOT_DIR/node_modules/@metamask-previews/hw-emulator"

# Config
SEED="grit essence story volume tip entry situate found february olympic monitor hybrid"
DEVICE="nanox"
ELF="ethereum-nanox.elf"
CONTAINER="metamask-speculos"
APDU_PORT=9998
API_PORT=5001
CONTROL_API_PORT=5002
ANVIL_PORT=8545
METRO_PORT=8081
CHAIN_ID=1337

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[speculos-env]${NC} $*"; }
warn() { echo -e "${YELLOW}[speculos-env]${NC} $*"; }
err()  { echo -e "${RED}[speculos-env]${NC} $*" >&2; }

check_docker() {
  if ! command -v docker &>/dev/null; then
    err "Docker not found. Install Docker Desktop first."
    exit 1
  fi
  if ! docker info &>/dev/null; then
    err "Docker daemon not running. Start Docker Desktop first."
    exit 1
  fi
}

check_anvil() {
  if ! command -v anvil &>/dev/null; then
    err "anvil not found. Install foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
  fi
}

check_speculos_ble() {
  local venv_python="$SPECULOS_BLE_DIR/.venv/bin/python"
  if [[ ! -f "$venv_python" ]]; then
    err "speculos-ble venv not found at $SPECULOS_BLE_DIR/.venv/"
    err "Run: cd $SPECULOS_BLE_DIR && python3 -m venv .venv && .venv/bin/pip install -e ."
    exit 1
  fi
}

start_docker() {
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "Speculos Docker already running"
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    log "Removing stopped container..."
    docker rm "$CONTAINER" >/dev/null
  fi

  log "Starting Speculos Docker ($DEVICE / $ELF)..."
  docker run -d \
    --name "$CONTAINER" \
    -p "${API_PORT}:5000" \
    -p "${APDU_PORT}:9999" \
    -v "${HW_EMULATOR_DIR}/apps:/speculos/apps:ro" \
    -v "${HW_EMULATOR_DIR}/nvram/main_nvram.bin:/speculos/main_nvram.bin" \
    -e "DISPLAY=:99" \
    "ghcr.io/ledgerhq/speculos:latest" \
    --model "$DEVICE" \
    "/speculos/apps/$ELF" \
    --seed "$SEED" \
    --display headless \
    --apdu-port 9999 \
    --api-port 5000 \
    --load-nvram \
    >/dev/null

  log "Waiting for Speculos to become healthy..."
  for i in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${API_PORT}/" >/dev/null 2>&1; then
      log "Speculos healthy"
      return
    fi
    sleep 2
  done
  err "Speculos failed to become healthy"
  docker logs "$CONTAINER" --tail 20
  exit 1
}

start_anvil() {
  if lsof -i ":${ANVIL_PORT}" -sTCP:LISTEN &>/dev/null; then
    log "Anvil already running on port ${ANVIL_PORT}"
    return
  fi

  log "Starting Anvil on port ${ANVIL_PORT} (chain ${CHAIN_ID})..."
  anvil \
    --chain-id "$CHAIN_ID" \
    --port "$ANVIL_PORT" \
    --mnemonic "$SEED" \
    --balance 1000 \
    --host 127.0.0.1 \
    > /tmp/anvil.log 2>&1 &

  local pid=$!
  echo "$pid" > /tmp/anvil.pid

  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    log "Anvil running (PID $pid)"
  else
    err "Anvil failed to start. Check /tmp/anvil.log"
    exit 1
  fi
}

start_speculos_ble() {
  if lsof -i ":${CONTROL_API_PORT}" -sTCP:LISTEN &>/dev/null; then
    log "speculos-ble already running on port ${CONTROL_API_PORT}"
    return
  fi

  # Kill any stale processes
  pkill -f "speculos_ble" 2>/dev/null || true
  sleep 1

  local venv_python="$SPECULOS_BLE_DIR/.venv/bin/python"

  log "Starting speculos-ble (android-netsim transport)..."
  "$venv_python" -m speculos_ble \
    --transport android-netsim \
    --device-name "Ledger Nano X" \
    --speculos-host 127.0.0.1 \
    --speculos-apdu-port "$APDU_PORT" \
    --speculos-api-port "$API_PORT" \
    --control-api-port "$CONTROL_API_PORT" \
    -v \
    > /tmp/speculos-ble.log 2>&1 &

  local pid=$!
  echo "$pid" > /tmp/speculos-ble.pid

  # Wait for control API
  for i in $(seq 1 15); do
    if curl -sf "http://127.0.0.1:${CONTROL_API_PORT}/" >/dev/null 2>&1; then
      log "speculos-ble control API ready (PID $pid)"
      return
    fi
    sleep 1
  done

  # Even if control API check fails, the process might be running
  if kill -0 "$pid" 2>/dev/null; then
    warn "speculos-ble running but control API not responding yet (PID $pid)"
    warn "Check: tail -f /tmp/speculos-ble.log"
  else
    err "speculos-ble failed to start. Check /tmp/speculos-ble.log"
    exit 1
  fi
}

setup_adb() {
  # Find emulator device
  local device
  device=$(adb devices 2>/dev/null | grep -m1 'emulator.*device' | awk '{print $1}' || true)

  if [[ -z "$device" ]]; then
    warn "No emulator found. Start one first:"
    warn "  \$ANDROID_HOME/emulator/emulator -avd Pixel_5_Pro_API_34 -no-snapshot-load"
    return
  fi

  log "Setting up adb reverse for emulator $device..."
  adb -s "$device" reverse "tcp:${ANVIL_PORT}" "tcp:${ANVIL_PORT}" 2>/dev/null || true
  adb -s "$device" reverse "tcp:${METRO_PORT}" "tcp:${METRO_PORT}" 2>/dev/null || true
  log "Ports forwarded: ${ANVIL_PORT}, ${METRO_PORT}"
}

do_start() {
  log "Starting Ledger test environment..."
  check_docker
  check_anvil
  check_speculos_ble

  start_docker
  start_anvil
  start_speculos_ble
  setup_adb

  echo ""
  log "All services running!"
  echo ""
  echo "  Speculos API:   http://127.0.0.1:${API_PORT}"
  echo "  Speculos APDU:  127.0.0.1:${APDU_PORT}"
  echo "  Control API:    http://127.0.0.1:${CONTROL_API_PORT}"
  echo "  Anvil RPC:      http://127.0.0.1:${ANVIL_PORT}"
  echo "  Ledger address: 0xb0358b8F2314F6f6a392a4be8C7C422e631d9F63"
  echo ""
  echo "  Speculos screen: open http://127.0.0.1:${API_PORT} in browser"
  echo "  Anvil logs:      tail -f /tmp/anvil.log"
  echo "  BLE logs:        tail -f /tmp/speculos-ble.log"
  echo ""
  echo "  To run a test:"
  echo "    LEDGER_E2E=1 yarn detox test -c android.emu.main.speculos.debug --testPathPattern='ledger-send-eth'"
  echo ""
}

do_stop() {
  log "Stopping services..."

  # speculos-ble
  if [[ -f /tmp/speculos-ble.pid ]]; then
    kill "$(cat /tmp/speculos-ble.pid)" 2>/dev/null || true
    rm -f /tmp/speculos-ble.pid
  fi
  pkill -f "speculos_ble" 2>/dev/null || true
  log "speculos-ble stopped"

  # Anvil
  if [[ -f /tmp/anvil.pid ]]; then
    kill "$(cat /tmp/anvil.pid)" 2>/dev/null || true
    rm -f /tmp/anvil.pid
  fi
  log "Anvil stopped"

  # Docker
  docker stop "$CONTAINER" 2>/dev/null || true
  docker rm "$CONTAINER" 2>/dev/null || true
  log "Speculos Docker stopped"
}

do_status() {
  echo ""
  local all_ok=true

  # Docker
  if docker ps --filter "name=$CONTAINER" --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -q "$CONTAINER"; then
    log "Speculos Docker: $(docker ps --filter "name=$CONTAINER" --format '{{.Status}}')"
  else
    warn "Speculos Docker: NOT RUNNING"
    all_ok=false
  fi

  # Anvil
  if lsof -i ":${ANVIL_PORT}" -sTCP:LISTEN &>/dev/null; then
    log "Anvil:          running on :${ANVIL_PORT}"
  else
    warn "Anvil:          NOT RUNNING"
    all_ok=false
  fi

  # speculos-ble
  if lsof -i ":${CONTROL_API_PORT}" -sTCP:LISTEN &>/dev/null; then
    log "speculos-ble:   running on :${CONTROL_API_PORT}"
  else
    warn "speculos-ble:   NOT RUNNING"
    all_ok=false
  fi

  # adb
  local device
  device=$(adb devices 2>/dev/null | grep -m1 'emulator.*device' | awk '{print $1}' || true)
  if [[ -n "$device" ]]; then
    log "Emulator:       $device"
  else
    warn "Emulator:       NOT FOUND"
    warn "Start with: \$ANDROID_HOME/emulator/emulator -avd Pixel_5_Pro_API_34 -no-snapshot-load -no-audio -no-boot-anim -gpu swiftshader_indirect -grpc 8554"
    all_ok=false
  fi

  echo ""
  if $all_ok; then
    log "All services healthy"
  else
    warn "Some services not running — run: $0 start"
  fi
}

do_logs() {
  log "Tailing logs (Ctrl+C to stop)..."
  echo ""
  tail -f /tmp/speculos-ble.log /tmp/anvil.log 2>/dev/null || tail -f /tmp/speculos-ble.log 2>/dev/null || echo "No log files found"
}

case "${1:-help}" in
  start)  do_start  ;;
  stop)   do_stop   ;;
  status) do_status ;;
  logs)   do_logs   ;;
  *)
    echo "Usage: $0 {start|stop|status|logs}"
    echo ""
    echo "  start  — Start Speculos Docker, Anvil, and speculos-ble"
    echo "  stop   — Stop all services"
    echo "  status — Check which services are running"
    echo "  logs   — Tail speculos-ble and Anvil logs"
    exit 1
    ;;
esac
