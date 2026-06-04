#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
HW_EMULATOR_DIR="${PROJECT_ROOT}/node_modules/@metamask-previews/hw-emulator"
COMPOSE_FILE="${HW_EMULATOR_DIR}/docker-compose.yml"

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "hw-emulator compose file not found. Falling back to direct stop."
  docker stop metamask-speculos 2>/dev/null || true
  docker rm metamask-speculos 2>/dev/null || true
  exit 0
fi

echo "Stopping Speculos via docker-compose..."
docker compose -f "${COMPOSE_FILE}" down --timeout 10 2>/dev/null || {
  echo "Compose down failed, forcing removal..."
  docker stop metamask-speculos 2>/dev/null || true
  docker rm metamask-speculos 2>/dev/null || true
}
echo "Done."
