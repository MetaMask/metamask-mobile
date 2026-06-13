#!/usr/bin/env bash
set -euo pipefail

# Boot Android emulator with BLE/netsim support (-grpc 8554)
# Required for Speculos Ledger testing

AVD="${1:-Pixel_5_Pro_API_34}"
EMULATOR="${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator"

if ! command -v "$EMULATOR" &>/dev/null; then
  echo "Error: Emulator not found at $EMULATOR"
  echo "Set ANDROID_HOME or install Android SDK"
  exit 1
fi

echo "Booting emulator '$AVD' with BLE/netsim support (gRPC :8554)..."
echo "This terminal must stay open while the emulator runs."
echo ""

exec "$EMULATOR" \
  -avd "$AVD" \
  -no-snapshot-load \
  -no-audio \
  -no-boot-anim \
  -gpu swiftshader_indirect \
  -grpc 8554
