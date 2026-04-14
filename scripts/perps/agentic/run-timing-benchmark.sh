#!/usr/bin/env bash
# run-timing-benchmark.sh — Wall-clock timing comparison: Detox vs Agentic recipes
#
# Runs 3 active Detox smoke specs and their matching agentic recipes on the
# same iOS debug build, captures wall-clock seconds, prints comparison table.
#
# Prerequisites:
#   1. Detox debug build:  yarn test:e2e:ios:debug:build   (one-time, ~15min)
#   2. Metro bundler:      yarn start                       (for agentic recipes)
#   3. Wallet unlocked with perps enabled + testnet balance
#
# Usage:
#   bash scripts/perps/agentic/run-timing-benchmark.sh [--simulator <name>]
#
# Default simulator: "iPhone 16 Pro" (matches .detoxrc.js ios.simulator device)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SIMULATOR="${IOS_SIMULATOR:-iPhone 16 Pro}"

# Parse --simulator flag
while [[ $# -gt 0 ]]; do
  case "$1" in
    --simulator) SIMULATOR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

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

# ---------------------------------------------------------------------------
# Phase 1: Detox specs
# ---------------------------------------------------------------------------

echo ""
echo "========================================"
echo "  PHASE 1: Detox Smoke Specs"
echo "  Simulator: $SIMULATOR"
echo "========================================"

cd "$PROJECT_ROOT"

for name in "${SPEC_NAMES[@]}"; do
  spec="${DETOX_SPECS[$name]}"

  run_timed "detox:$name" \
    env IS_TEST=true NODE_OPTIONS='--experimental-vm-modules' \
    npx detox test -c ios.sim.main "$spec"

  DETOX_TIMES[$name]=$_TIMED_ELAPSED
  if [[ $_TIMED_EXIT -eq 0 ]]; then
    DETOX_STATUS[$name]="PASS"
  else
    DETOX_STATUS[$name]="FAIL"
  fi
done

# ---------------------------------------------------------------------------
# Phase 2: Agentic recipes
# ---------------------------------------------------------------------------

echo ""
echo "========================================"
echo "  PHASE 2: Agentic Recipes"
echo "  Simulator: $SIMULATOR"
echo "========================================"

for name in "${SPEC_NAMES[@]}"; do
  recipe="${AGENTIC_RECIPES[$name]}"

  run_timed "agentic:$name" \
    env IOS_SIMULATOR="$SIMULATOR" \
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
echo "  Simulator: $SIMULATOR"
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

**Simulator:** $SIMULATOR
**Build:** Detox debug (ios.sim.main / \`__DEV__=true\`)

Both Detox and agentic recipes ran on the same debug build, same simulator, sequentially.

$TABLE

### Notes
- Detox times include app install, launch, fixture setup, mock server startup, and teardown.
- Agentic times include CDP connection, preflight checks, recipe execution, and teardown.
- Delta = Detox - Agentic (positive = agentic faster).
- Speedup = Detox time / Agentic time.
"

echo "$SECTION" >> "$BENCHMARK_DOC"
echo ""
echo "Results appended to: $BENCHMARK_DOC"
echo "Done."
