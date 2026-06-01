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
  # Delegate memo-dir cleanup to the lib helper: it refuses to delete an
  # inherited / unowned BC_MEMO_DIR. Plain `rm -rf "$BC_MEMO_DIR"` would
  # nuke a caller-supplied path on early test failure.
  if type bc_memo_cleanup >/dev/null 2>&1; then
    bc_memo_cleanup
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

# ─── 10b. Agentic fp respects the safe/unsafe ignorePath boundary ──
# compute-cache-fp.js ignores per-worktree build outputs but MUST keep
# binary-affecting inputs (xcconfig, google-services.json, the bundled
# InpageBridgeWeb3 source) hashed. Verify both halves of that contract.
hdr "agentic fp respects ignorePath boundary"

_capture_fp() {
  bc_memo_cleanup 2>/dev/null || true
  bc_memo_init
  bc_fingerprint 2>/dev/null
}

FP_BASELINE=$(_capture_fp)
[ -n "$FP_BASELINE" ] && pass "baseline fp computed: ${FP_BASELINE:0:12}" \
  || fail "baseline fp empty"

# (a) Poisoning an IGNORED path must NOT change fp.
mkdir -p ios/build
POISON_IGNORED="ios/build/__bc_test_poison_$$.bin"
echo "poison-$RANDOM" > "$POISON_IGNORED"
FP_IGNORED=$(_capture_fp)
rm -f "$POISON_IGNORED"
if [ "$FP_BASELINE" = "$FP_IGNORED" ]; then
  pass "ignored ios/build/ poison did NOT shift fp"
else
  fail "ignored ios/build/ poison SHIFTED fp (drift): $FP_BASELINE -> $FP_IGNORED"
fi

# Restore-trapped poison helper: backs up the file, layers a temporary
# EXIT trap that restores the file AND re-invokes the suite-level cleanup,
# then restores the original suite-level trap before returning. Ensures
# .agent/build-cache cleanup still runs on early abort inside the helper.
_poison_must_shift_fp() {
  local label="$1" path="$2"
  if [ ! -f "$path" ]; then
    fail "missing $path — cannot run boundary test"
    return
  fi
  local bak="/tmp/__bc_test_$(basename "$path")_$$.bak"
  cp "$path" "$bak"
  # Capture the suite-level EXIT trap so we can re-install it after.
  local prev_trap
  prev_trap=$(trap -p EXIT)
  trap "cp '$bak' '$path' 2>/dev/null; rm -f '$bak' 2>/dev/null; cleanup" EXIT
  echo "// __bc_test_poison_$$ $RANDOM" >> "$path"
  local fp_after
  fp_after=$(_capture_fp)
  cp "$bak" "$path"
  rm -f "$bak"
  # Restore the suite-level cleanup trap.
  eval "${prev_trap:-trap - EXIT}"
  if [ "$fp_after" != "$FP_BASELINE" ]; then
    pass "$label DID shift fp (${fp_after:0:12})"
  else
    fail "$label was silently ignored — cache could serve stale binary"
  fi
}

# (b) Poisoning a HASHED, binary-affecting path MUST change fp.
_poison_must_shift_fp "InpageBridgeWeb3.js (bridge source)" "app/core/InpageBridgeWeb3.js"

# (c) Poisoning an inherited project extraSource MUST change fp — proves
# the script repeats fingerprint.config.js extraSources correctly.
_poison_must_shift_fp "scripts/setup.mjs (project extraSource)" "scripts/setup.mjs"

# Restore baseline state for the rest of the suite.
_capture_fp >/dev/null

# ─── 11. Memo cleanup refuses inherited / unowned BC_MEMO_DIR ──────
# Across R6/R7/R8/R9 codex flagged five attack shapes against the memo
# directory cleanup. Each scenario sets up a "victim" dir, hands its path
# to a child shell via env, runs a code path that previously deleted the
# dir, and asserts the dir + its contents survive.
hdr "memo cleanup refuses inherited / unowned BC_MEMO_DIR"
_memo_attack() {
  local label="$1" extra_env="$2" sentinel="$3" body="$4"
  local victim
  victim=$(mktemp -d)
  echo keep > "$victim/please-keep-me"
  [ "$sentinel" = "yes" ] && : > "$victim/.bc_memo_owner"
  env BC_MEMO_DIR="$victim" $extra_env bash -c ". scripts/perps/agentic/lib/build-cache.sh; $body" >/dev/null 2>&1 || true
  if [ -d "$victim" ] && [ -f "$victim/please-keep-me" ]; then
    pass "$label"
  else
    fail "$label — victim dir was deleted"
  fi
  rm -rf "$victim"
}
# Five attack shapes — must all preserve the victim:
_memo_attack "R6: plain inherited dir + reset_memo"       ""                          no  "bc_fingerprint_reset_memo"
_memo_attack "R7: forged on-disk sentinel + reset_memo"   ""                          yes "bc_fingerprint_reset_memo"
_memo_attack "R8: forged env BC_MEMO_DIR_OWNED=1"         "BC_MEMO_DIR_OWNED=1"       no  "bc_fingerprint_reset_memo"
_memo_attack "R9A: direct bc_memo_init + bc_memo_cleanup" "BC_MEMO_DIR_OWNED=1"       no  "bc_memo_init; bc_memo_cleanup"
_memo_attack "R9B: EXIT cleanup on inherited memo"        ""                          no  "cleanup(){ bc_memo_cleanup; }; trap cleanup EXIT; false"

# ─── 12. Fast-mode strictness when fingerprint cannot be computed ───
# Codex R2 B3: --mode fast must hard-fail if the fingerprint command can't
# run, instead of silently falling through to the legacy build path.
hdr "preflight --mode fast / fingerprint failure"
FP_SCRIPT="scripts/perps/agentic/lib/compute-cache-fp.js"
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
