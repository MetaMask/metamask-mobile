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
# Source .js.env but only for vars not already set, so caller env takes precedence.
if [ -f .js.env ]; then
  while IFS= read -r _line || [ -n "$_line" ]; do
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _line="${_line#export }"
    _key="${_line%%=*}"
    _key="${_key//[[:space:]]/}"
    [[ -n "$_key" && -z "${!_key+x}" ]] && eval "export $_line" 2>/dev/null || true
  done < .js.env
  unset _line _key
fi

PORT="${WATCHER_PORT:-8081}"
LOGFILE=".agent/metro.log"
PIDFILE=".agent/metro.pid"
APP_LAUNCH_LOG=".agent/ios-app-launch.log"
APP_LAUNCH_PIDFILE=".agent/ios-app-launch.pid"
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
  SIM_TARGET="${SIM_UDID:-${IOS_SIMULATOR:-booted}}"
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
    SIM_TARGET="${SIM_UDID:-${IOS_SIMULATOR:-booted}}"
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

ios_app_running() {
  xcrun simctl spawn "$SIM_TARGET" launchctl list 2>/dev/null | grep -q "$BUNDLE_ID"
}

open_dev_client_ios() {
  local output
  if output=$(xcrun simctl openurl "$SIM_TARGET" "$DEV_CLIENT_URL" 2>&1); then
    return 0
  fi
  echo "WARN: simctl openurl failed: ${output:-no output}"
  return 1
}

launch_direct_ios() {
  local output
  if output=$(xcrun simctl launch "$SIM_TARGET" "$BUNDLE_ID" 2>&1); then
    [ -n "$output" ] && echo "$output"
    return 0
  fi
  echo "WARN: simctl launch failed: ${output:-no output}"
  return 1
}

launch_console_ios() {
  local pid
  pid=$(node - "$SIM_TARGET" "$BUNDLE_ID" "$APP_LAUNCH_LOG" "$APP_LAUNCH_PIDFILE" <<'NODE'
const { spawn } = require('child_process');
const fs = require('fs');

const [, , simTarget, bundleId, logFile, pidFile] = process.argv;
const logFd = fs.openSync(logFile, 'a');
const child = spawn('xcrun', ['simctl', 'launch', '--console', simTarget, bundleId], {
  detached: true,
  stdio: ['ignore', logFd, logFd],
});
fs.writeFileSync(pidFile, String(child.pid));
child.unref();
process.stdout.write(String(child.pid));
NODE
)
  echo "simctl launch --console PID: $pid, logging to $APP_LAUNCH_LOG"
}

stop_previous_ios_console() {
  if [ -f "$APP_LAUNCH_PIDFILE" ]; then
    local old_pid
    old_pid=$(cat "$APP_LAUNCH_PIDFILE" 2>/dev/null || true)
    if [ -n "$old_pid" ]; then
      kill "$old_pid" 2>/dev/null || true
    fi
    rm -f "$APP_LAUNCH_PIDFILE"
  fi
}

launch_app_ios() {
  stop_previous_ios_console
  suppress_expo_dev_menu_ios
  xcrun simctl terminate "$SIM_TARGET" "$BUNDLE_ID" 2>/dev/null || true
  sleep 1

  ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://localhost:${PORT}?disableOnboarding=1', safe=''))")
  DEV_CLIENT_URL="expo-metamask://expo-development-client/?url=${ENCODED_URL}"

  echo "Launching iOS app with console log capture..."
  > "$APP_LAUNCH_LOG"
  launch_console_ios
  sleep 15
  if ios_app_running; then
    echo "Opening iOS dev-client URL..."
    open_dev_client_ios || true
    sleep 5
  fi
  if ios_app_running; then
    echo "iOS app running: $BUNDLE_ID"
    return 0
  fi

  echo "iOS app is not running after console launch/dev-client URL; trying direct launch."
  launch_direct_ios || true
  sleep 8
  if ios_app_running; then
    echo "iOS app running: $BUNDLE_ID"
    return 0
  fi

  echo "iOS app is not running after direct launch; trying dev-client URL."
  for attempt in 1 2; do
    echo "Opening iOS dev client (attempt ${attempt})..."
    open_dev_client_ios || true
    sleep 5
    if ios_app_running; then
      echo "iOS app running: $BUNDLE_ID"
      return 0
    fi

    echo "iOS app is not running after openurl."
  done

  echo "ERROR: iOS app did not stay running after launch."
  echo "       Simulator: $SIM_TARGET"
  echo "       Bundle ID: $BUNDLE_ID"
  echo "       Last 20 lines of $APP_LAUNCH_LOG:"
  tail -20 "$APP_LAUNCH_LOG" 2>/dev/null || true
  return 1
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

metro_responds() {
  curl -sf --max-time 3 "http://localhost:${PORT}/status" 2>/dev/null | grep -q 'packager-status:running'
}

# --- Detect a running Metro via HTTP probe ---
if metro_responds; then
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

# Clear Metro + Babel transpilation caches only when the inline environment
# changes. Deleting them on every prepare defeats Metro's transform cache, makes
# idempotent prepares rebundle the whole app, and can make CDP readiness time out
# while the app is still compiling JS. Keep an explicit escape hatch for manual
# debugging or env churn.
METRO_CACHE_KEY_FILE=".agent/metro-cache-key"
METRO_CACHE_KEY="$(
  {
    printf 'platform=%s\nport=%s\n' "$PLAT" "$PORT"
    env | grep -E '^(METAMASK_|MM_|NODE_ENV=|EXPO_PUBLIC_|FEATURE_|SEGMENT_|SENTRY_)' | grep -v '^MM_CLEAR_METRO_CACHE=' | sort || true
    [ -f .js.env ] && shasum .js.env
    [ -f babel.config.js ] && shasum babel.config.js
    [ -f metro.config.js ] && shasum metro.config.js
  } | shasum | awk '{print $1}'
)"
if [ "${MM_CLEAR_METRO_CACHE:-0}" = "1" ] \
   || [ ! -f "$METRO_CACHE_KEY_FILE" ] \
   || [ "$(cat "$METRO_CACHE_KEY_FILE" 2>/dev/null || true)" != "$METRO_CACHE_KEY" ]; then
  echo "Metro inline env changed — clearing transform cache..."
  rm -rf "${TMPDIR:-/tmp}/metro-cache" "${TMPDIR:-/tmp}/haste-map-"* 2>/dev/null || true
  mkdir -p "$(dirname "$METRO_CACHE_KEY_FILE")"
  printf '%s\n' "$METRO_CACHE_KEY" > "$METRO_CACHE_KEY_FILE"
else
  echo "Reusing Metro transform cache."
fi

echo "Starting Metro on port $PORT..."
METRO_PID=$(node - "$LOGFILE" "$PIDFILE" "$PORT" <<'NODE'
const { spawn } = require('child_process');
const fs = require('fs');

const [, , logFile, pidFile, port] = process.argv;
const logFd = fs.openSync(logFile, 'a');
const child = spawn('yarn', ['expo', 'start', '--port', port], {
  cwd: process.cwd(),
  detached: true,
  env: { ...process.env, EXPO_NO_TYPESCRIPT_SETUP: '1' },
  stdio: ['ignore', logFd, logFd],
});
fs.writeFileSync(pidFile, String(child.pid));
child.unref();
process.stdout.write(String(child.pid));
NODE
)
echo "Metro PID: $METRO_PID, logging to $LOGFILE"

# Wait for ready signal
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  if metro_responds; then
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
