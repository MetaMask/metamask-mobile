#!/usr/bin/env bash
set -euo pipefail

# Start Speculos via @metamask-previews/hw-emulator DockerManager (docker-compose).
# This uses the hw-emulator's bundled ELF files, docker-compose.yml, and health checks.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
HW_EMULATOR_DIR="${PROJECT_ROOT}/node_modules/@metamask-previews/hw-emulator"

COMPOSE_FILE="${HW_EMULATOR_DIR}/docker-compose.yml"

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Error: hw-emulator docker-compose.yml not found at ${COMPOSE_FILE}"
  echo "Run: yarn add @metamask-previews/hw-emulator@0.1.0-de887b2"
  exit 1
fi

DEVICE="${SPECULOS_DEVICE:-nanox}"
APDU_PORT="${SPECULOS_APDU_PORT:-9998}"
API_PORT="${SPECULOS_API_PORT:-5001}"
SEED="${SPECULOS_SEED:-grit essence story volume tip entry situate found february olympic monitor hybrid}"
DISPLAY="${SPECULOS_DISPLAY:-headless}"
ELF_FILENAME="${SPECULOS_ELF_FILENAME:-ethereum-${DEVICE}.elf}"

echo "Starting Speculos Docker via docker-compose..."
echo "  Device: ${DEVICE}"
echo "  ELF: ${ELF_FILENAME}"
echo "  APDU port: ${APDU_PORT}"
echo "  API port: ${API_PORT}"

SPECULOS_DEVICE="${DEVICE}" \
SPECULOS_ELF_FILENAME="${ELF_FILENAME}" \
SPECULOS_APDU_PORT="${APDU_PORT}" \
SPECULOS_API_PORT="${API_PORT}" \
SPECULOS_SEED="${SEED}" \
SPECULOS_DISPLAY="${DISPLAY}" \
docker compose -f "${COMPOSE_FILE}" up -d

echo "Waiting for Speculos health check..."
for i in $(seq 1 30); do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' metamask-speculos 2>/dev/null || echo "unknown")
  if [ "${HEALTH}" = "healthy" ]; then
    echo "Speculos healthy at http://127.0.0.1:${API_PORT}"
    break
  fi
  echo "  Waiting... (${HEALTH})"
  sleep 2
done

echo ""
echo "Set up adb reverse (if emulator is running):"
echo "  adb reverse tcp:5000 tcp:${API_PORT}"
echo ""
echo "To stop: ./e2e/speculos/scripts/stop-speculos-docker.sh"
