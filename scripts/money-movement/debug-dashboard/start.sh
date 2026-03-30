#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
BRIDGE_FILE="$MOBILE_DIR/app/components/UI/Ramp/debug/RampsDebugBridge.ts"
INIT_FILE="$MOBILE_DIR/app/core/Engine/controllers/ramps-controller/ramps-controller-init.ts"

needs_setup=false

if [ ! -f "$BRIDGE_FILE" ]; then
  needs_setup=true
elif ! grep -q 'initRampsDebugBridge' "$INIT_FILE" 2>/dev/null; then
  needs_setup=true
fi

if [ "$needs_setup" = true ]; then
  echo "  Debug bridge not found — running setup first..."
  echo ""
  bash "$SCRIPT_DIR/setup.sh"
  echo ""
fi

exec node "$SCRIPT_DIR/server.mjs"
