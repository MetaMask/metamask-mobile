#!/bin/bash
# preflight.sh — Prepare a clean, ready-to-code environment for a MetaMask Mobile worktree.
#
# This script runs BEFORE dispatching any Claude/Codex session. Zero tokens wasted on
# infrastructure. The agent gets a warm environment: Metro running, app launched, CDP live.
#
# Usage:
#   scripts/perps/agentic/preflight.sh [OPTIONS]
#
# Options:
#   --rebuild       Force rebuild with yarn build:ios:main:dev (default: skip if app exists)
#   --clean         Full clean: rm ios/build + DerivedData before rebuild (implies --rebuild)
#   --no-launch     Start Metro only, skip app launch
#   --check-only    Exit 0 if environment is ready, exit 1 if not (no changes)
#   --wallet <pw>   Unlock wallet after CDP is ready (default: reads MM_WALLET_PASSWORD env)
#
# Exit codes:
#   0 — environment ready (Metro running, CDP responding)
#   1 — environment not ready (with reason)
#
# Sources WATCHER_PORT from .js.env (default 8081).

set -euo pipefail

cd "$(dirname "$0")/../../.."
[ -f .js.env ] && source .js.env

PORT="${WATCHER_PORT:-8081}"
BUNDLE_ID="io.metamask.MetaMask"
SCRIPTS="scripts/perps/agentic"
LOGFILE=".agent/metro.log"
CDP_TIMEOUT=30
CDP_RETRY=0

# Flags
DO_REBUILD=false
DO_CLEAN=false
DO_LAUNCH=true
CHECK_ONLY=false
WALLET_PW="${MM_WALLET_PASSWORD:-}"

for arg in "$@"; do
  case "$arg" in
    --rebuild)    DO_REBUILD=true ;;
    --clean)      DO_CLEAN=true; DO_REBUILD=true ;;
    --no-launch)  DO_LAUNCH=false ;;
    --check-only) CHECK_ONLY=true ;;
    --wallet)     shift; WALLET_PW="$1" ;;
  esac
done

# ── Colors ──────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

echo "=== MetaMask Mobile Preflight (port $PORT) ==="

# ── Step 1: Simulator booted? ─────────────────────────────────────────
echo "→ Checking simulator..."
BOOTED=$(xcrun simctl list devices | grep "Booted" | head -1 || true)
if [ -z "$BOOTED" ]; then
  $CHECK_ONLY && fail "No booted simulator"
  # Boot the simulator whose UDID matches WATCHER_PORT assignment
  # (Developer: add your simulator UDID to .js.env as SIM_UDID)
  SIM_UDID="${SIM_UDID:-}"
  if [ -n "$SIM_UDID" ]; then
    echo "  Booting $SIM_UDID..."
    xcrun simctl boot "$SIM_UDID" 2>/dev/null || true
    sleep 3
    ok "Simulator booted"
  else
    fail "No booted simulator and SIM_UDID not set in .js.env"
  fi
else
  ok "Simulator booted: $(echo "$BOOTED" | sed 's/(Booted).*//' | xargs)"
fi

# ── Step 2: App installed? ────────────────────────────────────────────
echo "→ Checking app installation..."
APP_INSTALLED=$(xcrun simctl listapps booted 2>/dev/null | grep -c "$BUNDLE_ID" || true)
if [ "$APP_INSTALLED" -eq 0 ] || $DO_REBUILD; then
  $CHECK_ONLY && fail "App not installed (run with --rebuild)"
  if $DO_CLEAN; then
    echo "  Cleaning build artifacts..."
    rm -rf ios/build
    xcrun simctl erase booted 2>/dev/null || true
    warn "Simulator erased — wallet will need to be set up from scratch"
  fi
  echo "  Building app (this takes ~15-20 min)..."
  yarn build:ios:main:dev 2>&1 | tail -5
  ok "App built and installed"
else
  ok "App already installed"
fi

# ── Step 3: Metro running? ────────────────────────────────────────────
echo "→ Starting Metro on port $PORT..."
bash "$SCRIPTS/start-metro.sh" $($DO_LAUNCH && echo "--launch" || echo "")
ok "Metro running on port $PORT"

# ── Step 4: CDP reachable? ─────────────────────────────────────────────
echo "→ Waiting for CDP connection..."
while [ $CDP_RETRY -lt $CDP_TIMEOUT ]; do
  if node "$SCRIPTS/cdp-bridge.js" status 2>/dev/null | grep -q "connected\|ready\|ok" 2>/dev/null; then
    ok "CDP connected"
    break
  fi
  sleep 1
  CDP_RETRY=$((CDP_RETRY + 1))
  if [ $CDP_RETRY -eq 5 ]; then
    warn "  CDP not yet ready, waiting... (app may still be loading)"
  fi
done
if [ $CDP_RETRY -ge $CDP_TIMEOUT ]; then
  fail "CDP did not become available after ${CDP_TIMEOUT}s — is the app running and Metro connected?"
fi

# ── Step 5: Unlock wallet ─────────────────────────────────────────────
if [ -n "$WALLET_PW" ]; then
  echo "→ Unlocking wallet..."
  node "$SCRIPTS/cdp-bridge.js" unlock "$WALLET_PW" 2>/dev/null && ok "Wallet unlocked" || warn "Could not unlock wallet (may already be unlocked)"
else
  warn "Skipping wallet unlock (pass --wallet <pw> or set MM_WALLET_PASSWORD)"
fi

# ── Done ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Preflight complete — environment ready on port $PORT${NC}"
echo "   Metro:  http://localhost:$PORT/status"
echo "   Logs:   tail -f $LOGFILE"
echo "   CDP:    node $SCRIPTS/cdp-bridge.js status"
