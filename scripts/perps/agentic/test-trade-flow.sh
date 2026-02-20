#!/bin/bash
set -euo pipefail
# scripts/perps/agentic/test-trade-flow.sh
# End-to-end trade flow validation — configurable for any scenario.
#
# Validates TAT-2597 (position doesn't appear after trade) and
# TAT-2598 (missing 24h change, oracle price, can't trade) by:
#   1. Placing a real order via PerpsController
#   2. Monitoring [PERPS_DEBUG] logs for WS data flow
#   3. Comparing pre/post position counts
#
# Prerequisites:
#   - Metro running, device connected, app open
#   - Engine exposed on globalThis (dev builds via __AGENTIC__ bridge)
#
# Usage:
#   scripts/perps/agentic/test-trade-flow.sh                          # BTC long $10
#   SYMBOL=ETH SIDE=sell ORDER_TYPE=limit LIMIT_PRICE=2100 \
#     scripts/perps/agentic/test-trade-flow.sh
#   SYMBOL=SOL SIZE=0.06 USD_AMOUNT=5 SKIP_CLOSE=1 \
#     scripts/perps/agentic/test-trade-flow.sh
#   SKIP_NAV=1 scripts/perps/agentic/test-trade-flow.sh              # Already on Perps

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../../.."

PLATFORM="${PLATFORM:-android}"
SYMBOL="${SYMBOL:-${1:-BTC}}"
SIDE="${SIDE:-buy}"
SIZE="${SIZE:-0.0001}"
USD_AMOUNT="${USD_AMOUNT:-10}"
LEVERAGE="${LEVERAGE:-2}"
ORDER_TYPE="${ORDER_TYPE:-market}"
LIMIT_PRICE="${LIMIT_PRICE:-}"
SLIPPAGE="${SLIPPAGE:-500}"
SKIP_CLOSE="${SKIP_CLOSE:-}"
SKIP_NAV="${SKIP_NAV:-}"
WAIT_SECS="${WAIT_SECS:-5}"

IS_BUY=$( [ "$SIDE" = "buy" ] && echo "true" || echo "false" )
METRO_LOG=".agent/metro.log"
PASS=true

# Helper: eval async JS expression via CDP bridge
eval_async() {
  "$SCRIPT_DIR/app-state.sh" eval-async "$@"
}

echo "=== TRADE FLOW TEST ==="
echo "Symbol: $SYMBOL | Side: $SIDE | Size: $SIZE | USD: $USD_AMOUNT"
echo "Leverage: ${LEVERAGE}x | Type: $ORDER_TYPE | Slippage: ${SLIPPAGE}bps"
echo ""

# 1. Verify Engine is accessible
echo "[0/9] Checking Engine availability..."
ENGINE_CHECK=$("$SCRIPT_DIR/app-state.sh" eval "typeof Engine !== 'undefined' && typeof Engine.context !== 'undefined'" 2>&1) || ENGINE_CHECK="false"
if [ "$ENGINE_CHECK" != "true" ]; then
  echo "ERROR: Engine not available in CDP context."
  echo "  Make sure the app is running a dev build with the agentic bridge."
  echo "  Engine check returned: $ENGINE_CHECK"
  exit 1
fi
echo "  Engine available"

# 2. Navigate (optional)
if [ -z "$SKIP_NAV" ]; then
  echo "[1/9] Navigating to Perps..."
  PLATFORM=$PLATFORM "$SCRIPT_DIR/app-navigate.sh" PerpsMarketListView --no-screenshot || true
  sleep 3
else
  echo "[1/9] Skipping navigation (SKIP_NAV set)"
fi

# 3. Mark log position for later filtering
LOG_MARKER=$(wc -l < "$METRO_LOG" 2>/dev/null | tr -d ' ' || echo 0)

# 4. Pre-trade state
echo "[2/9] Capturing pre-trade state..."
PRE_STATE=$(eval_async "
  Promise.all([
    Engine.context.PerpsController.getPositions(),
    Engine.context.PerpsController.getAccountState()
  ]).then(function(results) {
    var p = results[0]; var a = results[1];
    return JSON.stringify({
      positionCount: p.length,
      symbols: p.map(function(x) { return x.symbol; }),
      balance: a && a.withdrawable ? a.withdrawable : 'unknown'
    });
  })
") || PRE_STATE='{"error":"failed to get pre-state"}'
echo "  Pre-trade: $PRE_STATE"
PRE_COUNT=$(echo "$PRE_STATE" | python3 -c "
import sys,json
raw = json.load(sys.stdin)
# Handle double-encoded JSON (string containing JSON)
if isinstance(raw, str):
    raw = json.loads(raw)
print(raw.get('positionCount', 0))
" 2>/dev/null || echo 0)

# 5. Fetch price
echo "[3/9] Fetching current price for $SYMBOL..."
PRICE=$(eval_async "
  Engine.context.PerpsController.getMarketDataWithPrices().then(function(m) {
    var mkt = m.find(function(x) { return x.symbol === '$SYMBOL' || x.name === '$SYMBOL'; });
    return mkt ? (mkt.price || mkt.markPrice || mkt.oraclePrice || '0') : 'NOT_FOUND';
  })
") || PRICE="ERROR"
# Strip surrounding quotes if double-encoded
PRICE=$(echo "$PRICE" | sed 's/^"//;s/"$//')
echo "  Price: $PRICE"
if [ "$PRICE" = "NOT_FOUND" ] || [ "$PRICE" = "0" ] || [ "$PRICE" = "ERROR" ]; then
  echo "ERROR: Could not fetch price for $SYMBOL"
  exit 1
fi

# 6. Build order params
PRICE_FIELD=""
if [ "$ORDER_TYPE" = "limit" ] && [ -n "$LIMIT_PRICE" ]; then
  PRICE_FIELD="price: '$LIMIT_PRICE',"
fi

ORDER_PARAMS="{ symbol: '$SYMBOL', isBuy: $IS_BUY, orderType: '$ORDER_TYPE', size: '$SIZE', leverage: $LEVERAGE, usdAmount: '$USD_AMOUNT', priceAtCalculation: $PRICE, maxSlippageBps: $SLIPPAGE, $PRICE_FIELD }"

# 7. Validate
echo "[4/9] Validating order..."
VALIDATION=$(eval_async "
  Engine.context.PerpsController.validateOrder($ORDER_PARAMS)
    .then(function(r) { return JSON.stringify(r); })
") || VALIDATION='{"error":"validation call failed"}'
echo "  Validation: $VALIDATION"

# Check for validation errors
if echo "$VALIDATION" | python3 -c "
import sys,json
raw = json.load(sys.stdin)
if isinstance(raw, str):
    raw = json.loads(raw)
sys.exit(0 if raw.get('isValid', raw.get('valid', True)) else 1)
" 2>/dev/null; then
  : # valid
else
  echo "WARNING: Order validation failed, proceeding anyway (may be expected)"
fi

# 8. Place order
echo "[5/9] Placing order..."
ORDER_START=$(python3 -c "import time; print(int(time.time()*1000))")
ORDER_RESULT=$(eval_async "
  Engine.context.PerpsController.placeOrder($ORDER_PARAMS)
    .then(function(r) { return JSON.stringify(r); })
    .catch(function(e) { return JSON.stringify({ error: e.message }); })
") || ORDER_RESULT='{"error":"placeOrder call failed"}'
ORDER_END=$(python3 -c "import time; print(int(time.time()*1000))")
ORDER_MS=$((ORDER_END - ORDER_START))
echo "  Result: $ORDER_RESULT (${ORDER_MS}ms)"

if echo "$ORDER_RESULT" | grep -q '"error"'; then
  echo "WARNING: Order may have failed"
  PASS=false
fi

# 9. Wait for WS updates
echo "[6/9] Waiting ${WAIT_SECS}s for WebSocket updates..."
sleep "$WAIT_SECS"

# 10. Capture debug logs since order
echo "[7/9] PERPS_DEBUG logs since order:"
echo "  --- Position-related ---"
tail -n +"$((LOG_MARKER + 1))" "$METRO_LOG" 2>/dev/null | grep 'PERPS_DEBUG.*[Pp]osition' | head -20 || echo "  (none)"
echo "  --- Price-related ---"
tail -n +"$((LOG_MARKER + 1))" "$METRO_LOG" 2>/dev/null | grep 'PERPS_DEBUG.*[Pp]rice' | head -10 || echo "  (none)"

# Count WS callbacks
WS_POS_CALLBACKS=$(tail -n +"$((LOG_MARKER + 1))" "$METRO_LOG" 2>/dev/null | grep -c 'PositionStreamChannel: WS callback' || echo 0)
WS_HOOK_UPDATES=$(tail -n +"$((LOG_MARKER + 1))" "$METRO_LOG" 2>/dev/null | grep -c 'usePerpsLivePositions: Update' || echo 0)
WS_FIRST_PRICE=$(tail -n +"$((LOG_MARKER + 1))" "$METRO_LOG" 2>/dev/null | grep -c 'FIRST WS data received' || echo 0)

# 11. Post-trade state
echo "[8/9] Capturing post-trade state..."
POST_STATE=$(eval_async "
  Promise.all([
    Engine.context.PerpsController.getPositions(),
    Engine.context.PerpsController.getAccountState()
  ]).then(function(results) {
    var p = results[0]; var a = results[1];
    return JSON.stringify({
      positionCount: p.length,
      symbols: p.map(function(x) { return x.symbol; }),
      balance: a && a.withdrawable ? a.withdrawable : 'unknown'
    });
  })
") || POST_STATE='{"error":"failed to get post-state"}'
echo "  Post-trade: $POST_STATE"
POST_COUNT=$(echo "$POST_STATE" | python3 -c "
import sys,json
raw = json.load(sys.stdin)
if isinstance(raw, str):
    raw = json.loads(raw)
print(raw.get('positionCount', 0))
" 2>/dev/null || echo 0)

# Screenshot
PLATFORM=$PLATFORM "$SCRIPT_DIR/screenshot.sh" "trade-${SYMBOL}-${SIDE}" || echo "  (screenshot failed)"

# 12. Cleanup (optional)
if [ -z "$SKIP_CLOSE" ]; then
  echo "[9/9] Closing position..."
  CLOSE_RESULT=$(eval_async "
    Engine.context.PerpsController.closePosition({ symbol: '$SYMBOL' })
      .then(function(r) { return JSON.stringify(r); })
      .catch(function(e) { return JSON.stringify({ error: e.message }); })
  ") || CLOSE_RESULT='{"error":"closePosition call failed"}'
  echo "  Close: $CLOSE_RESULT"
else
  echo "[9/9] Skipping close (SKIP_CLOSE set)"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "=== SUMMARY ==="
echo "Pre:  $PRE_STATE"
echo "Post: $POST_STATE"
echo ""
echo "--- TAT-2597 (position appears after trade) ---"
echo "  Position count: $PRE_COUNT → $POST_COUNT"
echo "  WS position callbacks: $WS_POS_CALLBACKS"
echo "  Hook updates: $WS_HOOK_UPDATES"
if [ "$POST_COUNT" -gt "$PRE_COUNT" ] 2>/dev/null; then
  echo "  PASS: Position count increased"
else
  echo "  FAIL: Position count did not increase ($PRE_COUNT → $POST_COUNT)"
  PASS=false
fi
if [ "$WS_POS_CALLBACKS" -gt 0 ] 2>/dev/null; then
  echo "  PASS: WS delivered position data"
else
  echo "  FAIL: No WS position callbacks detected"
  PASS=false
fi

echo ""
echo "--- TAT-2598 (prices and market data flowing) ---"
echo "  Price WS first data: $WS_FIRST_PRICE"
if [ "$WS_FIRST_PRICE" -gt 0 ] 2>/dev/null; then
  echo "  PASS: Price stream received first WS data"
else
  echo "  INFO: No FIRST WS data log (may have received data before test started)"
fi

echo ""
echo "Order result: $ORDER_RESULT"
echo "Order latency: ${ORDER_MS}ms"
echo ""
if [ "$PASS" = true ]; then
  echo "RESULT: PASS"
else
  echo "RESULT: FAIL"
  exit 1
fi
