#!/bin/bash
# Navigate the running MetaMask app to a specific screen via CDP bridge.
# After navigating, takes a verification screenshot.
#
# Usage:
#   scripts/agentic/app-navigate.sh <RouteName> [params-json]
#   scripts/agentic/app-navigate.sh PerpsHome
#   scripts/agentic/app-navigate.sh PerpsMarketDetails '{"symbol":"BTC"}'
#   scripts/agentic/app-navigate.sh WalletTabHome
#   scripts/agentic/app-navigate.sh SettingsView

set -euo pipefail

cd "$(dirname "$0")/../.."

ROUTE="${1:-}"
if [ -z "$ROUTE" ]; then
  echo "Usage: app-navigate.sh <RouteName> [params-json]"
  echo ""
  echo "Common routes:"
  echo "  WalletTabHome          Wallet home screen"
  echo "  PerpsMarketListView    Perps home (markets, positions)"
  echo "  PerpsMarketDetails     Perps market details (pass {\"symbol\":\"BTC\"})"
  echo "  SettingsView           Settings"
  echo "  BrowserTabHome         Browser"
  echo "  TransactionsView       Activity/transactions"
  echo "  TrendingView           Trending tokens"
  exit 1
fi

PARAMS="${2:-}"

# ── Navigate via CDP ────────────────────────────────────────────────────
echo "Navigating to $ROUTE..."
if [ -n "$PARAMS" ]; then
  RESULT=$(node scripts/agentic/cdp-bridge.js navigate "$ROUTE" "$PARAMS" 2>&1)
else
  RESULT=$(node scripts/agentic/cdp-bridge.js navigate "$ROUTE" 2>&1)
fi

echo "$RESULT"

# ── Wait for navigation to settle and take verification screenshot ──────
sleep 1

SCREENSHOT=$(scripts/agentic/screenshot.sh "nav-${ROUTE}" 2>&1) || true
if [ -n "$SCREENSHOT" ]; then
  echo "Screenshot: $SCREENSHOT"
fi
