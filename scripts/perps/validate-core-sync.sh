#!/usr/bin/env bash
#
# validate-core-sync.sh — Validate that mobile perps code syncs cleanly to Core.
#
# Runs the full sync cycle (copy → verify → fix → build → lint) against a local
# Core checkout so you can confirm mobile changes are Core-compatible before pushing.
#
# Usage:
#   ./scripts/perps/validate-core-sync.sh [OPTIONS]
#
# Options:
#   --core-path <path>   Path to Core repo (required)
#   --skip-build         Skip the build step for faster iteration
#   --verbose            Show full command output for every step
#   --help               Print this help message and exit
#
# Example:
#   ./scripts/perps/validate-core-sync.sh --core-path ~/dev/metamask/core

set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────────

MOBILE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CORE_PATH=""
SKIP_BUILD=false
VERBOSE=false

PERPS_SRC="app/controllers/perps"
PERPS_DEST="packages/perps-controller/src"
WORKSPACE="@metamask/perps-controller"

STEP_COUNT=6
STEP_RESULTS=()
STEP_TIMES=()
STEP_LABELS=()
SUPPRESSION_COUNT=0
FILE_COUNT=0
OVERALL_START=0

# ─── Helpers ────────────────────────────────────────────────────────────────────

usage() {
  sed -n '/^# Usage:/,/^$/p' "$0" | sed 's/^# \?//'
  exit 0
}

die() { echo "ERROR: $*" >&2; exit 1; }

# Print a progress message that always reaches the terminal,
# even when step output is captured to a temp file.
# Uses fd 3 which run_step keeps pointed at the real stdout.
progress() { echo "$*" >&3; }

# Elapsed seconds since a given epoch timestamp
elapsed() {
  local start=$1
  local now
  now=$(date +%s)
  echo $(( now - start ))
}

# Format seconds as "Xm Ys" or "X.Xs"
fmt_time() {
  local secs=$1
  if (( secs >= 60 )); then
    printf '%dm %02ds' $(( secs / 60 )) $(( secs % 60 ))
  else
    printf '%ds' "$secs"
  fi
}

# Print a step result line
print_step() {
  local idx=$1 label=$2 result=$3 time=$4 extra=${5:-}
  local dots
  # Pad label+dots to 40 chars
  local label_len=${#label}
  local dot_count=$(( 40 - label_len ))
  (( dot_count < 3 )) && dot_count=3
  dots=$(printf '.%.0s' $(seq 1 "$dot_count"))

  local time_str
  time_str="$(fmt_time "$time")"

  local color reset
  reset='\033[0m'
  if [[ "$result" == "PASS" ]]; then
    color='\033[32m' # green
  else
    color='\033[31m' # red
  fi

  if [[ -n "$extra" ]]; then
    printf "[%d/%d] %s %s ${color}%s${reset} (%s) — %s\n" \
      "$idx" "$STEP_COUNT" "$label" "$dots" "$result" "$time_str" "$extra"
  else
    printf "[%d/%d] %s %s ${color}%s${reset} (%s)\n" \
      "$idx" "$STEP_COUNT" "$label" "$dots" "$result" "$time_str"
  fi
}

# Run a step. Usage: run_step <index> <label> <function>
# Captures output to a temp file; prints on failure or --verbose.
run_step() {
  local idx=$1 label=$2 func=$3
  STEP_LABELS+=("$label")
  local step_start tmpfile rc
  step_start=$(date +%s)
  tmpfile=$(mktemp)

  printf "[%d/%d] %s...\n" "$idx" "$STEP_COUNT" "$label"

  # fd 3 → real terminal so progress() calls in step functions are visible
  exec 3>&1

  if $VERBOSE; then
    "$func" 2>&1 | tee "$tmpfile"
    rc=${PIPESTATUS[0]}
  else
    "$func" > "$tmpfile" 2>&1
    rc=$?
  fi

  exec 3>&-

  local step_elapsed
  step_elapsed=$(elapsed "$step_start")
  STEP_TIMES+=("$step_elapsed")

  local color reset='\033[0m'
  if (( rc == 0 )); then
    STEP_RESULTS+=("PASS")
    color='\033[32m'
    printf "  → ${color}PASS${reset} (%s)\n" "$(fmt_time "$step_elapsed")"
  else
    STEP_RESULTS+=("FAIL")
    color='\033[31m'
    printf "  → ${color}FAIL${reset} (%s)\n" "$(fmt_time "$step_elapsed")"
    if ! $VERBOSE; then
      echo "  ┌─── output ───"
      sed 's/^/  │ /' "$tmpfile"
      echo "  └────────────"
    fi
  fi

  rm -f "$tmpfile"
  return 0  # never abort — we collect all results
}

# ─── Parse arguments ────────────────────────────────────────────────────────────

while (( $# )); do
  case "$1" in
    --core-path) CORE_PATH="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --verbose) VERBOSE=true; shift ;;
    --help|-h) usage ;;
    *) die "Unknown option: $1" ;;
  esac
done

# Resolve core path
if [[ -z "$CORE_PATH" ]]; then
  die "Missing --core-path <path>. Example: ./scripts/perps/validate-core-sync.sh --core-path ~/dev/metamask/core"
fi

if $SKIP_BUILD; then
  STEP_COUNT=5
fi

# ─── Step functions ─────────────────────────────────────────────────────────────

step_preflight() {
  local errors=0

  # Confirm mobile repo
  if [[ ! -d "$MOBILE_ROOT/$PERPS_SRC" ]]; then
    echo "FAIL: $MOBILE_ROOT/$PERPS_SRC not found — are you in the mobile repo?"
    errors=$((errors + 1))
  else
    echo "OK: Mobile perps source found"
  fi

  # Confirm core repo
  if [[ ! -d "$CORE_PATH/packages/perps-controller" ]]; then
    echo "FAIL: $CORE_PATH/packages/perps-controller not found"
    echo "      Set --core-path to the root of your Core checkout"
    errors=$((errors + 1))
  else
    echo "OK: Core perps-controller package found"
  fi

  # Warn about core branch (non-fatal)
  local core_branch
  core_branch=$(cd "$CORE_PATH" && git branch --show-current 2>/dev/null || echo "unknown")
  if [[ "$core_branch" != "feat/perps/controller-migration-sync" ]]; then
    echo "WARN: Core is on branch '$core_branch' (expected 'feat/perps/controller-migration-sync')"
  else
    echo "OK: Core is on expected branch"
  fi

  # Check tools
  for tool in rsync yarn jq; do
    if ! command -v "$tool" &>/dev/null; then
      echo "FAIL: Required tool '$tool' not found in PATH"
      errors=$((errors + 1))
    fi
  done
  echo "OK: Required tools available (rsync, yarn, jq)"

  return $errors
}

step_copy() {
  # Use --filter rules: excludes before includes, first match wins.
  # --delete-excluded ensures test files / mocks at destination are removed.
  rsync -av --delete --delete-excluded \
    --exclude='*.test.ts' \
    --exclude='*.test.tsx' \
    --exclude='__mocks__/' \
    --exclude='__fixtures__/' \
    --include='*/' \
    --include='*.ts' \
    --exclude='*' \
    "$MOBILE_ROOT/$PERPS_SRC/" \
    "$CORE_PATH/$PERPS_DEST/"

  FILE_COUNT=$(find "$CORE_PATH/$PERPS_DEST" -name '*.ts' -not -name '*.test.*' | wc -l | tr -d ' ')
  echo "Copied $FILE_COUNT .ts files"
}

step_verify_fixes() {
  local errors=0

  # Check __DEV__ is NOT present
  if grep -rn "__DEV__" "$CORE_PATH/$PERPS_DEST" --include="*.ts" | grep -v '//.*__DEV__'; then
    echo "FAIL: __DEV__ found in copied files — must be replaced with 'false' in Core"
    errors=$((errors + 1))
  else
    echo "OK: No __DEV__ references"
  fi

  # Check validatedMeta closure fix
  if grep -q "const validatedMeta = perpsMeta" "$CORE_PATH/$PERPS_DEST/services/HyperLiquidSubscriptionService.ts" 2>/dev/null; then
    echo "OK: validatedMeta closure fix present"
  else
    echo "FAIL: 'const validatedMeta = perpsMeta' not found in HyperLiquidSubscriptionService.ts"
    errors=$((errors + 1))
  fi

  # Check for mobile-specific imports (excluding comments and test files)
  local mobile_imports
  mobile_imports=$(grep -rn --include="*.ts" --exclude="*.test.ts" \
    -e "from '.*Engine" \
    -e "from 'react-native" \
    -e "from '.*Sentry" \
    -e "from '.*DevLogger" \
    "$CORE_PATH/$PERPS_DEST" 2>/dev/null \
    | grep -v '^\s*//' \
    | grep -v '// ' \
    || true)

  if [[ -n "$mobile_imports" ]]; then
    echo "FAIL: Mobile-specific imports found:"
    echo "$mobile_imports"
    errors=$((errors + 1))
  else
    echo "OK: No mobile-specific imports"
  fi

  return $errors
}

step_eslint_fix() {
  cd "$CORE_PATH"

  # Back up suppressions file so we don't leave dirty changes in Core
  local supp_file="$CORE_PATH/eslint-suppressions.json"
  local supp_backup=""
  if [[ -f "$supp_file" ]]; then
    supp_backup=$(mktemp)
    cp "$supp_file" "$supp_backup"
  fi

  progress "  ├─ Running --fix"
  npx eslint packages/perps-controller/src/ --ext .ts --fix || true

  progress "  ├─ Running --suppress-all"
  npx eslint packages/perps-controller/src/ --ext .ts --suppress-all || true

  progress "  └─ Running --prune-suppressions"
  npx eslint packages/perps-controller/src/ --ext .ts --prune-suppressions || true

  # Count suppressions
  if [[ -f "$supp_file" ]]; then
    SUPPRESSION_COUNT=$(jq \
      '[to_entries[] | select(.key | startswith("packages/perps-controller/")) | .value | to_entries[].value.count] | add // 0' \
      "$supp_file" 2>/dev/null || echo "0")
    echo "Perps suppression count: $SUPPRESSION_COUNT"

    if (( SUPPRESSION_COUNT > 20 )); then
      echo "WARN: Suppression count ($SUPPRESSION_COUNT) is higher than expected (~7-15)"
    fi
  else
    echo "WARN: eslint-suppressions.json not found"
    SUPPRESSION_COUNT=0
  fi

  # Restore original suppressions file
  if [[ -n "$supp_backup" ]]; then
    mv "$supp_backup" "$supp_file"
  fi

  cd "$MOBILE_ROOT"
  return 0
}

step_build() {
  cd "$CORE_PATH"
  yarn workspace "$WORKSPACE" build
  cd "$MOBILE_ROOT"
}

step_lint() {
  cd "$CORE_PATH"
  # No workspace-level lint script exists; run eslint directly to verify
  # all violations are either fixed or suppressed (exit 0 = clean).
  npx eslint packages/perps-controller/src/ --ext .ts
  cd "$MOBILE_ROOT"
}

# ─── Main ───────────────────────────────────────────────────────────────────────

main() {
  OVERALL_START=$(date +%s)

  echo ""
  echo "Perps Core Sync Validation"
  echo "Mobile: $MOBILE_ROOT"
  echo "Core:   $CORE_PATH"
  echo ""

  local step=0

  step=$((step + 1))
  run_step $step "Pre-flight checks" step_preflight

  step=$((step + 1))
  run_step $step "Copy source files" step_copy

  step=$((step + 1))
  run_step $step "Verify build fixes" step_verify_fixes

  step=$((step + 1))
  run_step $step "ESLint auto-fix + suppressions" step_eslint_fix

  if ! $SKIP_BUILD; then
    step=$((step + 1))
    run_step $step "Build" step_build
  fi

  step=$((step + 1))
  run_step $step "Lint" step_lint

  # ─── Summary ────────────────────────────────────────────────────────────────

  local total_elapsed
  total_elapsed=$(elapsed "$OVERALL_START")
  local any_failed=false

  echo ""
  echo ""
  for i in "${!STEP_RESULTS[@]}"; do
    local idx=$((i + 1))
    local extra=""
    local label="${STEP_LABELS[$i]}"

    if [[ "$label" == "Copy source files" ]]; then
      extra="$FILE_COUNT files"
    elif [[ "$label" == "ESLint auto-fix + suppressions" ]]; then
      extra="$SUPPRESSION_COUNT suppressions"
    fi

    print_step "$idx" "$label" "${STEP_RESULTS[$i]}" "${STEP_TIMES[$i]}" "$extra"

    if [[ "${STEP_RESULTS[$i]}" == "FAIL" ]]; then
      any_failed=true
    fi
  done

  echo ""
  echo "══════════════════════════════════════════"
  if $any_failed; then
    printf 'RESULT: \033[31mSOME STEPS FAILED\033[0m\n'
  else
    printf 'RESULT: \033[32mALL STEPS PASSED\033[0m\n'
  fi
  printf 'Total time: %s\n' "$(fmt_time "$total_elapsed")"
  printf 'Suppressions: %s\n' "$SUPPRESSION_COUNT"
  echo "══════════════════════════════════════════"
  echo ""

  if $any_failed; then
    exit 1
  fi
}

main
