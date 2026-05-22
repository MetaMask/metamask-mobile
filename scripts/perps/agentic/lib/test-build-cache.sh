#!/bin/bash
# Smoke test for scripts/perps/agentic/lib/build-cache.sh + preflight --mode plumbing.
# Idempotent: uses a throwaway shared-cache dir and restores any pre-existing
# .agent/build-cache after running. Safe to invoke repeatedly.
#
# Usage:
#   bash scripts/perps/agentic/lib/test-build-cache.sh
set -euo pipefail

# Run from repo root regardless of caller cwd.
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$REPO_ROOT"

# Use a throwaway shared cache so we never touch the user's real ~/.../mm-mobile-builds.
export MM_BUILD_CACHE_DIR="/tmp/mm-bc-test-$$"
rm -rf "$MM_BUILD_CACHE_DIR"

# Stash any real sidecar so the test can scribble on .agent/build-cache.
SIDE_BACKUP=""
if [ -d .agent/build-cache ]; then
  SIDE_BACKUP="/tmp/mm-bc-sidecar-backup-$$"
  mv .agent/build-cache "$SIDE_BACKUP"
fi
cleanup() {
  rm -rf "$MM_BUILD_CACHE_DIR" .agent/build-cache 2>/dev/null || true
  if [ -n "${BC_MEMO_DIR:-}" ] && [ -d "$BC_MEMO_DIR" ]; then
    rm -rf "$BC_MEMO_DIR" 2>/dev/null || true
  fi
  if [ -n "$SIDE_BACKUP" ] && [ -d "$SIDE_BACKUP" ]; then
    mv "$SIDE_BACKUP" .agent/build-cache
  fi
}
trap cleanup EXIT

# shellcheck disable=SC1091
. scripts/perps/agentic/lib/build-cache.sh

FAILED=0
pass() { printf "  \033[32mPASS\033[0m %s\n" "$1"; }
fail() { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAILED=1; }
hdr()  { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

# Portable bounded capture: runs the command and captures combined stdout+stderr,
# killing it if it exceeds $1 seconds. Avoids the GNU `timeout` binary which is
# not in base macOS. Echoes whatever the command produced before the watchdog
# fired.
_capture_for() {
  local secs="$1"; shift
  local out_file
  out_file=$(mktemp -t mm-bc-capture)
  "$@" >"$out_file" 2>&1 &
  local pid=$!
  ( sleep "$secs" && kill "$pid" 2>/dev/null ) &
  local watcher=$!
  wait "$pid" 2>/dev/null
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null
  cat "$out_file"
  rm -f "$out_file"
}

# ─── 1. Path helpers ────────────────────────────────────────────────
hdr "path helpers"
[ "$(bc_root)" = "$MM_BUILD_CACHE_DIR" ] && pass "bc_root respects MM_BUILD_CACHE_DIR" || fail "bc_root: $(bc_root)"
[ "$(bc_plat_dir ios)" = "$MM_BUILD_CACHE_DIR/ios" ] && pass "bc_plat_dir ios" || fail "bc_plat_dir ios"
[ "$(bc_artifact_path ios abc123)" = "$MM_BUILD_CACHE_DIR/ios/abc123.app" ] && pass "bc_artifact_path ios → .app" || fail "ios artifact path"
[ "$(bc_artifact_path android abc123)" = "$MM_BUILD_CACHE_DIR/android/abc123.apk" ] && pass "bc_artifact_path android → .apk" || fail "android artifact path"

# ─── 2. Init dirs idempotent ────────────────────────────────────────
hdr "bc_init_dirs"
bc_init_dirs ios
bc_init_dirs ios   # second call must not error
[ -d "$MM_BUILD_CACHE_DIR/ios" ] && pass "shared dir created" || fail "shared dir missing"
[ -d ".agent/build-cache/ios" ] && pass "sidecar dir created" || fail "sidecar dir missing"

# ─── 3. Fingerprint ─────────────────────────────────────────────────
hdr "bc_fingerprint"
unset BUILD_CACHE_FP
FP1=$(bc_fingerprint)
FP2=$(bc_fingerprint)   # should hit memoized value
if [ -n "$FP1" ] && [ "${#FP1}" -gt 20 ] && [ "$FP1" = "$FP2" ]; then
  pass "fingerprint stable: ${FP1:0:16}..."
else
  fail "fingerprint unstable or empty: [$FP1] vs [$FP2]"
fi

# ─── 4. Store + lookup round-trip ───────────────────────────────────
hdr "bc_store_artifact + bc_has_artifact"
TEST_FP="testfp1234567890"
SRC="/tmp/mm-bc-fake-app-$$"
rm -rf "$SRC"
mkdir -p "$SRC"
# bc_has_artifact validity check requires Info.plist at the .app root.
echo "<?xml version=\"1.0\"?><plist><dict></dict></plist>" > "$SRC/Info.plist"
bc_store_artifact ios "$TEST_FP" "$SRC"
[ -e "$(bc_artifact_path ios "$TEST_FP")" ] && pass "artifact stored at expected path" || fail "artifact not at expected path"
bc_has_artifact ios "$TEST_FP" && pass "bc_has_artifact returns true on hit" || fail "bc_has_artifact missed"
bc_has_artifact ios "nonexistent_fp" && fail "bc_has_artifact wrongly hits" || pass "bc_has_artifact returns false on miss"
[ -e "$(bc_meta_path ios "$TEST_FP")" ] && pass "meta.json written" || fail "meta.json missing"

# ─── 5. installed.json round-trip ───────────────────────────────────
hdr "installed.json"
bc_record_install ios "$TEST_FP" "Simulator-XYZ"
[ "$(bc_installed_fp ios)" = "$TEST_FP" ] && pass "bc_installed_fp returns recorded fp" || fail "bc_installed_fp mismatch: $(bc_installed_fp ios)"

# ─── 6. Re-store overwrites atomically ──────────────────────────────
hdr "atomic overwrite"
echo "<?xml version=\"1.0\"?><plist>v2</plist>" > "$SRC/Info.plist"
bc_store_artifact ios "$TEST_FP" "$SRC"
GOT=$(cat "$(bc_artifact_path ios "$TEST_FP")/Info.plist")
echo "$GOT" | grep -q "v2" && pass "re-store overwrites contents" || fail "re-store did not overwrite: got '$GOT'"

# ─── 7. Lock — serialized within one shell ──────────────────────────
hdr "bc_with_lock (sequential)"
LOG="/tmp/mm-bc-lock-log-$$"
: > "$LOG"
bc_with_lock ios "lockfp1" sh -c "echo A >> $LOG; sleep 0.2; echo B >> $LOG"
bc_with_lock ios "lockfp1" sh -c "echo C >> $LOG"
[ "$(tr -d '[:space:]' < "$LOG")" = "ABC" ] && pass "sequential lock acquire/release" || fail "sequential lock order: $(cat "$LOG")"
rm -f "$LOG"

# ─── 8. Lock — concurrent (one waits for the other) ─────────────────
hdr "bc_with_lock (concurrent)"
LOG="/tmp/mm-bc-lock-conc-log-$$"
: > "$LOG"
BUILD_CACHE_LOCK_TIMEOUT=10 bc_with_lock ios "lockfp2" sh -c "echo start1 >> $LOG; sleep 1; echo end1 >> $LOG" &
PID1=$!
sleep 0.1
BUILD_CACHE_LOCK_TIMEOUT=10 bc_with_lock ios "lockfp2" sh -c "echo start2 >> $LOG; echo end2 >> $LOG" &
PID2=$!
wait $PID1 $PID2
LINES=$(tr '\n' ' ' < "$LOG")
case "$LINES" in
  "start1 end1 start2 end2 ") pass "concurrent: second waited for first" ;;
  *) fail "concurrent lock ordering wrong: $LINES" ;;
esac
rm -f "$LOG"

# ─── 9. Prune keeps N newest ────────────────────────────────────────
hdr "bc_prune"
# Clear prior artifacts so only prune-fp-* exist in the cache.
rm -rf "$MM_BUILD_CACHE_DIR/ios"/*.app "$MM_BUILD_CACHE_DIR/ios"/*.meta.json 2>/dev/null || true
for i in 1 2 3 4 5 6 7; do
  FP="prune-fp-$i"
  D="$(bc_artifact_path ios "$FP")"
  mkdir -p "$D"
  echo "x" > "$D/marker"
  printf '{}' > "$(bc_meta_path ios "$FP")"
  # YYYYMMDDhhmm — use distinct days so mtimes are unambiguously ordered.
  touch -t "2024010${i}1200" "$D" "$(bc_meta_path ios "$FP")" 2>/dev/null || true
done
bc_prune ios 3
REMAINING=$(find "$MM_BUILD_CACHE_DIR/ios" -maxdepth 1 -name "prune-fp-*.app" | wc -l | tr -d ' ')
if [ "$REMAINING" = "3" ]; then
  pass "bc_prune keeps exactly 3 (got $REMAINING)"
else
  fail "bc_prune kept $REMAINING (expected 3)"
fi
for keep in 5 6 7; do
  [ -d "$MM_BUILD_CACHE_DIR/ios/prune-fp-${keep}.app" ] && pass "kept newest: prune-fp-${keep}" || fail "newest dropped: prune-fp-${keep}"
done

# ─── 10. Preflight --mode plumbing ──────────────────────────────────
hdr "preflight --mode arg parsing"
out=$(bash scripts/perps/agentic/preflight.sh --mode invalid --check-only 2>&1 || true)
echo "$out" | grep -q "unknown --mode 'invalid'" && pass "unknown --mode rejected" || fail "unknown mode not rejected: $out"

out=$(_capture_for 10 bash scripts/perps/agentic/preflight.sh --mode fast --check-only 2>&1 | head -20 || true)
echo "$out" | grep -qE "Mode:.*fast.*no build" && pass "fast mode header rendered" || fail "fast mode header missing"

out=$(_capture_for 10 bash scripts/perps/agentic/preflight.sh --mode auto --check-only 2>&1 | head -20 || true)
echo "$out" | grep -qE "Mode:.*auto.*fingerprint-gated" && pass "auto mode header rendered" || fail "auto mode header missing"

out=$(_capture_for 10 bash scripts/perps/agentic/preflight.sh --mode rebuild-native --check-only 2>&1 | head -20 || true)
echo "$out" | grep -qE "Mode:.*rebuild-native" && pass "rebuild-native mode header rendered" || fail "rebuild-native mode header missing"

out=$(_capture_for 10 bash scripts/perps/agentic/preflight.sh --mode clean --check-only 2>&1 | head -20 || true)
echo "$out" | grep -qE "Mode:.*clean.*yarn setup" && pass "clean mode header rendered" || fail "clean mode header missing"

# Legacy --clean still maps to clean mode (back-compat)
out=$(_capture_for 10 bash scripts/perps/agentic/preflight.sh --clean --check-only 2>&1 | head -20 || true)
echo "$out" | grep -qE "Mode:.*clean.*yarn setup" && pass "legacy --clean still maps to clean" || fail "legacy --clean broken"

# ─── 11. Memo cleanup refuses inherited / unowned BC_MEMO_DIR ──────
# Codex R6 caught that an inherited BC_MEMO_DIR was being rm -rf'd by
# bc_fingerprint_reset_memo. Verify the sentinel-guarded cleanup leaves
# foreign dirs alone.
hdr "memo cleanup refuses inherited dir"
VICTIM_DIR=$(mktemp -d)
echo "important content" > "$VICTIM_DIR/please-keep-me"
BC_MEMO_DIR="$VICTIM_DIR" bash -c '
  . scripts/perps/agentic/lib/build-cache.sh
  bc_fingerprint_reset_memo
' >/dev/null 2>&1
if [ -d "$VICTIM_DIR" ] && [ -f "$VICTIM_DIR/please-keep-me" ]; then
  pass "bc_fingerprint_reset_memo did not delete inherited BC_MEMO_DIR"
else
  fail "bc_fingerprint_reset_memo deleted attacker-controlled BC_MEMO_DIR"
fi
rm -rf "$VICTIM_DIR"

# ─── 12. Fast-mode strictness when fingerprint cannot be computed ───
# Codex R2 B3: --mode fast must hard-fail if the fingerprint command can't
# run, instead of silently falling through to the legacy build path.
hdr "preflight --mode fast / fingerprint failure"
FP_SCRIPT="scripts/generate-fingerprint.js"
FP_BACKUP="${FP_SCRIPT}.test-bak-$$"
mv "$FP_SCRIPT" "$FP_BACKUP"
restore_fp() { [ -f "$FP_BACKUP" ] && mv "$FP_BACKUP" "$FP_SCRIPT" 2>/dev/null || true; }
# Augment trap so we restore even on test failure.
trap '
  rm -rf "$MM_BUILD_CACHE_DIR" .agent/build-cache 2>/dev/null || true
  if [ -n "$SIDE_BACKUP" ] && [ -d "$SIDE_BACKUP" ]; then
    mv "$SIDE_BACKUP" .agent/build-cache
  fi
  restore_fp
' EXIT

out=$(_capture_for 20 bash scripts/perps/agentic/preflight.sh --mode fast --platform ios --no-launch 2>&1 || true)
restore_fp
echo "$out" | grep -q "Mode 'fast': could not compute fingerprint" \
  && pass "--mode fast fails loud when fingerprint cannot be computed" \
  || fail "--mode fast did not fail loud on fingerprint failure: $(echo "$out" | tail -5)"

echo ""
if [ "$FAILED" -eq 0 ]; then
  printf "\033[1;32m=== ALL TESTS PASSED ===\033[0m\n"
  exit 0
else
  printf "\033[1;31m=== TESTS FAILED ===\033[0m\n"
  exit 1
fi
