#!/bin/bash
set -euo pipefail
# scripts/perps/agentic/validate-myx.sh
# Comprehensive MYX provider validation — tests each method category on testnet/mainnet.
#
# Prerequisites:
#   - Metro running, device connected, app open
#   - Engine exposed on globalThis (dev builds via __AGENTIC__ bridge)
#   - MYX provider enabled (MM_PERPS_MYX_PROVIDER_ENABLED=true)
#
# Usage:
#   scripts/perps/agentic/validate-myx.sh                    # Both networks
#   scripts/perps/agentic/validate-myx.sh --network testnet  # Testnet only
#   scripts/perps/agentic/validate-myx.sh --network mainnet  # Mainnet only

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../../.."

# ── Args ────────────────────────────────────────────────────────────
NETWORK="both"
while [[ $# -gt 0 ]]; do
  case $1 in
    --network) NETWORK="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Helpers ─────────────────────────────────────────────────────────
eval_sync() {
  "$SCRIPT_DIR/app-state.sh" eval "$@" 2>&1
}

eval_async() {
  "$SCRIPT_DIR/app-state.sh" eval-async "$@" 2>&1
}

# Counters
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

RESULTS=""

record() {
  local category="$1" test_name="$2" result="$3" details="${4:-}"
  local icon
  case "$result" in
    PASS) icon="✓"; PASS_COUNT=$((PASS_COUNT + 1)) ;;
    FAIL) icon="✗"; FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
    SKIP) icon="⊘"; SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
  esac
  RESULTS="${RESULTS}$(printf '%-16s %-28s %s %-4s  %s\n' "$category" "$test_name" "$icon" "$result" "$details")\n"
}

print_report() {
  local net_label="$1" chain_id="$2"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  MYX Provider Validation Report"
  echo "  Network: $net_label (chainId: $chain_id)"
  echo "  Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  printf '%-16s %-28s   %-5s %s\n' "Category" "Test" "Result" "Details"
  echo "────────────────────────────────────────────────────────────────"
  echo -e "$RESULTS"
  echo ""
  local total=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
  echo "Summary: ${PASS_COUNT}/${total} passed, ${FAIL_COUNT} failed, ${SKIP_COUNT} skipped"
  echo "═══════════════════════════════════════════════════════════════"
}

# Parse JSON field with python3 (handles double-encoded strings)
json_field() {
  local json="$1" field="$2"
  echo "$json" | python3 -c "
import sys, json
raw = json.load(sys.stdin)
if isinstance(raw, str):
    raw = json.loads(raw)
print(raw.get('$field', ''))
" 2>/dev/null || echo ""
}

# ── Pre-flight ──────────────────────────────────────────────────────
echo "[pre-flight] Checking Engine availability..."
ENGINE_CHECK=$(eval_sync "typeof Engine !== 'undefined' && typeof Engine.context !== 'undefined'") || ENGINE_CHECK="false"
if [ "$ENGINE_CHECK" != "true" ]; then
  echo "ERROR: Engine not available. Make sure app is running a dev build with agentic bridge."
  exit 1
fi
echo "  Engine available"

# Save initial testnet state so we can restore later
INITIAL_TESTNET=$(eval_sync "JSON.stringify(Engine.context.PerpsController.state.isTestnet)") || INITIAL_TESTNET="unknown"
echo "  Current isTestnet: $INITIAL_TESTNET"

# ── Run validation for a given network ──────────────────────────────
run_validation() {
  local target_testnet="$1"  # "true" or "false"
  local net_label
  local chain_id

  if [ "$target_testnet" = "true" ]; then
    net_label="testnet"
    chain_id="97"
  else
    net_label="mainnet"
    chain_id="56"
  fi

  RESULTS=""
  PASS_COUNT=0
  FAIL_COUNT=0
  SKIP_COUNT=0

  echo ""
  echo "━━━ Validating $net_label (chainId: $chain_id) ━━━"

  # Switch network if needed
  local current_testnet
  current_testnet=$(eval_sync "JSON.stringify(Engine.context.PerpsController.state.isTestnet)") || current_testnet="unknown"
  if [ "$current_testnet" != "$target_testnet" ]; then
    echo "[setup] Switching to $net_label..."
    eval_async "Engine.context.PerpsController.toggleTestnet().then(function(r) { return JSON.stringify(r); })" >/dev/null 2>&1 || true
    sleep 2
  fi

  # ── 1. Init: Provider registered ──
  echo "[test] Init: Provider registered..."
  local provider_check
  provider_check=$(eval_async "Promise.resolve().then(function() { var p = Engine.context.PerpsController.providers.get('myx'); return JSON.stringify({registered: p != null}); })") || provider_check='{"registered":false}'
  local registered
  registered=$(json_field "$provider_check" "registered")
  if [ "$registered" = "True" ] || [ "$registered" = "true" ]; then
    record "Init" "Provider registered" "PASS"
  else
    record "Init" "Provider registered" "FAIL" "not found in providers map"
    # Can't continue without provider
    print_report "$net_label" "$chain_id"
    return
  fi

  # ── 2. Init: Markets load ──
  echo "[test] Init: Markets load..."
  local markets_result
  markets_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').getMarkets().then(function(m) {
      return JSON.stringify({count: m.length, first: m[0] ? m[0].name : null, firstSymbol: m[0] ? (m[0].baseSymbol || m[0].symbol || m[0].name) : null});
    })
  ") || markets_result='{"error":"getMarkets failed"}'
  local market_count first_symbol
  market_count=$(json_field "$markets_result" "count")
  first_symbol=$(json_field "$markets_result" "firstSymbol")
  if [ -n "$market_count" ] && [ "$market_count" != "0" ] && [ "$market_count" != "" ]; then
    record "Init" "Markets loaded" "PASS" "${market_count} markets"
  else
    record "Init" "Markets loaded" "FAIL" "$(json_field "$markets_result" "error")"
    first_symbol=""
  fi

  # ── 3. Init: Markets have baseSymbol ──
  echo "[test] Init: Market shape..."
  local shape_result
  shape_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').getMarkets().then(function(m) {
      if (m.length === 0) return JSON.stringify({ok: false, reason: 'empty'});
      var sample = m[0];
      return JSON.stringify({ok: true, hasBaseSymbol: 'baseSymbol' in sample, hasName: 'name' in sample, name: sample.name, baseSymbol: sample.baseSymbol || ''});
    })
  ") || shape_result='{"ok":false}'
  local has_base
  has_base=$(json_field "$shape_result" "hasBaseSymbol")
  if [ "$has_base" = "True" ] || [ "$has_base" = "true" ]; then
    record "Init" "Markets have baseSymbol" "PASS"
  else
    record "Init" "Markets have baseSymbol" "FAIL" "missing baseSymbol field"
  fi

  # ── 4. Prices: Tickers return data ──
  echo "[test] Prices: Tickers..."
  local tickers_result
  tickers_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').getMarketDataWithPrices().then(function(d) {
      return JSON.stringify({count: d.length, hasPrice: d[0] ? (d[0].price != null || d[0].markPrice != null || d[0].oraclePrice != null) : false});
    })
  ") || tickers_result='{"count":0}'
  local ticker_count
  ticker_count=$(json_field "$tickers_result" "count")
  if [ -n "$ticker_count" ] && [ "$ticker_count" != "0" ]; then
    record "Prices" "Tickers returned" "PASS" "${ticker_count} tickers"
  else
    record "Prices" "Tickers returned" "FAIL" "0 tickers"
  fi

  # ── 5. Candles REST: 1h historical ──
  echo "[test] Candles REST: 1h historical..."
  if [ -n "$first_symbol" ] && [ "$first_symbol" != "" ]; then
    local candle_1h
    candle_1h=$(eval_async "
      (function() {
        var provider = Engine.context.PerpsController.providers.get('myx');
        return provider.getMarkets().then(function(markets) {
          var sym = markets[0] ? markets[0].name : null;
          if (!sym) return JSON.stringify({error: 'no markets'});
          var result = null;
          var err = null;
          provider.subscribeToCandles({symbol: sym, interval: '1h', callback: function(d) { result = d; }, onError: function(e) { err = String(e); }});
          return new Promise(function(resolve) {
            setTimeout(function() {
              resolve(JSON.stringify({symbol: sym, count: result ? (result.candles ? result.candles.length : 0) : 0, error: err}));
            }, 8000);
          });
        });
      })()
    ") || candle_1h='{"count":0,"error":"eval failed"}'
    local candle_count_1h candle_error_1h
    candle_count_1h=$(json_field "$candle_1h" "count")
    candle_error_1h=$(json_field "$candle_1h" "error")
    if [ -n "$candle_count_1h" ] && [ "$candle_count_1h" != "0" ] && [ "$candle_count_1h" != "" ]; then
      record "Candles REST" "1h historical" "PASS" "${candle_count_1h} candles"
    else
      record "Candles REST" "1h historical" "FAIL" "count=${candle_count_1h:-0} err=${candle_error_1h:-none}"
    fi
  else
    record "Candles REST" "1h historical" "SKIP" "no markets available"
  fi

  # ── 6. Candles REST: 1d historical ──
  echo "[test] Candles REST: 1d historical..."
  if [ -n "$first_symbol" ] && [ "$first_symbol" != "" ]; then
    local candle_1d
    candle_1d=$(eval_async "
      (function() {
        var provider = Engine.context.PerpsController.providers.get('myx');
        return provider.getMarkets().then(function(markets) {
          var sym = markets[0] ? markets[0].name : null;
          if (!sym) return JSON.stringify({error: 'no markets'});
          var result = null;
          var err = null;
          provider.subscribeToCandles({symbol: sym, interval: '1D', callback: function(d) { result = d; }, onError: function(e) { err = String(e); }});
          return new Promise(function(resolve) {
            setTimeout(function() {
              resolve(JSON.stringify({symbol: sym, count: result ? (result.candles ? result.candles.length : 0) : 0, error: err}));
            }, 8000);
          });
        });
      })()
    ") || candle_1d='{"count":0,"error":"eval failed"}'
    local candle_count_1d candle_error_1d
    candle_count_1d=$(json_field "$candle_1d" "count")
    candle_error_1d=$(json_field "$candle_1d" "error")
    if [ -n "$candle_count_1d" ] && [ "$candle_count_1d" != "0" ] && [ "$candle_count_1d" != "" ]; then
      record "Candles REST" "1d historical" "PASS" "${candle_count_1d} candles"
    else
      record "Candles REST" "1d historical" "FAIL" "count=${candle_count_1d:-0} err=${candle_error_1d:-none}"
    fi
  else
    record "Candles REST" "1d historical" "SKIP" "no markets available"
  fi

  # ── 7. Candles REST: 5m historical ──
  echo "[test] Candles REST: 5m historical..."
  if [ -n "$first_symbol" ] && [ "$first_symbol" != "" ]; then
    local candle_5m
    candle_5m=$(eval_async "
      (function() {
        var provider = Engine.context.PerpsController.providers.get('myx');
        return provider.getMarkets().then(function(markets) {
          var sym = markets[0] ? markets[0].name : null;
          if (!sym) return JSON.stringify({error: 'no markets'});
          var result = null;
          var err = null;
          provider.subscribeToCandles({symbol: sym, interval: '5m', callback: function(d) { result = d; }, onError: function(e) { err = String(e); }});
          return new Promise(function(resolve) {
            setTimeout(function() {
              resolve(JSON.stringify({symbol: sym, count: result ? (result.candles ? result.candles.length : 0) : 0, error: err}));
            }, 8000);
          });
        });
      })()
    ") || candle_5m='{"count":0,"error":"eval failed"}'
    local candle_count_5m candle_error_5m
    candle_count_5m=$(json_field "$candle_5m" "count")
    candle_error_5m=$(json_field "$candle_5m" "error")
    if [ -n "$candle_count_5m" ] && [ "$candle_count_5m" != "0" ] && [ "$candle_count_5m" != "" ]; then
      record "Candles REST" "5m historical" "PASS" "${candle_count_5m} candles"
    else
      record "Candles REST" "5m historical" "FAIL" "count=${candle_count_5m:-0} err=${candle_error_5m:-none}"
    fi
  else
    record "Candles REST" "5m historical" "SKIP" "no markets available"
  fi

  # ── 8. Auth: isReadyToTrade ──
  echo "[test] Auth: isReadyToTrade..."
  local ready_result
  ready_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').isReadyToTrade().then(function(r) {
      return JSON.stringify(r);
    }).catch(function(e) { return JSON.stringify({ready: false, error: e.message}); })
  ") || ready_result='{"ready":false,"error":"eval failed"}'
  local is_ready
  is_ready=$(json_field "$ready_result" "ready")
  if [ "$is_ready" = "True" ] || [ "$is_ready" = "true" ]; then
    record "Auth" "isReadyToTrade" "PASS"
  else
    local ready_error
    ready_error=$(json_field "$ready_result" "error")
    record "Auth" "isReadyToTrade" "FAIL" "${ready_error:-not ready}"
  fi

  # ── 9. Positions: getPositions ──
  echo "[test] Positions: getPositions..."
  local positions_result
  positions_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').getPositions().then(function(p) {
      return JSON.stringify({ok: true, count: p.length});
    }).catch(function(e) { return JSON.stringify({ok: false, error: e.message}); })
  ") || positions_result='{"ok":false,"error":"eval failed"}'
  local pos_ok pos_count
  pos_ok=$(json_field "$positions_result" "ok")
  pos_count=$(json_field "$positions_result" "count")
  if [ "$pos_ok" = "True" ] || [ "$pos_ok" = "true" ]; then
    record "Positions" "getPositions" "PASS" "${pos_count} positions"
  else
    record "Positions" "getPositions" "FAIL" "$(json_field "$positions_result" "error")"
  fi

  # ── 10. Orders: getOrders ──
  echo "[test] Orders: getOrders..."
  local orders_result
  orders_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').getOrders().then(function(o) {
      return JSON.stringify({ok: true, count: o.length});
    }).catch(function(e) { return JSON.stringify({ok: false, error: e.message}); })
  ") || orders_result='{"ok":false,"error":"eval failed"}'
  local ord_ok ord_count
  ord_ok=$(json_field "$orders_result" "ok")
  ord_count=$(json_field "$orders_result" "count")
  if [ "$ord_ok" = "True" ] || [ "$ord_ok" = "true" ]; then
    record "Orders" "getOrders" "PASS" "${ord_count} orders"
  else
    record "Orders" "getOrders" "FAIL" "$(json_field "$orders_result" "error")"
  fi

  # ── 11. Account: getAccountState ──
  echo "[test] Account: getAccountState..."
  local account_result
  account_result=$(eval_async "
    Engine.context.PerpsController.providers.get('myx').getAccountState().then(function(a) {
      return JSON.stringify({ok: true, keys: Object.keys(a || {}), balance: a ? (a.withdrawable || a.balance || '0') : '0'});
    }).catch(function(e) { return JSON.stringify({ok: false, error: e.message}); })
  ") || account_result='{"ok":false,"error":"eval failed"}'
  local acct_ok acct_balance
  acct_ok=$(json_field "$account_result" "ok")
  acct_balance=$(json_field "$account_result" "balance")
  if [ "$acct_ok" = "True" ] || [ "$acct_ok" = "true" ]; then
    record "Account" "getAccountState" "PASS" "balance: ${acct_balance:-0}"
  else
    record "Account" "getAccountState" "FAIL" "$(json_field "$account_result" "error")"
  fi

  # ── 12. Ping: Health check ──
  echo "[test] Ping: Health check..."
  local ping_result
  ping_result=$(eval_async "
    (function() {
      var provider = Engine.context.PerpsController.providers.get('myx');
      if (typeof provider.ping === 'function') {
        return provider.ping().then(function() { return JSON.stringify({ok: true}); }).catch(function(e) { return JSON.stringify({ok: false, error: e.message}); });
      }
      return Promise.resolve(JSON.stringify({ok: false, error: 'ping not implemented'}));
    })()
  ") || ping_result='{"ok":false,"error":"eval failed"}'
  local ping_ok
  ping_ok=$(json_field "$ping_result" "ok")
  if [ "$ping_ok" = "True" ] || [ "$ping_ok" = "true" ]; then
    record "Ping" "Health check" "PASS"
  else
    record "Ping" "Health check" "FAIL" "$(json_field "$ping_result" "error")"
  fi

  print_report "$net_label" "$chain_id"
}

# ── Main ────────────────────────────────────────────────────────────

# Ensure MYX provider is initialized
echo "[init] Initializing PerpsController..."
eval_async "Engine.context.PerpsController.init().then(function() { return JSON.stringify({ok: true}); })" >/dev/null 2>&1 || true
sleep 2

case "$NETWORK" in
  testnet) run_validation "true" ;;
  mainnet) run_validation "false" ;;
  both)
    run_validation "true"
    run_validation "false"
    ;;
  *) echo "Invalid --network value: $NETWORK (use testnet, mainnet, or both)"; exit 1 ;;
esac

# Restore initial network state
echo ""
echo "[cleanup] Restoring initial network state..."
CURRENT_TESTNET=$(eval_sync "JSON.stringify(Engine.context.PerpsController.state.isTestnet)") || CURRENT_TESTNET="unknown"
if [ "$CURRENT_TESTNET" != "$INITIAL_TESTNET" ]; then
  eval_async "Engine.context.PerpsController.toggleTestnet().then(function(r) { return JSON.stringify(r); })" >/dev/null 2>&1 || true
  echo "  Restored to isTestnet=$INITIAL_TESTNET"
else
  echo "  Already at isTestnet=$INITIAL_TESTNET"
fi
