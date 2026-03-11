#!/bin/bash
# preflight.sh — Prepare a clean, ready-to-code environment for a MetaMask Mobile worktree.
#
# This script runs BEFORE dispatching any Claude/Codex session. Zero tokens wasted on
# infrastructure. The agent gets a warm environment: Metro running, app launched, CDP live,
# wallet configured.
#
# Full clean flow (--clean):
#   yarn setup → build app natively → boot sim → launch → CDP → setup-wallet
#
# Usage:
#   scripts/perps/agentic/preflight.sh [OPTIONS]
#
# Options:
#   --rebuild          Force rebuild with yarn build:ios:main:dev (skip if app exists)
#   --clean            Full clean env: yarn setup + rm ios/build + erase sim + rebuild (implies --rebuild)
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
#   1. Add SIM_UDID and WATCHER_PORT to .js.env
#   2. Create .agent/wallet-fixture.json (see setup-wallet.sh --help)
#   3. Run: scripts/perps/agentic/preflight.sh --clean --wallet-setup
#
# Sources WATCHER_PORT and SIM_UDID from .js.env (default port: 8081).

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
DO_WALLET_SETUP=false
WALLET_FIXTURE="${WALLET_FIXTURE:-.agent/wallet-fixture.json}"
WALLET_PW="${MM_WALLET_PASSWORD:-}"

for arg in "$@"; do
  case "$arg" in
    --rebuild)        DO_REBUILD=true ;;
    --clean)          DO_CLEAN=true; DO_REBUILD=true ;;
    --no-launch)      DO_LAUNCH=false ;;
    --check-only)     CHECK_ONLY=true ;;
    --wallet-setup)   DO_WALLET_SETUP=true ;;
    --wallet-fixture) shift; WALLET_FIXTURE="$1" ;;
    --wallet)         shift; WALLET_PW="$1" ;;
  esac
done

# ── Colors ──────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; exit 1; }

echo "=== MetaMask Mobile Preflight (port $PORT) ==="

# ── Step 1: Full clean (optional) ─────────────────────────────────────
if $DO_CLEAN; then
  echo "→ Full clean environment..."
  echo "  Running yarn setup (install deps + patches)..."
  yarn setup 2>&1 | tail -3
  ok "yarn setup complete"
fi

# ── Step 2: Simulator booted? ─────────────────────────────────────────
echo "→ Checking simulator..."
BOOTED=$(xcrun simctl list devices | grep "Booted" | head -1 || true)
if [ -z "$BOOTED" ]; then
  $CHECK_ONLY && fail "No booted simulator"
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

# ── Step 3: App installed? (or rebuild) ───────────────────────────────
echo "→ Checking app installation..."
APP_INSTALLED=$(xcrun simctl listapps booted 2>/dev/null | grep -c "$BUNDLE_ID" || true)
if [ "$APP_INSTALLED" -eq 0 ] || $DO_REBUILD; then
  $CHECK_ONLY && fail "App not installed (run with --rebuild)"
  if $DO_CLEAN; then
    echo "  Cleaning iOS build artifacts..."
    rm -rf ios/build
    xcrun simctl erase booted 2>/dev/null || true
    warn "Simulator erased — wallet-setup will configure accounts from scratch"
    DO_WALLET_SETUP=true  # force wallet setup after clean install
  fi
  echo "  Building app natively (yarn build:ios:main:dev — ~15-20 min)..."
  yarn build:ios:main:dev 2>&1 | tail -5
  ok "App built and installed"
else
  ok "App already installed"
fi

# ── Step 4: Metro running? ────────────────────────────────────────────
echo "→ Starting Metro on port $PORT..."
bash "$SCRIPTS/start-metro.sh" $($DO_LAUNCH && echo "--launch" || echo "")
ok "Metro running on port $PORT"

# ── Step 5: CDP reachable? ────────────────────────────────────────────
echo "→ Waiting for CDP connection..."
while [ $CDP_RETRY -lt $CDP_TIMEOUT ]; do
  if node "$SCRIPTS/cdp-bridge.js" status 2>/dev/null | grep -q "connected\|ready\|ok" 2>/dev/null; then
    ok "CDP connected"
    break
  fi
  sleep 1
  CDP_RETRY=$((CDP_RETRY + 1))
  [ $CDP_RETRY -eq 5 ] && warn "  CDP not yet ready, waiting... (app may still be loading)"
done
[ $CDP_RETRY -ge $CDP_TIMEOUT ] && fail "CDP did not become available after ${CDP_TIMEOUT}s"

# ── Step 6: Wallet setup ──────────────────────────────────────────────
if $DO_WALLET_SETUP; then
  echo "→ Setting up wallet from fixture..."
  FIXTURE_FLAG=""
  [ "$WALLET_FIXTURE" != ".agent/wallet-fixture.json" ] && FIXTURE_FLAG="--fixture $WALLET_FIXTURE"
  if [ -f "$WALLET_FIXTURE" ] || [ -n "$FIXTURE_FLAG" ]; then
    bash "$SCRIPTS/setup-wallet.sh" $FIXTURE_FLAG && ok "Wallet configured from fixture" || warn "Wallet setup failed — check fixture file"
  else
    warn "No wallet fixture found at $WALLET_FIXTURE — skipping (create .agent/wallet-fixture.json to enable)"
  fi
elif [ -n "$WALLET_PW" ]; then
  echo "→ Unlocking wallet..."
  node "$SCRIPTS/cdp-bridge.js" unlock "$WALLET_PW" 2>/dev/null && ok "Wallet unlocked" || warn "Could not unlock wallet"
else
  warn "Skipping wallet setup (use --wallet-setup or --wallet <pw>)"
fi

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Preflight complete — environment ready on port $PORT${NC}"
echo "   Metro:    http://localhost:$PORT/status"
echo "   Logs:     tail -f $LOGFILE"
echo "   CDP:      node $SCRIPTS/cdp-bridge.js status"
echo ""
echo "   Full clean next time:  preflight.sh --clean --wallet-setup"
echo "   Quick check:           preflight.sh --check-only"
