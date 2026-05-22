#!/bin/bash
# Read-only e2e for preflight --mode auto cache-hit Path 1.
#
# Plants a synthetic installed.json claiming the current fingerprint is
# already installed on the booted simulator, then runs preflight and
# verifies it logs "Cache: installed app matches fingerprint" and skips
# the native build branch. Does NOT uninstall, modify, or rebuild anything
# on the sim — purely tests that the decision branch fires.
#
# Idempotent: stashes/restores any pre-existing .agent/build-cache.
# Requires: a booted iOS simulator with MetaMask already installed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$REPO_ROOT"

# Find a booted simulator that already has MetaMask installed. Iterate all
# booted sims so the test works regardless of which one .js.env points at.
BOOTED_UDID=""
BOOTED_NAME=""
while IFS= read -r line; do
  udid=$(echo "$line" | awk -F'[()]' '{print $2}')
  name=$(echo "$line" | sed -E 's/^[[:space:]]*//; s/ \(.*//')
  if [ -n "$udid" ] && xcrun simctl listapps "$udid" 2>/dev/null | grep -q "io.metamask.MetaMask"; then
    BOOTED_UDID="$udid"
    BOOTED_NAME="$name"
    break
  fi
done < <(xcrun simctl list devices 2>/dev/null | grep "Booted")

if [ -z "$BOOTED_UDID" ]; then
  echo "SKIP: no booted iOS simulator with MetaMask installed — run 'yarn a:setup:ios' first" >&2
  exit 0
fi
echo "Booted sim: $BOOTED_NAME ($BOOTED_UDID) — MetaMask present"

# Override .js.env sim selection so preflight inspects the right sim.
export IOS_SIMULATOR="$BOOTED_NAME"
export SIM_UDID="$BOOTED_UDID"

export MM_BUILD_CACHE_DIR="/tmp/mm-bc-e2e-$$"
rm -rf "$MM_BUILD_CACHE_DIR"

SIDE_BACKUP=""
if [ -d .agent/build-cache ]; then
  SIDE_BACKUP="/tmp/mm-bc-e2e-sidecar-$$"
  mv .agent/build-cache "$SIDE_BACKUP"
fi
PIDFILE_BACKUP=""
if [ -f .agent/metro.pid ]; then
  PIDFILE_BACKUP="/tmp/mm-bc-e2e-metropid-$$"
  cp .agent/metro.pid "$PIDFILE_BACKUP"
fi
cleanup() {
  rm -rf "$MM_BUILD_CACHE_DIR" 2>/dev/null || true
  rm -rf .agent/build-cache 2>/dev/null || true
  [ -n "$SIDE_BACKUP" ] && [ -d "$SIDE_BACKUP" ] && mv "$SIDE_BACKUP" .agent/build-cache
  [ -n "$PIDFILE_BACKUP" ] && [ -f "$PIDFILE_BACKUP" ] && mv "$PIDFILE_BACKUP" .agent/metro.pid
}
trap cleanup EXIT

# shellcheck disable=SC1091
. scripts/perps/agentic/lib/build-cache.sh

FP=$(bc_fingerprint)
echo "Current fingerprint: ${FP:0:16}..."

FAILED=0
pass() { printf "  \033[32mPASS\033[0m %s\n" "$1"; }
fail() { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAILED=1; }

printf "\n\033[1m== Path 1: installed.json matches current fingerprint ==\033[0m\n"
mkdir -p .agent/build-cache/ios
bc_record_install ios "$FP" "$BOOTED_UDID"

LOG="/tmp/mm-bc-e2e-log-$$"
set +e
(
  timeout 30 bash scripts/perps/agentic/preflight.sh --mode auto --platform ios --no-launch 2>&1
) > "$LOG" &
PID=$!
# Watch the log; the success marker should appear within the simulator-check
# + app-check phases (well before Metro start).
for _ in $(seq 1 30); do
  if grep -q "Cache: installed app matches fingerprint" "$LOG" 2>/dev/null; then break; fi
  if ! kill -0 "$PID" 2>/dev/null; then break; fi
  sleep 1
done
kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
set -e

if grep -q "Cache: installed app matches fingerprint ${FP:0:12}" "$LOG"; then
  pass "preflight recognized installed-app fp match"
else
  fail "expected 'Cache: installed app matches fingerprint ${FP:0:12}' in log:"
  tail -50 "$LOG" | sed 's/^/      /'
fi

if grep -qE "Running pod install|expo run:ios|Building \+ installing app" "$LOG"; then
  fail "preflight unexpectedly entered the build branch"
else
  pass "build branch was skipped (no pod/xcodebuild)"
fi

# Verify app is still present (we didn't break the sim).
POST_COUNT=$(xcrun simctl listapps "$BOOTED_UDID" 2>/dev/null | grep -c "io.metamask.MetaMask" || true)
if [ "$POST_COUNT" -gt 0 ]; then
  pass "MetaMask still installed on sim post-test (no destructive ops)"
else
  fail "MetaMask vanished from sim — test should have been read-only"
fi
rm -f "$LOG"

echo ""
if [ "$FAILED" -eq 0 ]; then
  printf "\033[1;32m=== E2E PATH 1 TEST PASSED ===\033[0m\n"
  exit 0
else
  printf "\033[1;31m=== E2E TEST FAILED ===\033[0m\n"
  exit 1
fi
