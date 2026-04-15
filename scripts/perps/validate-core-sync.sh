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

STEP_COUNT=9
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
  STEP_COUNT=8
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

compute_source_checksum() {
  local dir="$1"
  find "$dir" -name '*.ts' -not -name '*.test.*' -print0 \
    | sort -z \
    | xargs -0 shasum -a 256 \
    | shasum -a 256 \
    | cut -d' ' -f1
}

step_conflict_check() {
  local sync_state="$CORE_PATH/packages/perps-controller/.sync-state.json"

  # Check freshness vs origin/main BEFORE looking at sync state.
  # If someone else committed to packages/perps-controller on main while
  # this branch was in review, we need to merge main first — otherwise
  # the sync will silently overwrite their work. Hard-fail in that case.
  (
    cd "$CORE_PATH"
    if git rev-parse --verify origin/main >/dev/null 2>&1; then
      echo "OK: Fetching origin/main to check freshness..."
      if git fetch origin main --quiet 2>/dev/null; then
        local behind_count
        behind_count=$(git rev-list --count HEAD..origin/main -- packages/perps-controller/ 2>/dev/null || echo "0")
        if (( behind_count > 0 )); then
          echo "FAIL: Current branch is behind origin/main by $behind_count commit(s) touching packages/perps-controller/"
          echo "FAIL: Someone committed perps-controller changes to main after this branch started."
          echo "FAIL: Merge or rebase origin/main before syncing, e.g.:"
          echo "FAIL:   cd $CORE_PATH && git merge origin/main"
          echo ""
          echo "Offending commits:"
          git log HEAD..origin/main --oneline -- packages/perps-controller/ | sed 's/^/  /'
          exit 1
        else
          echo "OK: Current branch is current with origin/main for perps-controller"
        fi
      else
        echo "WARN: Could not fetch origin/main (offline?) — skipping freshness check"
      fi
    else
      echo "WARN: No origin/main ref in core repo — skipping freshness check"
    fi
  ) || return 1

  if [[ ! -f "$sync_state" ]]; then
    echo "OK: No previous sync state — first sync"
    return 0
  fi

  # Check git-level changes since last sync
  local last_core_commit
  last_core_commit=$(jq -r '.lastSyncedCoreCommit // empty' "$sync_state")
  if [[ -n "$last_core_commit" ]]; then
    local core_changes
    core_changes=$(cd "$CORE_PATH" && git diff --name-only "$last_core_commit"..HEAD -- packages/perps-controller/src/ 2>/dev/null | wc -l | tr -d ' ')
    if (( core_changes > 0 )); then
      echo "WARN: Core has $core_changes committed file(s) changed in perps-controller/src/ since last sync ($last_core_commit)"
      echo "WARN: Review these changes before syncing to avoid overwriting Core-only edits"
    else
      echo "OK: No committed Core changes since last sync"
    fi
  fi

  # Check source fingerprint for uncommitted edits
  local stored_checksum
  stored_checksum=$(jq -r '.sourceChecksum // empty' "$sync_state")
  if [[ -n "$stored_checksum" ]]; then
    local current_checksum
    current_checksum=$(compute_source_checksum "$CORE_PATH/$PERPS_DEST")
    if [[ "$current_checksum" != "$stored_checksum" ]]; then
      echo "WARN: Core source checksum mismatch — files were edited since last sync"
      echo "WARN: stored:  $stored_checksum"
      echo "WARN: current: $current_checksum"
    else
      echo "OK: Core source checksum matches last sync"
    fi
  fi
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

step_install() {
  cd "$CORE_PATH"
  yarn install
  cd "$MOBILE_ROOT"
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

  local supp_file="$CORE_PATH/eslint-suppressions.json"

  # Snapshot the baseline per-file/per-rule suppression counts for
  # packages/perps-controller BEFORE we touch anything, so we can tell the
  # difference between pre-existing suppressions and new violations that the
  # current sync is introducing.
  local baseline_json="/tmp/perps-suppressions-baseline-$$.json"
  if [[ -f "$supp_file" ]]; then
    jq '[to_entries[] | select(.key | startswith("packages/perps-controller/"))] | from_entries' \
      "$supp_file" > "$baseline_json" 2>/dev/null || echo '{}' > "$baseline_json"
  else
    echo '{}' > "$baseline_json"
  fi

  progress "  ├─ Running --fix"
  yarn eslint 'packages/perps-controller/src/**/*.ts' --fix || true

  progress "  ├─ Running --suppress-all"
  yarn eslint 'packages/perps-controller/src/**/*.ts' --suppress-all || true

  progress "  ├─ Running --prune-suppressions"
  yarn eslint 'packages/perps-controller/src/**/*.ts' --prune-suppressions || true

  # Prettier formats eslint-suppressions.json differently than eslint
  # writes it (trailing newline, key quoting), so run prettier afterwards
  # to keep core's lint:misc:check happy.
  if [[ -f "$supp_file" ]]; then
    progress "  ├─ Running prettier on eslint-suppressions.json"
    yarn prettier --write eslint-suppressions.json > /dev/null 2>&1 || true
  fi

  # Count suppressions
  if [[ -f "$supp_file" ]]; then
    SUPPRESSION_COUNT=$(jq \
      '[to_entries[] | select(.key | startswith("packages/perps-controller/")) | .value | to_entries[].value.count] | add // 0' \
      "$supp_file" 2>/dev/null || echo "0")
    echo "Perps suppression count: $SUPPRESSION_COUNT"
  else
    echo "WARN: eslint-suppressions.json not found"
    SUPPRESSION_COUNT=0
  fi

  # Per-file/per-rule delta check: hard-fail if any file's suppression count
  # INCREASED compared to the baseline. Reducing counts is always allowed
  # (that's what happens when a mobile fix removes a previously-suppressed
  # violation). This is the canonical detection point for the problem that
  # "it should have been detected locally!" — a new `'x' in y` use, a new
  # `@typescript-eslint/*` violation, etc. will show up here BEFORE the
  # core PR is opened.
  progress "  └─ Checking per-file suppression delta"
  local current_json="/tmp/perps-suppressions-current-$$.json"
  if [[ -f "$supp_file" ]]; then
    jq '[to_entries[] | select(.key | startswith("packages/perps-controller/"))] | from_entries' \
      "$supp_file" > "$current_json" 2>/dev/null || echo '{}' > "$current_json"
  else
    echo '{}' > "$current_json"
  fi

  local delta_report
  delta_report=$(jq -n \
    --slurpfile baseline "$baseline_json" \
    --slurpfile current "$current_json" \
    '
      ($baseline[0] // {}) as $b
      | ($current[0] // {}) as $c
      | [
          ($c | to_entries[]) as $file
          | ($file.value | to_entries[]) as $rule
          | {
              file: $file.key,
              rule: $rule.key,
              before: (($b[$file.key] // {})[$rule.key].count // 0),
              after:  $rule.value.count
            }
          | select(.after > .before)
        ]
    ' 2>/dev/null || echo '[]')

  rm -f "$baseline_json" "$current_json"

  local delta_count
  delta_count=$(echo "$delta_report" | jq 'length' 2>/dev/null || echo "0")
  if (( delta_count > 0 )); then
    echo "FAIL: $delta_count suppression(s) INCREASED vs baseline — this sync introduces new violations that must be fixed at source before syncing to core."
    echo ""
    echo "Offending entries:"
    echo "$delta_report" | jq -r '.[] | "  - \(.file) [\(.rule)]: \(.before) → \(.after)"' 2>/dev/null || echo "$delta_report"
    echo ""
    echo "FAIL: Fix these violations in mobile (e.g. replace \`'x' in y\` with \`hasProperty(y, 'x')\` from \`@metamask/utils\`), then re-run the sync."
    cd "$MOBILE_ROOT"
    return 1
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
  yarn eslint 'packages/perps-controller/src/**/*.ts'
  cd "$MOBILE_ROOT"
}

step_write_sync_state() {
  local mobile_commit mobile_branch core_commit core_branch checksum
  mobile_commit=$(cd "$MOBILE_ROOT" && git rev-parse HEAD)
  mobile_branch=$(cd "$MOBILE_ROOT" && git branch --show-current)
  core_commit=$(cd "$CORE_PATH" && git rev-parse HEAD)
  core_branch=$(cd "$CORE_PATH" && git branch --show-current)
  checksum=$(compute_source_checksum "$CORE_PATH/$PERPS_DEST")

  cat > "$CORE_PATH/packages/perps-controller/.sync-state.json" <<EOF
{
  "lastSyncedMobileCommit": "$mobile_commit",
  "lastSyncedMobileBranch": "$mobile_branch",
  "lastSyncedCoreCommit": "$core_commit",
  "lastSyncedCoreBranch": "$core_branch",
  "lastSyncedDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sourceChecksum": "$checksum"
}
EOF
  echo "Sync state written (checksum: ${checksum:0:12}…)"
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
  run_step $step "Conflict check" step_conflict_check

  step=$((step + 1))
  run_step $step "Copy source files" step_copy

  step=$((step + 1))
  run_step $step "Install dependencies" step_install

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

  step=$((step + 1))
  run_step $step "Write sync state" step_write_sync_state

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
