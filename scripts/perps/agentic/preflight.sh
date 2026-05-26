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
ROOT_DIR="$(pwd)"
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

resolve_path() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *) printf '%s/%s\n' "$ROOT_DIR" "$1" ;;
  esac
}

PORT="${WATCHER_PORT:-8081}"
SCRIPTS="scripts/perps/agentic"
LOGFILE="$(resolve_path '.agent/metro.log')"
LOG_DIR="$(resolve_path "${PREP_LOG_DIR:-.agent/preflight-logs}")"
DEPS_LOG="${LOG_DIR}/deps.log"
POD_INSTALL_LOG="${LOG_DIR}/pod-install.log"
CDP_LOG="${LOG_DIR}/cdp.log"
WALLET_LOG="${LOG_DIR}/wallet-setup.log"
CDP_WAIT_TIMEOUT=90
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
MODE=""   # auto | fast | rebuild-native | clean — resolved below
MODE_EXPLICIT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)       FORCE_PLATFORM="$2"; shift 2 ;;
    --mode)           MODE="$2"; MODE_EXPLICIT=true; shift 2 ;;
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

# ── Resolve --mode → existing flag state ─────────────────────────────
# If --mode not given, fall back to legacy flag mapping for back-compat.
if ! $MODE_EXPLICIT; then
  if $DO_CLEAN; then
    MODE="clean"
  elif $DO_REBUILD; then
    MODE="rebuild-native"
  else
    MODE="default"  # legacy: skip build if app installed, otherwise build
  fi
fi
case "$MODE" in
  auto)
    DO_CLEAN=false; DO_REBUILD=false
    ;;
  fast)
    DO_CLEAN=false; DO_REBUILD=false
    ;;
  rebuild-native)
    DO_CLEAN=false; DO_REBUILD=true
    ;;
  clean)
    DO_CLEAN=true; DO_REBUILD=true
    ;;
  default)
    : # keep parsed flag state
    ;;
  *)
    echo "ERROR: unknown --mode '$MODE' (expected: auto|fast|rebuild-native|clean)" >&2
    exit 2
    ;;
esac

# Source the build-cache helpers (no-op if file missing — fall back to legacy).
BUILD_CACHE_LIB="$(dirname "$0")/lib/build-cache.sh"
if [ -f "$BUILD_CACHE_LIB" ]; then
  # shellcheck disable=SC1090
  . "$BUILD_CACHE_LIB"
  BUILD_CACHE_ENABLED=true
  # Allocate private mktemp memo dir, exported so $(bc_fingerprint) subshells
  # inherit it. No EXIT trap here — lock helpers need EXIT; dir is OS-reaped.
  bc_fingerprint_reset_memo
else
  BUILD_CACHE_ENABLED=false
fi

# ── Pod staleness detection ────────────────────────────────────────
# Hash yarn.lock + ios/Podfile to detect when Pods/Podfile.lock are stale.
# Each worktree stores its own marker so independent clones don't collide.
PODS_MARKER_DIR=".agent/build-cache/ios"
PODS_MARKER_FILE="$PODS_MARKER_DIR/pods-inputs.sha256"

pods_input_hash() {
  # yarn.lock drives which podspecs land in node_modules; Podfile controls
  # which pods are requested. Together they determine the expected pod state.
  { cat yarn.lock ios/Podfile 2>/dev/null || true; } | shasum -a 256 | cut -d' ' -f1
}

pods_are_stale() {
  [ ! -f ios/Podfile.lock ] && return 1  # no lock = nothing to be stale
  local current saved
  current=$(pods_input_hash)
  if [ -f "$PODS_MARKER_FILE" ]; then
    saved=$(cat "$PODS_MARKER_FILE")
    [ "$current" != "$saved" ]
  else
    return 0  # no marker = never validated, treat as stale
  fi
}

pods_save_marker() {
  mkdir -p "$PODS_MARKER_DIR"
  pods_input_hash > "$PODS_MARKER_FILE"
}

pods_clean_stale() {
  if pods_are_stale; then
    echo "  Pods inputs changed (yarn.lock / Podfile) — cleaning stale pod state..."
    rm -rf ios/Pods ios/Podfile.lock
    return 0
  fi
  return 1
}

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
stage_log() { echo -e "  ${DIM}Log: $1${NC}"; }

# Kill a process and all its descendants.
# We need this because `$!` after `eval "$EXPO_CMD" &` points at the yarn
# corepack wrapper, not the deep child (yarn → corepack → yarn.cjs → node
# expo/cli) that actually binds $PORT. Killing just the wrapper leaves the
# child alive and still holding the port. Scoped strictly to descendants of
# the given PID — safe for parallel worktrees.
collect_tree() {
  local parent=$1
  local children
  children=$(pgrep -P "$parent" 2>/dev/null || true)
  for child in $children; do
    collect_tree "$child"
  done
  echo "$parent"
}
kill_tree() {
  local pids
  pids=$(collect_tree "$1")
  for p in $pids; do kill -TERM "$p" 2>/dev/null || true; done
  local t=0
  while [ $t -lt 20 ]; do
    local alive=0
    for p in $pids; do kill -0 "$p" 2>/dev/null && alive=1; done
    [ $alive -eq 0 ] && return
    sleep 0.1
    t=$((t + 1))
  done
  for p in $pids; do kill -KILL "$p" 2>/dev/null || true; done
}

# Live tail: refresh the last N lines of a log file in-place while a PID is
# running. TTY-gated so piped runs / CI see no ANSI escapes. Called as a
# background job; kill it once the watched process has exited.
#
# Frame invariant: always owns exactly N terminal rows. Reserves the frame
# up-front, then every tick does the same symmetric cursor-up-N → redraw.
# Truncates each line strictly below terminal width to prevent wrap (a
# wrapped row would break the cursor-up anchor and cause accumulating scroll).
watch_log() {
  local log="$1" watcher_of="$2" N="${3:-3}"
  [ -t 1 ] || return 0
  local cols width i cleanup_done=0
  cols=$(tput cols 2>/dev/null || echo 120)
  width=$((cols - 6))
  [ "$width" -lt 20 ] && width=20

  watch_log_cleanup() {
    [ "$cleanup_done" -eq 1 ] && return
    cleanup_done=1
    printf '\033[%dA\033[J' "$N" 2>/dev/null || true
    tput cnorm 2>/dev/null || true
  }

  # Reserve N rows once; every subsequent tick starts with cursor-up N.
  i=0
  while [ $i -lt $N ]; do printf '\n'; i=$((i + 1)); done
  # Hide cursor during tail to avoid blink/drift artifacts.
  tput civis 2>/dev/null || true
  trap 'watch_log_cleanup' EXIT
  trap 'watch_log_cleanup; exit 0' TERM INT

  while kill -0 "$watcher_of" 2>/dev/null; do
    # Move cursor up N rows and clear from cursor to end of screen.
    printf '\033[%dA\033[J' "$N"
    if [ -f "$log" ]; then
      local lines padded
      lines=$(tail -n "$N" "$log" 2>/dev/null \
        | tr -d '\r' \
        | sed -E $'s/\x1b\\[[0-9;]*[A-Za-z]//g; s/\t/  /g' \
        | awk -v w="$width" '{ if (length($0) > w) print substr($0, 1, w); else print }')
      i=0
      if [ -n "$lines" ]; then
        while IFS= read -r l; do
          printf '    \033[2m%s\033[0m\n' "$l"
          i=$((i + 1))
        done <<< "$lines"
      fi
      # Pad to exactly N rows so the frame size never shrinks.
      while [ $i -lt $N ]; do printf '\n'; i=$((i + 1)); done
    else
      i=0
      while [ $i -lt $N ]; do printf '\n'; i=$((i + 1)); done
    fi
    sleep 0.75
  done

  # Final clear: leave N blank rows behind so the caller can print its status.
  watch_log_cleanup
  trap - EXIT TERM INT
}

# Run a command in the background while tailing its log file live. Returns
# the command's exit status. Usage: run_with_live_log "$LOG" "$CMD_STRING"
run_with_live_log() {
  local log="$1" cmd="$2"
  bash -c "$cmd" >>"$log" 2>&1 &
  local cmd_pid=$!
  watch_log "$log" "$cmd_pid" 3 &
  local watch_pid=$!
  local rc=0
  wait "$cmd_pid" || rc=$?
  kill "$watch_pid" 2>/dev/null || true
  wait "$watch_pid" 2>/dev/null || true
  return $rc
}

js_dependencies_need_install() {
  # Worktrees often survive branch switches. If package.json / yarn.lock are
  # newer than Yarn's node_modules state, or if a required workspace binary is
  # missing, reconcile node_modules before invoking Expo. This preserves the
  # normal `yarn expo ...` path while fixing stale installs at the source.
  [ ! -d node_modules ] && return 0
  [ ! -f node_modules/.yarn-state.yml ] && return 0
  [ -f package.json ] && [ package.json -nt node_modules/.yarn-state.yml ] && return 0
  [ -f yarn.lock ] && [ yarn.lock -nt node_modules/.yarn-state.yml ] && return 0
  yarn bin expo >/dev/null 2>&1 || return 0
  return 1
}

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

mkdir -p "$LOG_DIR"

JS_DEPS_STALE=false
if ! $DO_CLEAN && js_dependencies_need_install; then
  if $CHECK_ONLY; then
    fail "JS dependencies are stale or missing required bins (run without --check-only to reconcile node_modules)"
  fi
  JS_DEPS_STALE=true
fi

# Timing
PREFLIGHT_START=$(python3 -c "import time; print(int(time.time()))")
STEP_START=$PREFLIGHT_START
STEP_TIMES=""

elapsed_since() { echo $(( $(python3 -c "import time; print(int(time.time()))") - $1 )); }

# Compute total steps based on flags
TOTAL_STEPS=4  # device + app + metro + cdp
$DO_CLEAN && TOTAL_STEPS=$((TOTAL_STEPS + 1))
$JS_DEPS_STALE && TOTAL_STEPS=$((TOTAL_STEPS + 1))
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
case "$MODE" in
  auto)           echo -e "  Mode: ${BLUE}auto${NC} (fingerprint-gated reuse, build only if needed)" ;;
  fast)           echo -e "  Mode: ${BLUE}fast${NC} (no build — fail loud if app missing)" ;;
  rebuild-native) echo -e "  Mode: ${YELLOW}rebuild-native${NC} (skip yarn setup, force native rebuild)" ;;
  clean)          echo -e "  Mode: ${YELLOW}clean${NC} (yarn setup → pod --repo-update → build)" ;;
  default)        $CHECK_ONLY \
                    && echo -e "  Mode: check-only" \
                    || echo -e "  Mode: default (fingerprint-gated reuse; falls back to native build on cache miss, no fail-loud)" ;;
esac

# ── Zombie sweep (silent when clean) ─────────────────────────────────
# Detect and clean up orphaned expo/metro processes from previous crashed runs.
# These leave a port bound (usually $PORT or the expo default 8081), and any app
# launched afterwards may register its Hermes inspector on the wrong port — which
# breaks CDP discovery and looks like an unrelated bug.
# Scope: only kill processes we can identify as expo/metro/react-native. Anything
# else on the port is foreign and we fail loudly with the holder's command.
sweep_port() {
  local port=$1
  local label=$2
  local holder_pid
  holder_pid=$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
  [ -z "$holder_pid" ] && return 0

  # Probe /status first — if Metro responds, it's alive and reusable regardless of process name
  if curl -sf "http://localhost:$port/status" >/dev/null 2>&1; then
    ok "Port $port ($label) — Metro already running (PID $holder_pid), reusing"
    # start-metro.sh will detect running Metro and only launch the app
    return 0
  fi

  local holder_cmd
  holder_cmd=$(ps -p "$holder_pid" -o command= 2>/dev/null || echo unknown)

  if echo "$holder_cmd" | grep -qE 'expo (run|start)|react-native|metro'; then
    if $CHECK_ONLY; then
      fail "Port $port ($label) held by stale $holder_cmd (PID $holder_pid) — run without --check-only to sweep"
    fi
    warn "Port $port ($label) held by stale process (PID $holder_pid)"
    echo -e "  ${DIM}${holder_cmd:0:100}${NC}"
    kill_tree "$holder_pid"
    sleep 1
    if lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      fail "Failed to free port $port — manual cleanup required"
    fi
    ok "Port $port freed"
  else
    fail "Port $port ($label) held by foreign process (PID $holder_pid): ${holder_cmd:0:80}"
  fi
}

sweep_port "$PORT" "worktree Metro"
# expo CLI's hardcoded default — any prior run without --port leaks here.
[ "$PORT" != "8081" ] && sweep_port 8081 "expo default"

# ── Step: reconcile stale node_modules (default/auto/fast modes) ──────
if $JS_DEPS_STALE; then
  step "Reconciling JS dependencies" "yarn install --immutable (package/yarn state changed or expo bin missing)"
  stage_log "$DEPS_LOG"
  printf '%s\n' '$ yarn install --immutable' > "$DEPS_LOG"
  if ! run_with_live_log "$DEPS_LOG" "yarn install --immutable"; then
    echo ""
    echo -e "  ${RED}Dependency reconciliation failed — see $DEPS_LOG${NC}"
    tail -20 "$DEPS_LOG" | sed 's/^/    /'
    fail "yarn install --immutable failed"
  fi
  ok "node_modules reconciled"
fi

# ── Step: yarn setup (clean only) ────────────────────────────────────
# --check-only is read-only by contract; refuse a destructive yarn setup
# combo loudly instead of running it briefly and then early-exiting.
if $DO_CLEAN && $CHECK_ONLY; then
  fail "--check-only conflicts with --clean / --mode clean (would mutate node_modules + build artifacts)"
fi
if $DO_CLEAN; then
  if [ "$PLAT" = "ios" ]; then
    step "Installing dependencies" "rm ios/build → yarn setup (install deps + patches + pods)"
    echo "  Cleaning iOS build artifacts..."
    rm -rf ios/build
    # Always clean stale pod state in --clean mode to prevent version mismatches
    # between Podfile.lock and podspecs that changed in node_modules.
    pods_clean_stale || {
      echo "  Pods inputs unchanged — cleaning anyway (--clean mode)..."
      rm -rf ios/Pods ios/Podfile.lock
    }
  else
    step "Installing dependencies" "clean android build → yarn setup (install deps + patches)"
    echo "  Cleaning Android build artifacts..."
    rm -rf android/app/build
  fi
  stage_log "$DEPS_LOG"
  printf '$ yarn setup\n' > "$DEPS_LOG"
  if ! run_with_live_log "$DEPS_LOG" "yarn setup"; then
    echo ""
    echo -e "  ${RED}Dependencies failed — see $DEPS_LOG${NC}"
    tail -20 "$DEPS_LOG" | sed 's/^/    /'
    fail "yarn setup failed"
  fi
  if [ "$PLAT" = "ios" ]; then
    pods_save_marker
  fi
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
    # Open Simulator.app first so the daemon binds a UI window when the device boots.
    open -a Simulator 2>/dev/null || true
    xcrun simctl boot "$SIM_TARGET" 2>/dev/null || true
    # Cold boot transitions Shutdown -> Booting -> Booted; poll up to 60s.
    BOOTED=""
    for _ in $(seq 1 60); do
      BOOTED=$(xcrun simctl list devices | grep "$SIM_LABEL" | grep "Booted" || true)
      [ -n "$BOOTED" ] && break
      sleep 1
    done
    if [ -z "$BOOTED" ]; then
      fail "Failed to boot simulator $SIM_LABEL within 60s"
    fi
    ok "Simulator booted: $SIM_LABEL"
  else
    ok "Simulator already booted: $SIM_LABEL"
  fi

  # ── Step: App build / install ────────────────────────────────────
  step "Checking app" "Looking for $BUNDLE_ID on simulator"
  APP_INSTALLED=$(xcrun simctl listapps "$SIM_TARGET" 2>/dev/null | grep -c "$BUNDLE_ID" || true)
  BC_LOCK_HELD=false  # set to true once we own the per-fingerprint build lock

  # Cache validation runs in every mode except `clean` / `rebuild-native`,
  # which intentionally bypass the cache. This is a deliberate behaviour
  # change vs origin/main: default mode now opts into fingerprint-gated reuse.
  if $BUILD_CACHE_ENABLED && [ "$MODE" != "clean" ] && [ "$MODE" != "rebuild-native" ]; then
    FP=$(bc_fingerprint 2>/dev/null || true)
    if [ -n "$FP" ]; then
      INSTALLED_FP=$(bc_installed_fp ios)
      INSTALLED_TGT=$(bc_installed_target ios)
      if [ "$APP_INSTALLED" -gt 0 ] \
         && [ "$INSTALLED_FP" = "$FP" ] \
         && [ "$INSTALLED_TGT" = "$SIM_TARGET" ] \
         && ! $DO_REBUILD; then
        ok "Cache: installed app matches fingerprint ${FP:0:12} on $SIM_TARGET — no native action needed"
        CHECK_ONLY_FP_VERIFIED=true
        CHECK_ONLY_FP_VALUE="$FP"
      else
        if bc_lock_acquire ios "$FP"; then
          BC_LOCK_HELD=true
          trap 'bc_lock_release' EXIT
          if bc_has_artifact ios "$FP"; then
            if $CHECK_ONLY; then
              bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
              fail "App not at fingerprint ${FP:0:12} on $SIM_TARGET — cache hit available, but --check-only forbids install"
            fi
            echo -e "  ${GREEN}Cache hit:${NC} fp=${FP:0:12} — installing from shared cache"
            IOS_ARTIFACT=$(bc_artifact_path ios "$FP")
            # `simctl install` overwrites the .app bundle in place; it keeps
            # the existing container data (wallet/app state), so no preemptive
            # uninstall is needed on the happy path. If install fails we
            # explicitly reset APP_INSTALLED to force the build branch.
            if xcrun simctl install "$SIM_TARGET" "$IOS_ARTIFACT"; then
              bc_record_install ios "$FP" "$SIM_TARGET"
              APP_INSTALLED=1
              ok "Installed from cache: $IOS_ARTIFACT"
            else
              APP_INSTALLED=0
              if [ "$MODE" = "fast" ]; then
                bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
                fail "Mode 'fast': cached artifact install failed for fp ${FP:0:12}"
              fi
              warn "Cache install failed — falling through to native build"
            fi
          elif [ "$MODE" = "fast" ]; then
            bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
            fail "Mode 'fast' but no cached build for fp ${FP:0:12} and app not installed at this fingerprint on $SIM_TARGET"
          else
            # Cache miss in auto/default mode. Whatever is installed (if anything)
            # is at the wrong fingerprint; force the build gate to fire so we
            # produce + install a fresh artifact instead of running a stale app.
            APP_INSTALLED=0
          fi
          # Lock stays held through native build; post-build store releases it.
        else
          if [ "$MODE" = "fast" ]; then
            fail "Mode 'fast': could not acquire build-cache lock for fp ${FP:0:12}"
          fi
          warn "Could not acquire build-cache lock for fp ${FP:0:12} — proceeding without lock"
          APP_INSTALLED=0  # unknown cache state — treat installed app as untrusted
        fi
      fi
    else
      if [ "$MODE" = "fast" ]; then
        fail "Mode 'fast': could not compute fingerprint — cannot validate cache availability"
      fi
      warn "Could not compute fingerprint — falling back to legacy build path"
    fi
  fi

  if [ "$APP_INSTALLED" -eq 0 ] || $DO_REBUILD; then
    $CHECK_ONLY && fail "App not installed (run with --rebuild)"
    echo ""
    echo -e "  ${YELLOW}Building + installing app${NC}"
    echo -e "  ${DIM}expo run:ios --port \$PORT (bundler killed after build, start-metro.sh takes over)${NC}"
    echo ""

    # Skip --repo-update unless --mode clean: it re-pulls every CocoaPods
    # spec (~3-5 min) on every dispatch. Plain `pod install` is sufficient
    # whenever Podfile.lock pods are already present in the local spec repo.
    #
    # Auto-clean stale Pods before pod install in any mode. This prevents
    # version mismatches when yarn.lock changes bring new podspecs but
    # Podfile.lock still pins old versions (common across independent clones).
    if ! $DO_CLEAN; then
      pods_clean_stale && warn "Stale pod state auto-cleaned"
    fi
    if $DO_CLEAN; then
      POD_CMD="cd ios && bundle exec pod install --repo-update --ansi"
    else
      POD_CMD="cd ios && bundle exec pod install --ansi"
    fi
    echo "  Running pod install via bundler..."
    stage_log "$POD_INSTALL_LOG"
    printf '$ (%s)\n' "$POD_CMD" > "$POD_INSTALL_LOG"
    if run_with_live_log "$POD_INSTALL_LOG" "$POD_CMD"; then
      pods_save_marker
      ok "pod install complete"
    else
      # On non-clean modes, the failure may be a missing spec → retry once with --repo-update.
      if ! $DO_CLEAN; then
        warn "pod install failed — retrying with --repo-update"
        # Clean Pods before retry — the lock file may be the cause.
        rm -rf ios/Pods ios/Podfile.lock
        if run_with_live_log "$POD_INSTALL_LOG" "cd ios && bundle exec pod install --repo-update --ansi"; then
          pods_save_marker
          ok "pod install complete (after --repo-update retry)"
        else
          warn "pod install had issues — see $POD_INSTALL_LOG"
        fi
      else
        warn "pod install had issues — see $POD_INSTALL_LOG"
      fi
    fi

    # Must pass --port (never --no-bundler): @expo/cli rejects that combo
    # (resolveBundlerProps.js), and without --port expo's headless bundler silently
    # binds the hardcoded default 8081, which collides with other worktrees and
    # causes the installed app to register its Hermes inspector on 8081 instead of
    # the worktree's $PORT — breaking CDP discovery.
    EXPO_CMD="yarn expo run:ios --no-install --port $PORT --configuration Debug --scheme MetaMask"
    [ -n "${IOS_SIMULATOR:-}" ] && EXPO_CMD="$EXPO_CMD --device $IOS_SIMULATOR"

    # expo run:ios does not exit after a successful build — it keeps Metro running
    # and streams simulator logs indefinitely. We only need the .app artifact here:
    # start-metro.sh owns the Metro lifecycle in step [4/N]. Background expo, tee
    # output to a log, watch for the success marker, then tear down the whole expo
    # subprocess tree. We must walk the tree (yarn → corepack → yarn.cjs → node
    # expo/cli) because killing only $! leaves the deep child alive and orphaned,
    # still holding $PORT — which would defeat start-metro.sh and break CDP.
    BUILD_LOG="$(resolve_path '.agent/ios-expo-build.log')"
    mkdir -p "$(dirname "$BUILD_LOG")"
    : > "$BUILD_LOG"
    stage_log "$BUILD_LOG"
    BUILD_START=$(date +%s)

    set +e
    eval "$EXPO_CMD" >"$BUILD_LOG" 2>&1 &
    EXPO_PID=$!
    # Drop the bg job from bash's jobs table so kill_tree's SIGTERM doesn't print "Terminated: 15".
    disown "$EXPO_PID" 2>/dev/null || true

    watch_log "$BUILD_LOG" "$EXPO_PID" 3 &
    WATCH_PID=$!

    APP_PATH=""
    BUILD_TIMEOUT=900
    while :; do
      NOW=$(date +%s)
      ELAPSED=$((NOW - BUILD_START))
      if [ $ELAPSED -ge $BUILD_TIMEOUT ]; then
        kill "$WATCH_PID" 2>/dev/null || true; wait "$WATCH_PID" 2>/dev/null || true
        kill_tree "$EXPO_PID"
        wait $EXPO_PID 2>/dev/null || true
        echo ""
        echo -e "  ${RED}Build log tail:${NC}"
        tail -30 "$BUILD_LOG" | sed 's/^/    /'
        fail "Build timed out after ${BUILD_TIMEOUT}s — see $BUILD_LOG"
      fi

      # Look for a freshly-built .app (mtime >= build start) once xcodebuild reports success.
      # Check success BEFORE errors: the cumulative log may contain non-fatal warnings
      # matching "Something went wrong" early in the build that would false-positive if
      # we checked errors first.
      # Iterate all MetaMask-* dirs in DerivedData — multiple worktrees produce separate
      # dirs with different hashes, and `head -1` could pick a stale one that always fails
      # the mtime check, causing a 900s timeout despite a successful build.
      if grep -q '\*\* BUILD SUCCEEDED \*\*\|Build Succeeded' "$BUILD_LOG" 2>/dev/null; then
        while IFS= read -r CANDIDATE; do
          [ -d "$CANDIDATE" ] || continue
          APP_MTIME=$(stat -f %m "$CANDIDATE" 2>/dev/null || echo 0)
          if [ "$APP_MTIME" -ge "$BUILD_START" ]; then
            APP_PATH="$CANDIDATE"
            break
          fi
        done < <(find "$HOME/Library/Developer/Xcode/DerivedData" -path "*/MetaMask-*/Build/Products/Debug-iphonesimulator/MetaMask.app" -maxdepth 5 -prune 2>/dev/null)
        if [ -n "$APP_PATH" ]; then
          kill "$WATCH_PID" 2>/dev/null || true; wait "$WATCH_PID" 2>/dev/null || true
          echo -e "  ${GREEN}→${NC} Build Succeeded (${ELAPSED}s)"
          kill_tree "$EXPO_PID"
          wait $EXPO_PID 2>/dev/null || true
          break
        fi
      fi

      # Surface fatal CLI errors only after confirming build hasn't succeeded.
      if grep -qE 'CommandError:|BUILD FAILED' "$BUILD_LOG" 2>/dev/null; then
        kill "$WATCH_PID" 2>/dev/null || true; wait "$WATCH_PID" 2>/dev/null || true
        kill_tree "$EXPO_PID"
        wait $EXPO_PID 2>/dev/null || true
        echo ""
        echo -e "  ${RED}Build log tail:${NC}"
        tail -30 "$BUILD_LOG" | sed 's/^/    /'
        fail "Build failed — see $BUILD_LOG"
      fi

      # If expo exited on its own before we found a fresh .app, treat as failure.
      if ! kill -0 $EXPO_PID 2>/dev/null; then
        kill "$WATCH_PID" 2>/dev/null || true; wait "$WATCH_PID" 2>/dev/null || true
        echo ""
        echo -e "  ${RED}expo run:ios exited without producing a fresh .app${NC}"
        echo -e "  ${RED}Build log tail:${NC}"
        tail -30 "$BUILD_LOG" | sed 's/^/    /'
        fail "Build failed — see $BUILD_LOG"
      fi

      sleep 2
    done
    set -e

    # Wait for expo's Metro on $PORT to actually release the socket — kill_tree
    # already SIGKILLed any stragglers, but the kernel takes a moment to free the
    # port. start-metro.sh probes /status and would race an orphaned bundler.
    #
    # Exception: zombie sweep may have preserved a reused Metro on $PORT (healthy
    # /status). In that case the port is expected to stay bound and we accept it.
    for _ in $(seq 1 20); do
      lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
      if curl -sf --max-time 1 "http://localhost:$PORT/status" >/dev/null 2>&1; then
        ok "Port $PORT held by healthy Metro (reused) — continuing"
        break
      fi
      sleep 1
    done
    if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 \
       && ! curl -sf --max-time 1 "http://localhost:$PORT/status" >/dev/null 2>&1; then
      HOLDER=$(lsof -iTCP:"$PORT" -sTCP:LISTEN -Fc 2>/dev/null | grep '^c' | head -1)
      fail "Port $PORT still held after expo teardown ($HOLDER) — aborting to avoid CDP misrouting"
    fi

    if [ -z "$APP_PATH" ]; then
      fail "Build artifact not found in DerivedData — see $BUILD_LOG"
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

    # Publish to shared cache. If we hold the lock from the cache-decision
    # phase, store + release directly; else (clean/rebuild-native) bc_with_lock.
    if $BUILD_CACHE_ENABLED && [ -n "${APP_PATH:-}" ]; then
      FP=$(bc_fingerprint 2>/dev/null || true)
      if [ -n "$FP" ]; then
        if $BC_LOCK_HELD; then
          if bc_store_artifact ios "$FP" "$APP_PATH"; then
            ok "Stored build in shared cache: fp=${FP:0:12}"
            bc_record_install ios "$FP" "$SIM_TARGET"
            bc_prune ios "${BUILD_CACHE_RETAIN:-5}" 2>/dev/null || true
          else
            warn "Failed to store build in cache"
          fi
          bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
        else
          if bc_with_lock ios "$FP" bc_store_artifact ios "$FP" "$APP_PATH"; then
            ok "Stored build in shared cache: fp=${FP:0:12}"
            bc_record_install ios "$FP" "$SIM_TARGET"
            bc_prune ios "${BUILD_CACHE_RETAIN:-5}" 2>/dev/null || true
          else
            warn "Could not store build in cache (lock timeout?)"
          fi
        fi
      fi
    fi
  else
    if $BC_LOCK_HELD; then
      bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
    fi
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

  # Set up adb reverse so device can reach Metro on host.
  # Skipped in --check-only to preserve the read-only contract.
  if ! $CHECK_ONLY; then
    $ADB_CMD reverse tcp:$PORT tcp:$PORT 2>/dev/null || warn "adb reverse failed — device may not reach Metro"
    ok "adb reverse tcp:$PORT → host"
  fi

  # ── Step: App build / install ────────────────────────────────────
  step "Checking app" "Looking for $PACKAGE_ID on device"
  APP_INSTALLED=$($ADB_CMD shell pm list packages 2>/dev/null | grep -c "$PACKAGE_ID" || true)
  BC_LOCK_HELD=false  # see iOS block for semantics

  # ── Build-cache lookup (auto/fast/default modes only) ────────────
  if $BUILD_CACHE_ENABLED && [ "$MODE" != "clean" ] && [ "$MODE" != "rebuild-native" ]; then
    FP=$(bc_fingerprint 2>/dev/null || true)
    if [ -n "$FP" ]; then
      INSTALLED_FP=$(bc_installed_fp android)
      INSTALLED_TGT=$(bc_installed_target android)
      ADB_DEVICE_ID="${ADB_TARGET:-default}"
      if [ "$APP_INSTALLED" -gt 0 ] \
         && [ "$INSTALLED_FP" = "$FP" ] \
         && [ "$INSTALLED_TGT" = "$ADB_DEVICE_ID" ] \
         && ! $DO_REBUILD; then
        ok "Cache: installed app matches fingerprint ${FP:0:12} on $ADB_DEVICE_ID — no native action needed"
        CHECK_ONLY_FP_VERIFIED=true
        CHECK_ONLY_FP_VALUE="$FP"
      else
        if bc_lock_acquire android "$FP"; then
          BC_LOCK_HELD=true
          trap 'bc_lock_release' EXIT
          if bc_has_artifact android "$FP"; then
            if $CHECK_ONLY; then
              bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
              fail "App not at fingerprint ${FP:0:12} on $ADB_DEVICE_ID — cache hit available, but --check-only forbids install"
            fi
            echo -e "  ${GREEN}Cache hit:${NC} fp=${FP:0:12} — installing from shared cache"
            ANDROID_ARTIFACT=$(bc_artifact_path android "$FP")
            # `adb install -r` reinstalls keeping data; no preemptive uninstall.
            if $ADB_CMD install -r "$ANDROID_ARTIFACT" 2>/dev/null; then
              bc_record_install android "$FP" "$ADB_DEVICE_ID"
              APP_INSTALLED=1
              ok "Installed from cache: $ANDROID_ARTIFACT"
            else
              APP_INSTALLED=0
              if [ "$MODE" = "fast" ]; then
                bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
                fail "Mode 'fast': cached artifact install failed for fp ${FP:0:12}"
              fi
              warn "Cache install failed — falling through to native build"
            fi
          elif [ "$MODE" = "fast" ]; then
            bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
            fail "Mode 'fast' but no cached build for fp ${FP:0:12} and app not installed at this fingerprint on $ADB_DEVICE_ID"
          else
            # Cache miss in auto/default mode. Stale app must not pass the build
            # gate untouched; force a fresh build + install.
            APP_INSTALLED=0
          fi
        else
          if [ "$MODE" = "fast" ]; then
            fail "Mode 'fast': could not acquire build-cache lock for fp ${FP:0:12} — refusing to proceed without lock"
          fi
          warn "Could not acquire build-cache lock for fp ${FP:0:12} — proceeding without lock"
          APP_INSTALLED=0
        fi
      fi
    else
      if [ "$MODE" = "fast" ]; then
        fail "Mode 'fast': could not compute fingerprint — cannot validate cache availability"
      fi
      warn "Could not compute fingerprint — falling back to legacy build path"
    fi
  fi

  if [ "$APP_INSTALLED" -eq 0 ] || $DO_REBUILD; then
    $CHECK_ONLY && fail "App not installed (run with --rebuild)"

    # Uninstall for a clean slate. Re-query device since cache-miss zeroes
    # APP_INSTALLED even when the app is still physically present.
    if ($DO_CLEAN || $DO_WALLET_SETUP) && $ADB_CMD shell pm list packages 2>/dev/null | grep -q "$PACKAGE_ID"; then
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

    BUILD_LOG="$(resolve_path '.agent/android-build.log')"
    stage_log "$BUILD_LOG"
    : > "$BUILD_LOG"
    set +e
    run_with_live_log "$BUILD_LOG" "cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew app:assembleProdDebug -PreactNativeArchitectures=arm64-v8a"
    GRADLE_RC=$?
    set -e
    if grep -q 'BUILD SUCCESSFUL' "$BUILD_LOG" 2>/dev/null; then
      echo -e "  ${GREEN}→${NC} BUILD SUCCESSFUL"
    elif [ "$GRADLE_RC" -ne 0 ] || grep -qE 'BUILD FAILED|FAILURE|error:' "$BUILD_LOG" 2>/dev/null; then
      echo ""
      echo -e "  ${RED}Build log tail:${NC}"
      tail -30 "$BUILD_LOG" | sed 's/^/    /'
      fail "Gradle build failed — see $BUILD_LOG"
    fi

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

    # Publish .apk to shared cache. If we still hold the per-fingerprint lock
    # from the cache-decision phase, store directly; otherwise (clean/rebuild-native)
    # acquire-and-release inline via bc_with_lock.
    if $BUILD_CACHE_ENABLED && [ -n "${APK_PATH:-}" ]; then
      FP=$(bc_fingerprint 2>/dev/null || true)
      if [ -n "$FP" ]; then
        if $BC_LOCK_HELD; then
          if bc_store_artifact android "$FP" "$APK_PATH"; then
            ok "Stored build in shared cache: fp=${FP:0:12}"
            bc_record_install android "$FP" "${ADB_TARGET:-default}"
            bc_prune android "${BUILD_CACHE_RETAIN:-5}" 2>/dev/null || true
          else
            warn "Failed to store build in cache"
          fi
          bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
        else
          if bc_with_lock android "$FP" bc_store_artifact android "$FP" "$APK_PATH"; then
            ok "Stored build in shared cache: fp=${FP:0:12}"
            bc_record_install android "$FP" "${ADB_TARGET:-default}"
            bc_prune android "${BUILD_CACHE_RETAIN:-5}" 2>/dev/null || true
          else
            warn "Could not store build in cache (lock timeout?)"
          fi
        fi
      fi
    fi
  else
    if $BC_LOCK_HELD; then
      bc_lock_release; BC_LOCK_HELD=false; trap - EXIT
    fi
    ok "App already installed"
  fi
fi

# ══════════════════════════════════════════════════════════════════════
# ── Shared steps (both platforms) ────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════

# --check-only is read-only: probes above fail loud on mismatch; here we
# must not run Metro / CDP / wallet (all state-changing).
if $CHECK_ONLY; then
  TOTAL_ELAPSED=$(elapsed_since $PREFLIGHT_START)
  echo ""
  echo -e "${GREEN}${BOLD}=== Preflight check-only passed ===${NC} ${DIM}(${TOTAL_ELAPSED}s)${NC}"
  if ${CHECK_ONLY_FP_VERIFIED:-false}; then
    echo -e "  Platform ${DIM}$PLAT${NC} | App installed and verified at fingerprint ${DIM}${CHECK_ONLY_FP_VALUE:0:12}${NC}"
  else
    echo -e "  Platform ${DIM}$PLAT${NC} | App installed (fingerprint not verified — cache disabled or fingerprint compute failed)"
  fi
  exit 0
fi

# ── Step: Metro ─────────────────────────────────────────────────────
step "Starting Metro" "Bundler on port $PORT → logs at $LOGFILE"
stage_log "$LOGFILE"
# start-metro.sh detects running Metro and skips start. With --launch it
# opens the app via expo deeplink for the target platform regardless.
bash "$SCRIPTS/start-metro.sh" --platform "$PLAT" $($DO_LAUNCH && echo "--launch" || echo "")
ok "Metro running on port $PORT"

# NOTE: App launch is handled by start-metro.sh --launch (via expo deeplink).
# Do NOT launch again here with plain simctl launch / am start — that would
# kill the expo dev client connection and show the server picker.

# ── Step: CDP ───────────────────────────────────────────────────────
step "Connecting CDP" "Waiting for app to expose debug target"
stage_log "$CDP_LOG"
printf '$ node %s/cdp-bridge.js status\n' "$SCRIPTS" > "$CDP_LOG"
while [ $CDP_RETRY -lt $CDP_WAIT_TIMEOUT ]; do
  CDP_STATUS_OUTPUT=$(node "$SCRIPTS/cdp-bridge.js" status 2>&1 || true)
  printf '[attempt %s]\n%s\n' "$((CDP_RETRY + 1))" "$CDP_STATUS_OUTPUT" >>"$CDP_LOG"
  if echo "$CDP_STATUS_OUTPUT" | grep -q '"route"' 2>/dev/null; then
    ok "CDP connected"
    break
  fi
  sleep 1
  CDP_RETRY=$((CDP_RETRY + 1))
  [ $CDP_RETRY -eq 5 ] && echo -e "  ${DIM}Still waiting... app may still be loading JS bundle${NC}"
  [ $CDP_RETRY -eq 15 ] && echo -e "  ${DIM}Taking longer than usual — check device${NC}"
done
if [ $CDP_RETRY -ge $CDP_WAIT_TIMEOUT ]; then
  # Diagnostic: probe candidate ports before failing. The symptom we hit most
  # often is the app registering its Hermes inspector on 8081 instead of our
  # $PORT when a stale expo dev server lingers — surface that explicitly so we
  # don't spend 15 tool calls diagnosing the same thing twice.
  probe_cdp_port() {
    curl -s --max-time 2 "http://localhost:$1/json/list" 2>/dev/null \
      | python3 -c 'import sys,json; d=json.loads(sys.stdin.read() or "[]"); print(len(d))' 2>/dev/null \
      || echo 0
  }
  echo ""
  echo -e "  ${RED}CDP timeout — diagnostic probe:${NC}"
  probe_ports="$PORT"
  [ "$PORT" != "8081" ] && probe_ports="$probe_ports 8081"
  count_self=0
  count_other=0
  for probe_port in $probe_ports; do
    count=$(probe_cdp_port "$probe_port")
    if [ "$count" = "0" ]; then
      echo -e "    ${DIM}port $probe_port: 0 targets${NC}"
    else
      echo -e "    ${YELLOW}port $probe_port: $count targets${NC}"
      curl -s --max-time 2 "http://localhost:${probe_port}/json/list" 2>/dev/null \
        | python3 -c 'import sys,json
for p in json.loads(sys.stdin.read() or "[]"):
    t = p.get("title","?"); d = p.get("deviceName","?")
    print("      - %s (device=%s)" % (t, d))' 2>/dev/null || true
    fi
    if [ "$probe_port" = "$PORT" ]; then count_self=$count; else count_other=$count; fi
  done
  if [ "$count_self" = "0" ] && [ "$count_other" != "0" ]; then
    echo ""
    echo -e "  ${YELLOW}HINT:${NC} Targets found on 8081 but none on $PORT."
    echo -e "  ${DIM}A stale 'expo run:ios' without --port is likely holding 8081.${NC}"
    echo -e "  ${DIM}Run: pgrep -fl 'expo run:ios' to confirm, then kill it and retry.${NC}"
  fi
  fail "CDP did not become available after ${CDP_WAIT_TIMEOUT}s — see $CDP_LOG"
fi

# Verify CDP is connected to the right platform (status may return object or array)
CDP_STATUS=$(node "$SCRIPTS/cdp-bridge.js" status 2>>"$CDP_LOG" || true)
printf '[final-status]\n%s\n' "$CDP_STATUS" >>"$CDP_LOG"
CDP_HAS_PLAT=$(echo "$CDP_STATUS" | jq -r 'if type == "array" then [.[].platform] else [.platform] end | map(select(. == "'"$PLAT"'")) | length' 2>/dev/null || echo 0)
if [ "$CDP_HAS_PLAT" = "0" ]; then
  warn "CDP did not find $PLAT app — it may still be loading"
fi

# Brief stabilization
sleep 2

# ── Step: Wallet ────────────────────────────────────────────────────
if $DO_WALLET_SETUP; then
  step "Setting up wallet" "Configuring from $WALLET_FIXTURE"
  FIXTURE_FLAG=""
  [ "$WALLET_FIXTURE" != ".agent/wallet-fixture.json" ] && FIXTURE_FLAG="--fixture $WALLET_FIXTURE"
  if [ -f "$WALLET_FIXTURE" ] || [ -n "$FIXTURE_FLAG" ]; then
    stage_log "$WALLET_LOG"
    printf '$ bash %s/setup-wallet.sh %s\n' "$SCRIPTS" "$FIXTURE_FLAG" > "$WALLET_LOG"
    if bash "$SCRIPTS/setup-wallet.sh" $FIXTURE_FLAG >>"$WALLET_LOG" 2>&1; then
      tail -12 "$WALLET_LOG" | sed 's/^/  /'
      ok "Wallet configured"
    else
      warn "Wallet setup failed — see $WALLET_LOG"
    fi
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
echo -e "  Stage logs ${DIM}$LOG_DIR${NC}"
echo ""
echo -e "${DIM}Timing:${NC}"
echo -e "$STEP_TIMES"
