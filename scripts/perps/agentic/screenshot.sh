#!/bin/bash
# Take a screenshot of the iOS Simulator or Android Emulator and save it to .agent/screenshots/.
# Usage: scripts/perps/agentic/screenshot.sh [label]
# Output: prints the absolute path to the saved screenshot.
#
# Platform detection order:
#   1. PLATFORM env var override (ios / android)
#   2. Booted iOS simulator found → ios
#   3. Connected Android device/emulator found → android
#   4. Default → ios
#
# iOS:  Resolves simulator UDID from IOS_SIMULATOR in .js.env (default: iPhone16Pro-Alpha).
# Android: Uses adb exec-out screencap. Targets ADB_SERIAL or first connected device.
#
# Note: ANDROID_DEVICE in .js.env is a CDP device name for target filtering.
#       ADB_SERIAL is the adb device serial for screenshot capture (from `adb devices`).
#
# Keeps the last 20 screenshots.

set -euo pipefail

cd "$(dirname "$0")/../../.."
[ -f .js.env ] && source .js.env

LABEL="${1:-screenshot}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DIR=".agent/screenshots"
mkdir -p "$DIR"

# ── Platform detection ────────────────────────────────────────────────
detect_platform() {
  # Explicit override
  if [ "${PLATFORM:-}" = "android" ]; then echo "android"; return; fi
  if [ "${PLATFORM:-}" = "ios" ]; then echo "ios"; return; fi

  # Check if an iOS simulator is booted
  if xcrun simctl list devices 2>/dev/null | grep -q "Booted"; then
    echo "ios"; return
  fi

  # Check if an Android device/emulator is connected
  if command -v adb &>/dev/null && adb devices 2>/dev/null | grep -qw "device"; then
    echo "android"; return
  fi

  # Default to iOS
  echo "ios"
}

# ── iOS: Resolve simulator UDID ──────────────────────────────────────
resolve_ios_udid() {
  local sim_name="${IOS_SIMULATOR:-iPhone16Pro-Alpha}"

  # Try exact match on booted simulator
  local udid
  udid=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devs in data['devices'].items():
  for d in devs:
    if d['name'] == '$sim_name' and d['state'] == 'Booted':
      print(d['udid']); sys.exit(0)
sys.exit(1)
" 2>/dev/null) && echo "$udid" && return

  echo "WARNING: Could not find booted simulator '$sim_name'. Trying default booted device..." >&2

  # Fall back to first booted device
  udid=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devs in data['devices'].items():
  for d in devs:
    if d['state'] == 'Booted':
      print(d['udid']); sys.exit(0)
sys.exit(1)
" 2>/dev/null) && echo "$udid" && return

  echo "ERROR: No booted iOS simulator found." >&2
  return 1
}

# ── iOS: Take screenshot ─────────────────────────────────────────────
take_screenshot_ios() {
  local filepath="$1"
  local udid
  udid=$(resolve_ios_udid) || exit 1
  xcrun simctl io "$udid" screenshot "$filepath" 2>/dev/null
}

# ── Android: Resolve device serial ───────────────────────────────────
resolve_android_device() {
  # ADB_SERIAL takes priority (explicit adb serial from `adb devices`)
  if [ -n "${ADB_SERIAL:-}" ]; then
    echo "$ADB_SERIAL"
  else
    # Auto-detect first connected device
    adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}'
  fi
}

# ── Android: Take screenshot ─────────────────────────────────────────
take_screenshot_android() {
  local filepath="$1"
  local device
  device=$(resolve_android_device)
  if [ -z "$device" ]; then
    echo "ERROR: No Android device/emulator found." >&2
    exit 1
  fi
  adb -s "$device" exec-out screencap -p > "$filepath"
}

# ── Take screenshot ─────────────────────────────────────────────────
FILENAME="${TIMESTAMP}_${LABEL}.png"
FILEPATH="$DIR/$FILENAME"

DETECTED_PLATFORM=$(detect_platform)

if [ "$DETECTED_PLATFORM" = "android" ]; then
  take_screenshot_android "$FILEPATH"
else
  take_screenshot_ios "$FILEPATH"
fi

if [ ! -f "$FILEPATH" ] || [ ! -s "$FILEPATH" ]; then
  echo "ERROR: Screenshot failed. File not created or empty."
  exit 1
fi

# ── Cleanup old screenshots (keep last 20) ──────────────────────────
# shellcheck disable=SC2012
ls -t "$DIR"/*.png 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

# ── Output ──────────────────────────────────────────────────────────
ABSPATH="$(cd "$DIR" && pwd)/$FILENAME"
echo "$ABSPATH"
