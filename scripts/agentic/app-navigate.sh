#!/bin/bash
# Navigate the running MetaMask app to a specific screen via CDP bridge.
# After navigating, takes a verification screenshot.
#
# Usage:
#   scripts/agentic/app-navigate.sh <RouteName> [params-json]
#   scripts/agentic/app-navigate.sh --no-screenshot <RouteName>
#   scripts/agentic/app-navigate.sh PerpsMarketListView          # perps home
#   scripts/agentic/app-navigate.sh PerpsTrendingView             # market list (all markets)
#   scripts/agentic/app-navigate.sh PerpsMarketDetails '{"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}'
#   scripts/agentic/app-navigate.sh WalletTabHome
#   scripts/agentic/app-navigate.sh SettingsView

set -euo pipefail

cd "$(dirname "$0")/../.."

# ── Parse flags ────────────────────────────────────────────────────────
NO_SCREENSHOT=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --no-screenshot) NO_SCREENSHOT=true ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

ROUTE="${POSITIONAL[0]:-}"
if [ -z "$ROUTE" ]; then
  echo "Usage: app-navigate.sh [--no-screenshot] <RouteName> [params-json]"
  echo ""
  echo "Options:"
  echo "  --no-screenshot        Skip verification screenshot after navigating"
  echo ""
  echo "Common routes:"
  echo "  WalletTabHome          Wallet home screen"
  echo "  PerpsMarketListView    Perps home (positions, orders, watchlist)"
  echo "  PerpsTrendingView      Market list (all markets, full view)"
  echo "  PerpsMarketDetails     Perps market details (pass {\"market\":{\"symbol\":\"BTC\",\"name\":\"BTC\",\"price\":\"0\",\"change24h\":\"0\",\"change24hPercent\":\"0\",\"volume\":\"0\",\"maxLeverage\":\"100\"}})"
  echo "  SettingsView           Settings"
  echo "  BrowserTabHome         Browser"
  echo "  TransactionsView       Activity/transactions"
  echo "  TrendingView           Trending tokens"
  exit 1
fi

PARAMS="${POSITIONAL[1]:-}"

# ── Navigate via CDP ────────────────────────────────────────────────────
echo "Navigating to $ROUTE..."
if [ -n "$PARAMS" ]; then
  RESULT=$(node scripts/agentic/cdp-bridge.js navigate "$ROUTE" "$PARAMS" 2>&1)
else
  RESULT=$(node scripts/agentic/cdp-bridge.js navigate "$ROUTE" 2>&1)
fi

# ── Display route change summary ──────────────────────────────────────
PREV_ROUTE=$(echo "$RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('previousRoute')
print(r.get('name','?') if isinstance(r,dict) else r or '?')
" 2>/dev/null || echo "?")

CURR_ROUTE=$(echo "$RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('currentRoute')
print(r.get('name','?') if isinstance(r,dict) else r or '?')
" 2>/dev/null || echo "?")

if [ "$PREV_ROUTE" = "$CURR_ROUTE" ]; then
  echo "Route: $PREV_ROUTE → $CURR_ROUTE (no change)"
else
  echo "Route: $PREV_ROUTE → $CURR_ROUTE"
fi

echo "$RESULT"

# ── Wait for navigation to settle and take verification screenshot ──────
if [ "$NO_SCREENSHOT" = true ]; then
  echo "Screenshot skipped (--no-screenshot)"
else
  sleep 1

  # Determine platform from the app's Platform.OS (returned by cdp-bridge)
  PLATFORM_FLAG=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('platform',''))" 2>/dev/null || echo "")

  if [ -n "$PLATFORM_FLAG" ]; then
    SCREENSHOT=$(PLATFORM="$PLATFORM_FLAG" scripts/agentic/screenshot.sh "nav-${ROUTE}" 2>&1) || true
  else
    SCREENSHOT=$(scripts/agentic/screenshot.sh "nav-${ROUTE}" 2>&1) || true
  fi

  if [ -n "$SCREENSHOT" ]; then
    echo "Screenshot: $SCREENSHOT"
  fi
fi
