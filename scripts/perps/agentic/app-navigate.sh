#!/bin/bash
# Navigate the running MetaMask app to a specific screen via CDP bridge.
# After navigating, takes a verification screenshot.
#
# Usage:
#   scripts/perps/agentic/app-navigate.sh <RouteName> [params-json]
#   scripts/perps/agentic/app-navigate.sh --no-screenshot <RouteName>
#   scripts/perps/agentic/app-navigate.sh PerpsMarketListView          # perps home
#   scripts/perps/agentic/app-navigate.sh PerpsTrendingView             # market list (all markets)
#   scripts/perps/agentic/app-navigate.sh PerpsMarketDetails '{"market":{"symbol":"BTC","name":"BTC","price":"0","change24h":"0","change24hPercent":"0","volume":"0","maxLeverage":"100"}}'
#   scripts/perps/agentic/app-navigate.sh WalletTabHome
#   scripts/perps/agentic/app-navigate.sh SettingsView

set -euo pipefail

cd "$(dirname "$0")/../../.."

# ── Parse flags ────────────────────────────────────────────────────────
# --list          Query the running app via CDP for all registered route names
# --no-screenshot Skip verification screenshot after navigating
NO_SCREENSHOT=false
DO_LIST=false
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --list)          DO_LIST=true ;;
    --no-screenshot) NO_SCREENSHOT=true ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done

# ── --list: dynamic route discovery via CDP fiber walk ─────────────────
if [ "$DO_LIST" = true ]; then
  CDP="node scripts/perps/agentic/cdp-bridge.js"

  # Walk the React fiber tree and collect routeNames from all mounted navigators.
  # Only navigators that are currently mounted appear — unlock the wallet first
  # to see the full set (Login screen only shows onboarding/modal routes).
  EXPR='(function(){
    var hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook || !hook.renderers) return JSON.stringify({error: "React DevTools hook not available"});
    var getFiberRoots = hook.getFiberRoots;
    if (!getFiberRoots) return JSON.stringify({error: "getFiberRoots not available"});
    var names = {};
    for (var [id] of hook.renderers) {
      var fiberRoots = getFiberRoots(id);
      if (!fiberRoots) continue;
      fiberRoots.forEach(function(root) {
        if (!root || !root.current) return;
        var queue = [root.current];
        var visited = 0;
        while (queue.length > 0 && visited < 15000) {
          var f = queue.shift();
          visited++;
          var pp = f.pendingProps;
          if (pp && pp.state && pp.state.routeNames) {
            var rn = pp.state.routeNames;
            for (var j = 0; j < rn.length; j++) names[rn[j]] = 1;
          }
          var mp = f.memoizedProps;
          if (mp && mp.state && mp.state.routeNames) {
            var rn2 = mp.state.routeNames;
            for (var j = 0; j < rn2.length; j++) names[rn2[j]] = 1;
          }
          if (f.child) queue.push(f.child);
          if (f.sibling) queue.push(f.sibling);
        }
      });
    }
    var sorted = Object.keys(names).sort();
    return JSON.stringify({count: sorted.length, routes: sorted});
  })()'

  RESULT=$($CDP eval "$EXPR" 2>&1) || { echo "ERROR: CDP not reachable — is Metro running and the app launched?" >&2; exit 1; }

  # Parse and output one route per line
  ERROR=$(echo "$RESULT" | node -p "try{var d=JSON.parse(JSON.parse(process.stdin.read()));d.error||''}catch(e){''}" 2>/dev/null || echo "")
  if [ -n "$ERROR" ]; then
    echo "ERROR: $ERROR" >&2
    exit 1
  fi

  echo "$RESULT" | node -e "
    var raw = '';
    process.stdin.on('data', function(c){ raw += c; });
    process.stdin.on('end', function(){
      try {
        var d = JSON.parse(JSON.parse(raw));
        if (d.error) { process.stderr.write('ERROR: ' + d.error + '\n'); process.exit(1); }
        d.routes.forEach(function(r){ console.log(r); });
      } catch(e) {
        process.stderr.write('ERROR: failed to parse CDP result\n');
        process.exit(1);
      }
    });
  "
  exit $?
fi

ROUTE="${POSITIONAL[0]:-}"
if [ -z "$ROUTE" ]; then
  echo "Usage: app-navigate.sh [--no-screenshot] [--list] <RouteName> [params-json]"
  echo ""
  echo "Options:"
  echo "  --list                 List all route names registered in the running app"
  echo "  --no-screenshot        Skip verification screenshot after navigating"
  echo ""
  echo "Common routes:"
  echo "  WalletTabHome          Wallet home screen"
  echo "  PerpsMarketListView    Perps home (positions, orders, watchlist)"
  echo "  PerpsTrendingView      Market list (all markets, full view)"
  echo "  PerpsMarketDetails     Perps market details"
  echo "  SettingsView           Settings"
  echo "  BrowserTabHome         Browser"
  echo "  TransactionsView       Activity/transactions"
  echo ""
  echo "Run --list to see all routes available in the running app."
  exit 1
fi

PARAMS="${POSITIONAL[1]:-}"

# ── Navigate via CDP ────────────────────────────────────────────────────
echo "Navigating to $ROUTE..."
if [ -n "$PARAMS" ]; then
  RESULT=$(node scripts/perps/agentic/cdp-bridge.js navigate "$ROUTE" "$PARAMS" 2>&1)
else
  RESULT=$(node scripts/perps/agentic/cdp-bridge.js navigate "$ROUTE" 2>&1)
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
    SCREENSHOT=$(PLATFORM="$PLATFORM_FLAG" scripts/perps/agentic/screenshot.sh "nav-${ROUTE}" 2>&1) || true
  else
    SCREENSHOT=$(scripts/perps/agentic/screenshot.sh "nav-${ROUTE}" 2>&1) || true
  fi

  if [ -n "$SCREENSHOT" ]; then
    echo "Screenshot: $SCREENSHOT"
  fi
fi
