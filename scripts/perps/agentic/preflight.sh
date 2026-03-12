#!/bin/bash
# preflight.sh — Prepare a clean, ready-to-code environment for a MetaMask Mobile worktree.
#
# This script runs BEFORE dispatching any Claude/Codex session. Zero tokens wasted on
# infrastructure. The agent gets a warm environment: Metro running, app launched, CDP live,
# wallet configured.
#
# Supports both iOS (simulator) and Android (emulator/device). Platform is auto-detected
# from .js.env or can be forced with --platform ios|android.
#
# Full clean flow (--clean):
#   yarn setup → build → install → start-metro → CDP → wallet
#
# Usage:
#   scripts/perps/agentic/preflight.sh [OPTIONS]
#
# Options:
#   --platform <p>     Force platform: ios or android (default: auto-detect from .js.env)
#   --rebuild          Force rebuild (skip if app exists)
#   --clean            Full clean env: yarn setup + clean build artifacts + rebuild
#   --no-launch        Start Metro only, skip app launch
#   --check-only       Exit 0 if environment ready, exit 1 if not (no changes)
#   --wallet-setup     Run setup-wallet.sh after CDP is ready (reads .agent/wallet-fixture.json)
#   --wallet-fixture   Path to wallet fixture JSON (default: .agent/wallet-fixture.json)
#   --wallet <pw>      Unlock existing wallet only (no import; legacy flag)
#
# Exit codes:
#   0 — environment ready (Metro running, CDP responding)
#   1 — environment not ready (with reason)
#
# Developer setup:
#   iOS:     Add SIM_UDID, IOS_SIMULATOR, WATCHER_PORT to .js.env
#   Android: Add ANDROID_DEVICE, WATCHER_PORT to .js.env
#   Then:    cp scripts/perps/agentic/wallet-fixture.example.json .agent/wallet-fixture.json
#   Run:     scripts/perps/agentic/preflight.sh --clean --wallet-setup

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
SCRIPTS="scripts/perps/agentic"
LOGFILE=".agent/metro.log"
CDP_TIMEOUT=90
CDP_RETRY=0

# Flags
DO_REBUILD=false
DO_CLEAN=false
DO_LAUNCH=true
CHECK_ONLY=false
DO_WALLET_SETUP=false
WALLET_FIXTURE="${WALLET_FIXTURE:-.agent/wallet-fixture.json}"
WALLET_PW="${MM_WALLET_PASSWORD:-}"
FORCE_PLATFORM=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)       FORCE_PLATFORM="$2"; shift 2 ;;
    --rebuild)        DO_REBUILD=true; shift ;;
    --clean)          DO_CLEAN=true; DO_REBUILD=true; shift ;;
    --no-launch)      DO_LAUNCH=false; shift ;;
    --check-only)     CHECK_ONLY=true; DO_LAUNCH=false; shift ;;
    --wallet-setup)   DO_WALLET_SETUP=true; shift ;;
    --wallet-fixture) WALLET_FIXTURE="$2"; shift 2 ;;
    --wallet)         WALLET_PW="$2"; shift 2 ;;
    *)                shift ;;
  esac
done

# ── Platform detection ─────────────────────────────────────────────
detect_platform() {
  if [ -n "$FORCE_PLATFORM" ]; then echo "$FORCE_PLATFORM"; return; fi
  if [ -n "${PLATFORM:-}" ]; then echo "$PLATFORM"; return; fi
  if [ -n "${SIM_UDID:-}" ] || [ -n "${IOS_SIMULATOR:-}" ]; then echo "ios"; return; fi
  if [ -n "${ANDROID_DEVICE:-}" ]; then echo "android"; return; fi
  if [ "$(uname)" = "Darwin" ]; then echo "ios"; else echo "android"; fi
}
PLAT=$(detect_platform)

# ── Platform-specific vars ─────────────────────────────────────────
if [ "$PLAT" = "ios" ]; then
  BUNDLE_ID="io.metamask.MetaMask"
  SIM_TARGET="${SIM_UDID:-${IOS_SIMULATOR:-booted}}"
else
  PACKAGE_ID="io.metamask"
  # Auto-resolve device serial: use first connected USB device, or first device
  ADB_TARGET=$(adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}' || true)
  ADB_CMD="adb"
  [ -n "$ADB_TARGET" ] && ADB_CMD="adb -s $ADB_TARGET"
fi

# ── Colors & helpers ─────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; exit 1; }

# ── Early fixture validation (fail fast before long pipeline) ────────
if $DO_WALLET_SETUP; then
  if [ ! -f "$WALLET_FIXTURE" ]; then
    echo -e "${RED}ERROR:${NC} Wallet fixture not found: $WALLET_FIXTURE"
    echo -e "  Copy the example and fill in your values:"
    echo -e "  ${DIM}cp scripts/perps/agentic/wallet-fixture.example.json .agent/wallet-fixture.json${NC}"
    exit 1
  fi
  if ! jq empty "$WALLET_FIXTURE" 2>/dev/null; then
    echo -e "${RED}ERROR:${NC} Invalid JSON in $WALLET_FIXTURE"
    exit 1
  fi
  FIX_PW=$(jq -r '.password // empty' "$WALLET_FIXTURE")
  if [ -z "$FIX_PW" ]; then
    echo -e "${RED}ERROR:${NC} Fixture missing 'password' field: $WALLET_FIXTURE"
    exit 1
  fi
  FIX_ACCT_COUNT=$(jq -r '.accounts | length // 0' "$WALLET_FIXTURE" 2>/dev/null || echo 0)
  for i in $(seq 0 $((FIX_ACCT_COUNT - 1))); do
    FIX_TYPE=$(jq -r ".accounts[$i].type // empty" "$WALLET_FIXTURE")
    FIX_VAL=$(jq -r ".accounts[$i].value // empty" "$WALLET_FIXTURE")
    if [ -z "$FIX_TYPE" ] || { [ "$FIX_TYPE" != "mnemonic" ] && [ "$FIX_TYPE" != "privateKey" ]; }; then
      echo -e "${RED}ERROR:${NC} accounts[$i].type must be 'mnemonic' or 'privateKey' (got '${FIX_TYPE:-empty}')"
      echo -e "  See: scripts/perps/agentic/wallet-fixture.example.json"
      exit 1
    fi
    if [ -z "$FIX_VAL" ]; then
      echo -e "${RED}ERROR:${NC} accounts[$i].value is empty"
      exit 1
    fi
  done
  ok "Fixture validated: $WALLET_FIXTURE (password + ${FIX_ACCT_COUNT} accounts)"
fi

# Timing
PREFLIGHT_START=$(python3 -c "import time; print(int(time.time()))")
STEP_START=$PREFLIGHT_START
STEP_TIMES=""

elapsed_since() { echo $(( $(python3 -c "import time; print(int(time.time()))") - $1 )); }

# Compute total steps based on flags
TOTAL_STEPS=4  # device + app + metro + cdp
$DO_CLEAN && TOTAL_STEPS=$((TOTAL_STEPS + 1))
($DO_WALLET_SETUP || [ -n "$WALLET_PW" ]) && TOTAL_STEPS=$((TOTAL_STEPS + 1))
CURRENT_STEP=0
CURRENT_STEP_NAME=""

step() {
  if [ -n "$CURRENT_STEP_NAME" ]; then
    STEP_ELAPSED=$(elapsed_since $STEP_START)
    STEP_TIMES="${STEP_TIMES}  ${CURRENT_STEP_NAME}: ${STEP_ELAPSED}s\n"
  fi
  STEP_START=$(python3 -c "import time; print(int(time.time()))")
  CURRENT_STEP=$((CURRENT_STEP + 1))
  CURRENT_STEP_NAME="$1"
  echo ""
  echo -e "${BLUE}${BOLD}[$CURRENT_STEP/$TOTAL_STEPS]${NC} ${BOLD}$1${NC}"
  if [ -n "${2:-}" ]; then
    echo -e "  ${DIM}$2${NC}"
  fi
}

# ── Header ───────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}=== MetaMask Mobile Preflight ===${NC}"
echo -e "  Port: $PORT | Platform: $PLAT"
if $DO_CLEAN; then
  echo -e "  Mode: ${YELLOW}clean${NC} (yarn setup → build → Metro → CDP → wallet)"
elif $DO_REBUILD; then
  echo -e "  Mode: ${YELLOW}rebuild${NC} (build → Metro → CDP)"
elif $CHECK_ONLY; then
  echo -e "  Mode: check-only"
else
  echo -e "  Mode: default (Metro → CDP)"
fi

# ── Step: yarn setup (clean only) ────────────────────────────────────
if $DO_CLEAN; then
  if [ "$PLAT" = "ios" ]; then
    step "Installing dependencies" "rm ios/build → yarn setup (install deps + patches + pods)"
    echo "  Cleaning iOS build artifacts..."
    rm -rf ios/build
  else
    step "Installing dependencies" "clean android build → yarn setup (install deps + patches)"
    echo "  Cleaning Android build artifacts..."
    rm -rf android/app/build
  fi
  yarn setup 2>&1 | tail -3
  ok "yarn setup complete"
fi

# ══════════════════════════════════════════════════════════════════════
# ── iOS Steps ────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════
if [ "$PLAT" = "ios" ]; then

  # ── Step: Simulator ──────────────────────────────────────────────
  # Require IOS_SIMULATOR or SIM_UDID from .js.env — never guess which simulator to use.
  SIM_LABEL="${IOS_SIMULATOR:-${SIM_UDID:-}}"
  if [ -z "$SIM_LABEL" ]; then
    fail "Neither IOS_SIMULATOR nor SIM_UDID is set in .js.env — add one to identify your simulator"
  fi
  step "Checking simulator" "Looking for $SIM_LABEL"
  BOOTED=$(xcrun simctl list devices | grep "$SIM_LABEL" | grep "Booted" || true)
  if [ -z "$BOOTED" ]; then
    $CHECK_ONLY && fail "Simulator $SIM_LABEL is not booted"
    echo "  Booting $SIM_LABEL..."
    xcrun simctl boot "$SIM_TARGET" 2>/dev/null || true
    sleep 3
    # Verify it actually booted
    BOOTED=$(xcrun simctl list devices | grep "$SIM_LABEL" | grep "Booted" || true)
    if [ -z "$BOOTED" ]; then
      fail "Failed to boot simulator $SIM_LABEL"
    fi
    ok "Simulator booted: $SIM_LABEL"
  else
    ok "Simulator already booted: $SIM_LABEL"
  fi

  # ── Step: App build / install ────────────────────────────────────
  step "Checking app" "Looking for $BUNDLE_ID on simulator"
  APP_INSTALLED=$(xcrun simctl listapps "$SIM_TARGET" 2>/dev/null | grep -c "$BUNDLE_ID" || true)
  if [ "$APP_INSTALLED" -eq 0 ] || $DO_REBUILD; then
    $CHECK_ONLY && fail "App not installed (run with --rebuild)"
    echo ""
    echo -e "  ${YELLOW}Building + installing app${NC}"
    echo -e "  ${DIM}expo run:ios --no-bundler${NC}"
    echo ""

    echo "  Running pod install via bundler..."
    (cd ios && bundle exec pod install --repo-update --ansi 2>&1 | tail -3) || warn "pod install had issues"

    EXPO_CMD="yarn expo run:ios --no-install --no-bundler --port $PORT --configuration Debug --scheme MetaMask"
    [ -n "${IOS_SIMULATOR:-}" ] && EXPO_CMD="$EXPO_CMD --device $IOS_SIMULATOR"

    set +e
    eval "$EXPO_CMD" 2>&1 | while IFS= read -r line; do
      case "$line" in
        *"Build Succeeded"*) echo -e "  ${GREEN}→${NC} $line" ;;
        *"error:"*)          echo -e "  ${RED}→${NC} $line" ;;
        *"failed"*)          echo -e "  ${RED}→${NC} $line" ;;
        *"Something went wrong"*) echo -e "  ${RED}→${NC} $line" ;;
      esac
    done
    set -e

    APP_PATH=$(find "$HOME/Library/Developer/Xcode/DerivedData" -path "*/MetaMask-*/Build/Products/Debug-iphonesimulator/MetaMask.app" -maxdepth 5 2>/dev/null | head -1)
    if [ -z "$APP_PATH" ]; then
      fail "Build artifact not found in DerivedData"
    fi

    if $DO_CLEAN || $DO_WALLET_SETUP; then
      echo "  Wiping app data (uninstall + reinstall)..."
      xcrun simctl uninstall "$SIM_TARGET" "$BUNDLE_ID" 2>/dev/null || true
    fi

    echo "  Installing app on simulator..."
    xcrun simctl install "$SIM_TARGET" "$APP_PATH"

    APP_NOW=$(xcrun simctl listapps "$SIM_TARGET" 2>/dev/null | grep -c "$BUNDLE_ID" || true)
    if [ "$APP_NOW" -eq 0 ]; then
      fail "simctl install succeeded but app not found"
    fi
    ok "App built and installed"
  else
    ok "App already installed"
  fi

# ══════════════════════════════════════════════════════════════════════
# ── Android Steps ────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════
else

  # ── Step: Emulator / device ──────────────────────────────────────
  step "Checking device" "Looking for an Android emulator or device"
  # Verify device is actually reachable (not just listed — adb can show stale entries)
  DEVICE_ONLINE=0
  if [ -n "$ADB_TARGET" ] && $ADB_CMD shell echo ok >/dev/null 2>&1; then
    DEVICE_ONLINE=1
  fi
  if [ "$DEVICE_ONLINE" -eq 0 ]; then
    $CHECK_ONLY && fail "No Android device/emulator connected"
    if [ -n "${ANDROID_DEVICE:-}" ]; then
      echo "  Launching emulator: $ANDROID_DEVICE..."
      emulator -avd "$ANDROID_DEVICE" -no-snapshot-load -no-audio -no-window &
      # Wait for device to come online
      for i in $(seq 1 60); do
        if $ADB_CMD devices 2>/dev/null | grep -qw "device"; then break; fi
        sleep 2
        [ "$i" -eq 60 ] && fail "Emulator did not come online after 120s"
      done
      # Wait for boot to complete
      for i in $(seq 1 30); do
        BOOT=$($ADB_CMD shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
        [ "$BOOT" = "1" ] && break
        sleep 2
      done
      # Re-resolve now that emulator is up
      ADB_TARGET=$(adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}' || true)
      ADB_CMD="adb -s $ADB_TARGET"
      ok "Emulator booted: $ANDROID_DEVICE"
    else
      fail "No device connected and ANDROID_DEVICE not set in .js.env"
    fi
  else
    DEVICE_NAME=$($ADB_CMD devices -l 2>/dev/null | grep "device " | head -1 | sed 's/.*model:\([^ ]*\).*/\1/' || echo "unknown")
    ok "Device connected: $DEVICE_NAME"
  fi

  # Set up adb reverse so device can reach Metro on host
  $ADB_CMD reverse tcp:$PORT tcp:$PORT 2>/dev/null || warn "adb reverse failed — device may not reach Metro"
  ok "adb reverse tcp:$PORT → host"

  # ── Step: App build / install ────────────────────────────────────
  step "Checking app" "Looking for $PACKAGE_ID on device"
  APP_INSTALLED=$($ADB_CMD shell pm list packages 2>/dev/null | grep -c "$PACKAGE_ID" || true)
  if [ "$APP_INSTALLED" -eq 0 ] || $DO_REBUILD; then
    $CHECK_ONLY && fail "App not installed (run with --rebuild)"

    # Uninstall first for a clean slate (avoids stale data / vault)
    if ($DO_CLEAN || $DO_WALLET_SETUP) && [ "$APP_INSTALLED" -gt 0 ]; then
      echo "  Uninstalling previous app..."
      $ADB_CMD uninstall "$PACKAGE_ID" 2>/dev/null || true
    fi

    echo ""
    echo -e "  ${YELLOW}Building + installing app${NC}"
    echo -e "  ${DIM}gradle assembleProdDebug (arm64-v8a only for speed)${NC}"
    echo ""

    # Prebuild: copy assets required by the Android build
    yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/. 2>/dev/null || true
    yes | cp -rf ./app/fonts/Metamask.ttf ./android/app/src/main/assets/fonts/Metamask.ttf 2>/dev/null || true
    if [ -n "${GOOGLE_SERVICES_B64_ANDROID:-}" ]; then
      echo -n "$GOOGLE_SERVICES_B64_ANDROID" | base64 -d > ./android/app/google-services.json
    fi

    BUILD_LOG=".agent/android-build.log"
    set +e
    (cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew app:assembleProdDebug -PreactNativeArchitectures=arm64-v8a) 2>&1 | tee "$BUILD_LOG" | while IFS= read -r line; do
      case "$line" in
        *"BUILD SUCCESSFUL"*) echo -e "  ${GREEN}→${NC} $line" ;;
        *"BUILD FAILED"*)     echo -e "  ${RED}→${NC} $line" ;;
        *"error:"*)           echo -e "  ${RED}→${NC} $line" ;;
        *"FAILURE"*)          echo -e "  ${RED}→${NC} $line" ;;
      esac
    done
    set -e

    # Find the APK and install via adb
    APK_PATH=$(find android/app/build/outputs/apk -name "*.apk" -path "*/debug/*" 2>/dev/null | head -1)
    if [ -z "$APK_PATH" ]; then
      fail "Build did not produce an APK — check $BUILD_LOG"
    fi
    echo "  Installing $APK_PATH..."
    $ADB_CMD install -r "$APK_PATH" 2>/dev/null || fail "APK install failed"

    # Verify app is installed
    if ! $ADB_CMD shell pm list packages 2>/dev/null | grep -q "$PACKAGE_ID"; then
      fail "Build completed but app not found on device"
    fi
    ok "App built and installed"
  else
    ok "App already installed"
  fi
fi

# ══════════════════════════════════════════════════════════════════════
# ── Shared steps (both platforms) ────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════

# ── Step: Metro ─────────────────────────────────────────────────────
step "Starting Metro" "Bundler on port $PORT → logs at $LOGFILE"
bash "$SCRIPTS/start-metro.sh" --platform "$PLAT" $($DO_LAUNCH && echo "--launch" || echo "")
ok "Metro running on port $PORT"

# ── Launch app if not already running ─────────────────────────────
if $DO_LAUNCH; then
  if [ "$PLAT" = "ios" ]; then
    echo "  Launching $BUNDLE_ID on $SIM_TARGET..."
    xcrun simctl launch "$SIM_TARGET" "$BUNDLE_ID" 2>/dev/null || warn "simctl launch returned non-zero (app may already be running)"
  else
    echo "  Launching $PACKAGE_ID on device..."
    $ADB_CMD shell am start -n "$PACKAGE_ID/.MainActivity" 2>/dev/null || warn "am start returned non-zero"
  fi
  sleep 3
  ok "App launched"
fi

# ── Step: CDP ───────────────────────────────────────────────────────
step "Connecting CDP" "Waiting for app to expose debug target"
while [ $CDP_RETRY -lt $CDP_TIMEOUT ]; do
  if node "$SCRIPTS/cdp-bridge.js" status 2>/dev/null | grep -q '"route"' 2>/dev/null; then
    ok "CDP connected"
    break
  fi
  sleep 1
  CDP_RETRY=$((CDP_RETRY + 1))
  [ $CDP_RETRY -eq 5 ] && echo -e "  ${DIM}Still waiting... app may still be loading JS bundle${NC}"
  [ $CDP_RETRY -eq 15 ] && echo -e "  ${DIM}Taking longer than usual — check device${NC}"
done
[ $CDP_RETRY -ge $CDP_TIMEOUT ] && fail "CDP did not become available after ${CDP_TIMEOUT}s"

# Verify CDP is connected to the right platform
CDP_PLATFORM=$(node "$SCRIPTS/cdp-bridge.js" status 2>/dev/null | jq -r '.platform // empty' || true)
if [ -n "$CDP_PLATFORM" ] && [ "$CDP_PLATFORM" != "$PLAT" ]; then
  fail "CDP connected to $CDP_PLATFORM app but expected $PLAT — launch the $PLAT app first"
fi

# Brief stabilization
sleep 2

# ── Step: Wallet ────────────────────────────────────────────────────
if $DO_WALLET_SETUP; then
  step "Setting up wallet" "Configuring from $WALLET_FIXTURE"
  FIXTURE_FLAG=""
  [ "$WALLET_FIXTURE" != ".agent/wallet-fixture.json" ] && FIXTURE_FLAG="--fixture $WALLET_FIXTURE"
  if [ -f "$WALLET_FIXTURE" ] || [ -n "$FIXTURE_FLAG" ]; then
    bash "$SCRIPTS/setup-wallet.sh" $FIXTURE_FLAG && ok "Wallet configured" || warn "Wallet setup failed — check fixture file"
  else
    warn "No fixture at $WALLET_FIXTURE"
    echo -e "  ${DIM}cp scripts/perps/agentic/wallet-fixture.example.json .agent/wallet-fixture.json${NC}"
  fi
elif [ -n "$WALLET_PW" ]; then
  step "Unlocking wallet" "Using provided password"
  node "$SCRIPTS/cdp-bridge.js" unlock "$WALLET_PW" 2>/dev/null && ok "Wallet unlocked" || warn "Could not unlock wallet"
fi

# ── Done ─────────────────────────────────────────────────────────────
if [ -n "$CURRENT_STEP_NAME" ]; then
  STEP_ELAPSED=$(elapsed_since $STEP_START)
  STEP_TIMES="${STEP_TIMES}  ${CURRENT_STEP_NAME}: ${STEP_ELAPSED}s\n"
fi
TOTAL_ELAPSED=$(elapsed_since $PREFLIGHT_START)

echo ""
echo -e "${GREEN}${BOLD}=== Preflight complete ===${NC} ${DIM}(${TOTAL_ELAPSED}s total)${NC}"
echo ""
echo -e "  Platform ${DIM}$PLAT${NC}"
echo -e "  Metro    ${DIM}http://localhost:$PORT/status${NC}"
echo -e "  Logs     ${DIM}tail -f $LOGFILE${NC}"
echo -e "  CDP      ${DIM}node $SCRIPTS/cdp-bridge.js status${NC}"
echo ""
echo -e "${DIM}Timing:${NC}"
echo -e "$STEP_TIMES"
