#!/usr/bin/env bash
# run-timing-benchmark.sh — Wall-clock timing comparison: Detox vs Agentic recipes
#
# Uses TWO separate simulators and builds to avoid conflicts:
#   - Detox:   e2e debug build on dedicated "detox-benchmark" simulator (port 8081)
#              Detox wipes app data each test — isolated from dev environment.
#   - Agentic: dev build on IOS_SIMULATOR from .js.env (port from WATCHER_PORT)
#              Uses existing wallet with real testnet balance — no wipe.
#
# Prerequisites:
#   1. Detox build:  yarn test:e2e:ios:debug:build
#   2. Dev build:    yarn a:setup:ios (or preflight.sh)
#   3. Wallet unlocked on IOS_SIMULATOR with perps enabled + testnet balance
#
# The two phases run sequentially. Each manages its own Metro instance.
#
# Usage:
#   bash scripts/perps/agentic/run-timing-benchmark.sh
#
# Override simulators:
#   DETOX_SIMULATOR="my-detox-sim" AGENTIC_SIMULATOR="my-dev-sim" \
#     bash scripts/perps/agentic/run-timing-benchmark.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# ---------------------------------------------------------------------------
# Source .js.env (non-destructive: only sets vars not already in env)
# Same approach as preflight.sh — caller env takes precedence.
# ---------------------------------------------------------------------------
if [[ -f "$PROJECT_ROOT/.js.env" ]]; then
  while IFS= read -r _line || [[ -n "$_line" ]]; do
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _line="${_line#export }"
    _key="${_line%%=*}"
    _key="${_key//[[:space:]]/}"
    [[ -n "$_key" && -z "${!_key+x}" ]] && eval "export $_line" 2>/dev/null || true
  done < "$PROJECT_ROOT/.js.env"
  unset _line _key
fi

# ---------------------------------------------------------------------------
# Config — two simulators, shared port (Metro restarts between phases)
# ---------------------------------------------------------------------------

DETOX_SIMULATOR="${DETOX_SIMULATOR:-detox-benchmark}"
SHARED_PORT="${WATCHER_PORT:-8062}"
DETOX_PORT="$SHARED_PORT"

AGENTIC_SIMULATOR="${AGENTIC_SIMULATOR:-${IOS_SIMULATOR:-mm-2}}"
AGENTIC_PORT="$SHARED_PORT"

# Matched pairs: Detox spec path -> agentic recipe path
SPEC_NAMES=("perps-position" "perps-position-stop-loss" "perps-limit-long-fill")

declare -A DETOX_SPECS
DETOX_SPECS[perps-position]="tests/smoke/perps/perps-position.spec.ts"
DETOX_SPECS[perps-position-stop-loss]="tests/smoke/perps/perps-position-stop-loss.spec.ts"
DETOX_SPECS[perps-limit-long-fill]="tests/smoke/perps/perps-limit-long-fill.spec.ts"

declare -A AGENTIC_RECIPES
AGENTIC_RECIPES[perps-position]="scripts/perps/agentic/teams/perps/recipes/benchmark/perps-position.json"
AGENTIC_RECIPES[perps-position-stop-loss]="scripts/perps/agentic/teams/perps/recipes/benchmark/perps-position-stop-loss.json"
AGENTIC_RECIPES[perps-limit-long-fill]="scripts/perps/agentic/teams/perps/recipes/benchmark/perps-limit-long-fill.json"

# Results arrays
declare -A DETOX_TIMES
declare -A AGENTIC_TIMES
declare -A DETOX_STATUS
declare -A AGENTIC_STATUS

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

run_timed() {
  # run_timed <label> <command...>
  # Prints elapsed seconds, returns exit code
  local label="$1"; shift
  local start_s=$SECONDS
  echo ""
  echo "================================================================"
  echo "[$label] started at $(timestamp)"
  echo "================================================================"
  set +e
  "$@"
  local exit_code=$?
  set -e
  local elapsed=$(( SECONDS - start_s ))
  echo "----------------------------------------------------------------"
  echo "[$label] finished in ${elapsed}s (exit=$exit_code)"
  echo "----------------------------------------------------------------"
  # Export via global
  _TIMED_ELAPSED=$elapsed
  _TIMED_EXIT=$exit_code
}

wait_for_cdp() {
  local port=$1
  local timeout=${2:-60}
  echo "Waiting for CDP targets on port $port..."
  for i in $(seq 1 "$timeout"); do
    TARGETS=$(curl -sf "http://localhost:$port/json/list" 2>/dev/null \
      | python3 -c "import sys,json; print(len(json.loads(sys.stdin.read() or '[]')))" 2>/dev/null || echo 0)
    if [[ "$TARGETS" -gt 0 ]]; then
      echo "CDP ready: $TARGETS target(s)"
      return 0
    fi
    sleep 2
  done
  echo "WARNING: CDP not ready after $((timeout * 2))s"
  return 1
}

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Perps Timing Benchmark"
echo "  $(timestamp)"
echo "========================================"
echo ""
echo "  Detox:   simulator=$DETOX_SIMULATOR  port=$DETOX_PORT  env=e2e"
echo "  Agentic: simulator=$AGENTIC_SIMULATOR  port=$AGENTIC_PORT  env=dev"
echo ""

# ---------------------------------------------------------------------------
# Phase 1: Detox specs (e2e build, dedicated simulator)
# ---------------------------------------------------------------------------

echo ""
echo "========================================"
echo "  PHASE 1: Detox Smoke Specs"
echo "  Simulator: $DETOX_SIMULATOR"
echo "  Metro port: $DETOX_PORT (METAMASK_ENVIRONMENT=e2e)"
echo "========================================"

# Ensure Metro on shared port with e2e env — kill any existing Metro first
METRO_PID=$(lsof -iTCP:"$SHARED_PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
if [[ -n "$METRO_PID" ]]; then
  METRO_ENV=$(ps -p "$METRO_PID" -E 2>/dev/null | grep -o 'METAMASK_ENVIRONMENT=[^ ]*' || echo "")
  if [[ "$METRO_ENV" == "METAMASK_ENVIRONMENT=e2e" ]]; then
    echo "Metro already running on $SHARED_PORT with e2e"
  else
    echo "Metro on $SHARED_PORT has $METRO_ENV — restarting with e2e..."
    kill "$METRO_PID" 2>/dev/null; sleep 3
    METRO_PID=""
  fi
fi
if [[ -z "$METRO_PID" ]] || ! curl -sf "http://localhost:$SHARED_PORT/status" >/dev/null 2>&1; then
  echo "Starting Metro on port $SHARED_PORT with METAMASK_ENVIRONMENT=e2e IS_TEST=true..."
  METAMASK_ENVIRONMENT=e2e IS_TEST=true METAMASK_BUILD_TYPE=main \
    nohup yarn expo start --port "$SHARED_PORT" >/dev/null 2>&1 &
  echo "Waiting for Metro on $SHARED_PORT to become ready..."
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:$SHARED_PORT/status" >/dev/null 2>&1; then
      echo "Metro ready on $SHARED_PORT after $((i * 3))s"
      break
    fi
    if [[ $i -eq 30 ]]; then
      echo "ERROR: Metro on $SHARED_PORT not ready after 90s — Detox specs will likely fail"
    fi
    sleep 3
  done
fi

# Source .e2e.env for Detox
E2E_ENV="$PROJECT_ROOT/.e2e.env"
[[ -f "$E2E_ENV" ]] && source "$E2E_ENV"

# Boot detox simulator if needed
if ! xcrun simctl list devices | grep "$DETOX_SIMULATOR" | grep -q "Booted"; then
  echo "Booting $DETOX_SIMULATOR..."
  xcrun simctl boot "$DETOX_SIMULATOR" 2>/dev/null || true
  sleep 3
fi

for name in "${SPEC_NAMES[@]}"; do
  spec="${DETOX_SPECS[$name]}"

  run_timed "detox:$name" \
    env IOS_SIMULATOR="$DETOX_SIMULATOR" WATCHER_PORT="$DETOX_PORT" \
    yarn test:e2e:ios:debug:run "$spec"

  DETOX_TIMES[$name]=$_TIMED_ELAPSED
  if [[ $_TIMED_EXIT -eq 0 ]]; then
    DETOX_STATUS[$name]="PASS"
  else
    DETOX_STATUS[$name]="FAIL"
  fi
done

# ---------------------------------------------------------------------------
# Phase 2: Agentic recipes (dev build, existing simulator + wallet)
# ---------------------------------------------------------------------------

echo ""
echo "========================================"
echo "  PHASE 2: Agentic Recipes"
echo "  Simulator: $AGENTIC_SIMULATOR"
echo "  Metro port: $AGENTIC_PORT (METAMASK_ENVIRONMENT=dev)"
echo "========================================"

# Restart Metro on shared port with dev env for agentic phase
echo "Switching Metro on $SHARED_PORT to dev environment..."
METRO_PID=$(lsof -iTCP:"$SHARED_PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
if [[ -n "$METRO_PID" ]]; then
  kill "$METRO_PID" 2>/dev/null; sleep 3
fi
METAMASK_ENVIRONMENT=dev METAMASK_BUILD_TYPE=main \
  bash "$SCRIPT_DIR/start-metro.sh" --platform ios --launch
wait_for_cdp "$SHARED_PORT"

# Post-restart setup: unlock wallet, dismiss onboarding, init perps
echo ""
echo "Post-restart: setting up agentic environment..."
CDP_BRIDGE="$SCRIPT_DIR/cdp-bridge.js"
export IOS_SIMULATOR="$AGENTIC_SIMULATOR"
export WATCHER_PORT="$AGENTIC_PORT"

# Wait for app to fully load (Login or Wallet screen)
echo "  Waiting for app to be ready..."
for i in $(seq 1 15); do
  ROUTE=$(node "$CDP_BRIDGE" get-route 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null || echo "")
  if [[ "$ROUTE" == "Login" || "$ROUTE" == "Wallet" ]]; then
    echo "  App ready on $ROUTE screen after $((i * 2))s"
    break
  fi
  sleep 2
done

# Unlock wallet if on Login screen
WALLET_PW=$(python3 -c "import json; print(json.load(open('.agent/wallet-fixture.json'))['password'])" 2>/dev/null || echo "qwerasdf")
if [[ "$ROUTE" == "Login" ]]; then
  echo "  Unlocking wallet..."
  node "$CDP_BRIDGE" unlock "$WALLET_PW" 2>/dev/null; sleep 3
else
  echo "  Wallet already unlocked"
fi

# Init perps provider + testnet
echo "  Initializing perps provider..."
node "$CDP_BRIDGE" eval-async 'Engine.context.PerpsController.init().then(function(){return Engine.context.PerpsController.toggleTestnet(true)}).then(function(){return JSON.stringify({ok:true})})' >/dev/null 2>&1
sleep 2

# Verify readiness
echo "  Checking perps readiness..."
node "$CDP_BRIDGE" check-pre-conditions '["perps.ready_to_trade","perps.sufficient_balance"]' 2>/dev/null || echo "WARNING: perps pre-conditions may not be met"

# Pre-flight: check agentic wallet balance via CDP
echo ""
echo "Pre-flight: checking perps balance on $AGENTIC_SIMULATOR..."
BALANCE_CHECK=$(env IOS_SIMULATOR="$AGENTIC_SIMULATOR" WATCHER_PORT="$AGENTIC_PORT" \
  node "$SCRIPT_DIR/cdp-bridge.js" eval-ref perps/balances 2>/dev/null || echo '{"error":"balance check failed (non-fatal)"}')
echo "  $BALANCE_CHECK"
echo ""

for name in "${SPEC_NAMES[@]}"; do
  recipe="${AGENTIC_RECIPES[$name]}"

  run_timed "agentic:$name" \
    env IOS_SIMULATOR="$AGENTIC_SIMULATOR" WATCHER_PORT="$AGENTIC_PORT" \
    node scripts/perps/agentic/validate-recipe.js "$recipe"

  AGENTIC_TIMES[$name]=$_TIMED_ELAPSED
  if [[ $_TIMED_EXIT -eq 0 ]]; then
    AGENTIC_STATUS[$name]="PASS"
  else
    AGENTIC_STATUS[$name]="FAIL"
  fi
done

# ---------------------------------------------------------------------------
# Phase 3: Results table
# ---------------------------------------------------------------------------

echo ""
echo "========================================"
echo "  TIMING BENCHMARK RESULTS"
echo "  $(timestamp)"
echo "========================================"
echo ""

# Print markdown table
TABLE="| Spec | Detox (s) | Detox Status | Agentic (s) | Agentic Status | Delta (s) | Speedup |
|------|-----------|--------------|-------------|----------------|-----------|---------|"

TOTAL_DETOX=0
TOTAL_AGENTIC=0

for name in "${SPEC_NAMES[@]}"; do
  dt=${DETOX_TIMES[$name]}
  at=${AGENTIC_TIMES[$name]}
  ds=${DETOX_STATUS[$name]}
  as=${AGENTIC_STATUS[$name]}
  delta=$(( dt - at ))
  if [[ $at -gt 0 ]]; then
    speedup_100=$(( dt * 100 / at ))
    speedup="$(( speedup_100 / 100 )).$(printf '%02d' $(( speedup_100 % 100 )))x"
  else
    speedup="N/A"
  fi
  TABLE="$TABLE
| $name | $dt | $ds | $at | $as | ${delta} | ${speedup} |"
  TOTAL_DETOX=$(( TOTAL_DETOX + dt ))
  TOTAL_AGENTIC=$(( TOTAL_AGENTIC + at ))
done

TOTAL_DELTA=$(( TOTAL_DETOX - TOTAL_AGENTIC ))
if [[ $TOTAL_AGENTIC -gt 0 ]]; then
  total_speedup_100=$(( TOTAL_DETOX * 100 / TOTAL_AGENTIC ))
  total_speedup="$(( total_speedup_100 / 100 )).$(printf '%02d' $(( total_speedup_100 % 100 )))x"
else
  total_speedup="N/A"
fi
TABLE="$TABLE
| **TOTAL** | **$TOTAL_DETOX** | | **$TOTAL_AGENTIC** | | **${TOTAL_DELTA}** | **${total_speedup}** |"

echo "$TABLE"

# ---------------------------------------------------------------------------
# Append to benchmark doc
# ---------------------------------------------------------------------------

BENCHMARK_DOC="$SCRIPT_DIR/e2e-recipe-benchmark.md"
RUN_DATE=$(date '+%Y-%m-%d %H:%M')

SECTION="

## Timing Benchmark ($RUN_DATE)

**Detox:** simulator=$DETOX_SIMULATOR, port=$DETOX_PORT, env=e2e (debug build, mock infrastructure)
**Agentic:** simulator=$AGENTIC_SIMULATOR, port=$AGENTIC_PORT, env=dev (dev build, real testnet)

$TABLE

### Notes
- Detox and agentic use **different builds and simulators** — Detox needs e2e mocks, recipes need real API.
- Detox times include app wipe+reinstall, fixture inject, mock server, test execution, teardown.
- Agentic times include CDP connection, preflight checks, recipe execution, teardown.
- Delta = Detox - Agentic (positive = agentic faster).
- Speedup = Detox time / Agentic time.
"

echo "$SECTION" >> "$BENCHMARK_DOC"
echo ""
echo "Results appended to: $BENCHMARK_DOC"
echo "Done."
