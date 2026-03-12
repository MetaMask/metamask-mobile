#!/bin/bash
# Start Metro bundler — or attach to an already-running instance.
# Optionally launches the app on a booted simulator/emulator.
#
# Behavior:
#   1. Probe http://localhost:$PORT/status to detect a running Metro.
#   2. If running: print a message and exit 0 (caller can tail .agent/metro.log).
#   3. If not running: start Metro in background, tee to .agent/metro.log,
#      write PID to .agent/metro.pid, wait for the ready signal.
#   4. If --launch flag is passed: after Metro is ready, launch the app via
#      deep link — app auto-connects to Metro.
#
# Usage:
#   scripts/perps/agentic/start-metro.sh            # Metro only
#   scripts/perps/agentic/start-metro.sh --launch   # Metro + launch app
#
# Sources WATCHER_PORT, SIM_UDID, ANDROID_DEVICE, PLATFORM from .js.env (default port: 8081).

set -euo pipefail

cd "$(dirname "$0")/../../.."
[ -f .js.env ] && source .js.env

PORT="${WATCHER_PORT:-8081}"
LOGFILE=".agent/metro.log"
PIDFILE=".agent/metro.pid"
TIMEOUT=60
LAUNCH_APP=false

# ── Platform detection ─────────────────────────────────────────────
detect_platform() {
  if [ -n "${PLATFORM:-}" ]; then echo "$PLATFORM"; return; fi
  if [ -n "${SIM_UDID:-}" ]; then echo "ios"; return; fi
  if [ -n "${ANDROID_DEVICE:-}" ]; then echo "android"; return; fi
  # Default to ios on macOS, android otherwise
  if [ "$(uname)" = "Darwin" ]; then echo "ios"; else echo "android"; fi
}
PLAT=$(detect_platform)

# ── Platform-specific constants ────────────────────────────────────
if [ "$PLAT" = "ios" ]; then
  BUNDLE_ID="io.metamask.MetaMask"
  SIM_TARGET="${SIM_UDID:-booted}"
else
  PACKAGE_ID="io.metamask"
  ADB_TARGET=$(adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}' || true)
  ADB_CMD="adb"
  [ -n "$ADB_TARGET" ] && ADB_CMD="adb -s $ADB_TARGET"
fi

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --launch) LAUNCH_APP=true; shift ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Re-detect platform if --platform was passed after initial detection
if [ -n "${PLATFORM:-}" ] && [ "$PLAT" != "$PLATFORM" ]; then
  PLAT="$PLATFORM"
  if [ "$PLAT" = "ios" ]; then
    BUNDLE_ID="io.metamask.MetaMask"
    SIM_TARGET="${SIM_UDID:-booted}"
  else
    PACKAGE_ID="io.metamask"
    ADB_TARGET=$(adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}' || true)
    ADB_CMD="adb"
    [ -n "$ADB_TARGET" ] && ADB_CMD="adb -s $ADB_TARGET"
  fi
fi

# ── Launch helpers ─────────────────────────────────────────────────

# Suppress the Expo dev launcher onboarding popup (first-launch "developer menu" modal).
# Sets a native preference so the popup never appears — clean for video recording.
suppress_expo_dev_menu_ios() {
  xcrun simctl spawn "$SIM_TARGET" defaults write "$BUNDLE_ID" EXDevMenuIsOnboardingFinished -bool YES 2>/dev/null || true
}
suppress_expo_dev_menu_android() {
  local PREFS_DIR="/data/data/$PACKAGE_ID/shared_prefs"
  local PREFS_FILE="expo.modules.devmenu.sharedpreferences.xml"
  $ADB_CMD shell "mkdir -p $PREFS_DIR && echo '<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?><map><boolean name=\"isOnboardingFinished\" value=\"true\" /></map>' > $PREFS_DIR/$PREFS_FILE" 2>/dev/null || true
}

launch_app_ios() {
  suppress_expo_dev_menu_ios
  xcrun simctl terminate "$SIM_TARGET" "$BUNDLE_ID" 2>/dev/null || true
  sleep 1

  ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://localhost:${PORT}?disableOnboarding=1', safe=''))")
  DEV_CLIENT_URL="expo-metamask://expo-development-client/?url=${ENCODED_URL}"
  xcrun simctl openurl "$SIM_TARGET" "$DEV_CLIENT_URL" 2>/dev/null || \
    echo "WARN: Could not launch app — is it installed on this simulator?"

  # First launch after a rebuild sometimes crashes — retry once
  sleep 5
  if ! xcrun simctl spawn "$SIM_TARGET" launchctl list 2>/dev/null | grep -q "$BUNDLE_ID"; then
    echo "App exited after launch — retrying..."
    sleep 2
    xcrun simctl openurl "$SIM_TARGET" "$DEV_CLIENT_URL" 2>/dev/null || true
  fi
}

launch_app_android() {
  # Ensure device can reach Metro on host (localhost on device != host machine)
  $ADB_CMD reverse tcp:$PORT tcp:$PORT 2>/dev/null || echo "WARN: adb reverse failed — device may not reach Metro"

  suppress_expo_dev_menu_android
  $ADB_CMD shell am force-stop "$PACKAGE_ID" 2>/dev/null || true
  sleep 1

  ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://localhost:${PORT}?disableOnboarding=1', safe=''))")
  DEV_CLIENT_URL="expo-metamask://expo-development-client/?url=${ENCODED_URL}"
  $ADB_CMD shell am start -a android.intent.action.VIEW -d "$DEV_CLIENT_URL" 2>/dev/null || \
    echo "WARN: Could not launch app — is it installed on this device?"

  # First launch after a rebuild sometimes crashes — retry once
  sleep 5
  if ! $ADB_CMD shell pidof "$PACKAGE_ID" >/dev/null 2>&1; then
    echo "App exited after launch — retrying..."
    sleep 2
    $ADB_CMD shell am start -a android.intent.action.VIEW -d "$DEV_CLIENT_URL" 2>/dev/null || true
  fi

}

launch_app() {
  if [ "$PLAT" = "ios" ]; then launch_app_ios; else launch_app_android; fi
}

mkdir -p .agent

# --- Detect a running Metro via HTTP probe ---
if curl -sf "http://localhost:${PORT}/status" >/dev/null 2>&1; then
  echo "Metro already running on port $PORT."
  echo ""
  echo "To follow live logs:  tail -f $LOGFILE"
  echo "To reload apps:       ./scripts/perps/agentic/reload-metro.sh"
  echo "To stop Metro:        ./scripts/perps/agentic/stop-metro.sh"
  if $LAUNCH_APP; then
    echo "Launching app..."
    launch_app
  fi
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
    if $LAUNCH_APP; then
      echo "Launching app..."
      launch_app
    fi
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
