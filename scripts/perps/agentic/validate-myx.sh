#!/bin/bash
set -euo pipefail
# scripts/perps/agentic/validate-myx.sh
# Comprehensive MYX provider validation — tests each method category on testnet/mainnet.
# Shows raw data previews for every call so a human can assess what's working.
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
UNVERIFIED_COUNT=0

RESULTS=""

record() {
  local category="$1" test_name="$2" result="$3" details="${4:-}"
  local icon
  case "$result" in
    PASS)       icon="✓"; PASS_COUNT=$((PASS_COUNT + 1)) ;;
    FAIL)       icon="✗"; FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
    SKIP)       icon="⊘"; SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
    UNVERIFIED) icon="?"; UNVERIFIED_COUNT=$((UNVERIFIED_COUNT + 1)) ;;
  esac
  RESULTS="${RESULTS}$(printf '%-16s %-28s %s %-10s  %s\n' "$category" "$test_name" "$icon" "$result" "$details")\n"
}

# Print indented data preview (truncated to keep output scannable)
preview() {
  local label="$1" raw="$2" max_len="${3:-200}"
  local trimmed
  if [ ${#raw} -gt "$max_len" ]; then
    trimmed="${raw:0:$max_len}..."
  else
    trimmed="$raw"
  fi
  echo "         ↳ $label: $trimmed"
}

print_report() {
  local net_label="$1" chain_id="$2"
  echo ""
  echo "═══════════════════════════════════════════════════════════════════════"
  echo "  MYX Provider Validation Report"
  echo "  Network: $net_label (chainId: $chain_id)"
  echo "  Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "═══════════════════════════════════════════════════════════════════════"
  echo ""
  printf '%-16s %-28s   %-11s %s\n' "Category" "Test" "Result" "Details"
  echo "───────────────────────────────────────────────────────────────────────"
  echo -e "$RESULTS"
  echo ""
  local total=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT + UNVERIFIED_COUNT))
  echo "Summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed, ${SKIP_COUNT} skipped, ${UNVERIFIED_COUNT} unverified  (${total} total)"
  if [ "$UNVERIFIED_COUNT" -gt 0 ]; then
    echo ""
    echo "⚠ UNVERIFIED = API returned data but auth was never validated."
    echo "  myxClient.auth() is sync (stores callbacks, sets #authenticated=true)."
    echo "  MYX API may not auth-gate read endpoints — empty results prove nothing."
  fi
  echo "═══════════════════════════════════════════════════════════════════════"
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

# Pretty-print decoded JSON (handles double-encoding)
json_decode() {
  echo "$1" | python3 -c "
import sys, json
raw = json.load(sys.stdin)
if isinstance(raw, str):
    try: raw = json.loads(raw)
    except: pass
print(json.dumps(raw, indent=2, ensure_ascii=False))
" 2>/dev/null || echo "$1"
}

# ── Pre-flight ──────────────────────────────────────────────────────
echo "[pre-flight] Checking Engine availability..."
ENGINE_CHECK=$(eval_sync 'Boolean(Engine && Engine.context)') || ENGINE_CHECK="false"
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
  UNVERIFIED_COUNT=0

  echo ""
  echo "━━━ Validating $net_label (chainId: $chain_id) ━━━"

  # Switch network if needed
  local current_testnet
  current_testnet=$(eval_sync "JSON.stringify(Engine.context.PerpsController.state.isTestnet)") || current_testnet="unknown"
  if [ "$current_testnet" != "\"$target_testnet\"" ]; then
    echo "[setup] Switching to $net_label..."
    eval_async "Engine.context.PerpsController.toggleTestnet().then(function(r) { return JSON.stringify(r); })" >/dev/null 2>&1 || true
    sleep 2
  fi

  # ── SDK config probe ──
  echo "[probe] Checking SDK internal config..."
  local sdk_probe
  sdk_probe=$(eval_async '
    (function() {
      var provider = Engine.context.PerpsController.providers.get("myx");
      if (provider === null || provider === undefined) return JSON.stringify({error: "no provider"});
      var cs = provider.__private_625_clientService;
      if (cs === null || cs === undefined) return JSON.stringify({error: "no clientService"});
      var myxClient = cs.__private_638_myxClient;
      var config = myxClient.configManager.config;
      var authConfig = cs.__private_642_authConfig;
      return JSON.stringify({
        sdkChainId: config.chainId,
        sdkIsTestnet: config.isTestnet,
        sdkIsBetaMode: config.isBetaMode,
        authenticated: cs.__private_643_authenticated,
        appId: authConfig ? authConfig.appId : null,
        hasApiSecret: Boolean(authConfig && authConfig.apiSecret),
        brokerAddress: authConfig && authConfig.brokerAddress ? authConfig.brokerAddress : ""
      });
    })()
  ') || sdk_probe='{"error":"probe failed"}'
  preview "SDK config" "$(json_decode "$sdk_probe")" 500

  # ── 1. Init: Provider registered ──
  echo "[test] Init: Provider registered..."
  local provider_check
  provider_check=$(eval_async '
    Promise.resolve().then(function() {
      var p = Engine.context.PerpsController.providers.get("myx");
      return JSON.stringify({registered: Boolean(p)});
    })
  ') || provider_check='{"registered":false}'
  local registered
  registered=$(json_field "$provider_check" "registered")
  if [ "$registered" = "True" ] || [ "$registered" = "true" ]; then
    record "Init" "Provider registered" "PASS"
  else
    record "Init" "Provider registered" "FAIL" "not found in providers map"
    print_report "$net_label" "$chain_id"
    return
  fi

  # ── 2. Init: Markets load ──
  echo "[test] Init: Markets load..."
  local markets_result
  markets_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").getMarkets().then(function(m) {
      return JSON.stringify({
        count: m.length,
        names: m.map(function(x) { return x.name; }),
        sampleKeys: m[0] ? Object.keys(m[0]) : []
      });
    })
  ') || markets_result='{"error":"getMarkets failed"}'
  local market_count
  market_count=$(json_field "$markets_result" "count")
  preview "markets" "$(json_decode "$markets_result")" 400
  local first_symbol=""
  if [ -n "$market_count" ] && [ "$market_count" != "0" ] && [ "$market_count" != "" ]; then
    record "Init" "Markets loaded" "PASS" "${market_count} markets"
    first_symbol=$(echo "$markets_result" | python3 -c "
import sys, json
raw = json.load(sys.stdin)
if isinstance(raw, str): raw = json.loads(raw)
names = raw.get('names', [])
print(names[0] if names else '')
" 2>/dev/null || echo "")
  else
    record "Init" "Markets loaded" "FAIL" "0 markets"
  fi

  # ── 3. Init: Market shape ──
  echo "[test] Init: Market shape..."
  local shape_result
  shape_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").getMarkets().then(function(m) {
      if (m.length === 0) return JSON.stringify({ok: false, reason: "empty"});
      var s = m[0];
      return JSON.stringify({
        name: s.name, baseSymbol: s.baseSymbol || null, symbol: s.symbol || null,
        maxLeverage: s.maxLeverage, szDecimals: s.szDecimals, providerId: s.providerId,
        keys: Object.keys(s)
      });
    })
  ') || shape_result='{"ok":false}'
  preview "first market" "$(json_decode "$shape_result")" 400
  local has_base
  has_base=$(echo "$shape_result" | python3 -c "
import sys, json
raw = json.load(sys.stdin)
if isinstance(raw, str): raw = json.loads(raw)
bs = raw.get('baseSymbol', '')
print('true' if bs and bs != 'None' else 'false')
" 2>/dev/null || echo "false")
  if [ "$has_base" = "true" ]; then
    record "Init" "Markets have baseSymbol" "PASS"
  else
    record "Init" "Markets have baseSymbol" "FAIL" "baseSymbol is empty/missing"
  fi

  # ── 4. Prices: Tickers ──
  echo "[test] Prices: Tickers..."
  local tickers_result
  tickers_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").getMarketDataWithPrices().then(function(d) {
      return JSON.stringify({
        count: d.length,
        samples: d.slice(0, 3).map(function(x) {
          return {name: x.name, price: x.price, markPrice: x.markPrice, oraclePrice: x.oraclePrice, volume: x.volume, openInterest: x.openInterest, fundingRate: x.fundingRate};
        })
      });
    })
  ') || tickers_result='{"count":0}'
  local ticker_count
  ticker_count=$(json_field "$tickers_result" "count")
  preview "tickers" "$(json_decode "$tickers_result")" 500
  if [ -n "$ticker_count" ] && [ "$ticker_count" != "0" ]; then
    # Check if prices are actually non-zero
    local has_real_price
    has_real_price=$(echo "$tickers_result" | python3 -c "
import sys, json
raw = json.load(sys.stdin)
if isinstance(raw, str): raw = json.loads(raw)
samples = raw.get('samples', [])
real = [s for s in samples if s.get('price') and s['price'] not in ('0', '\$0', '<\$0.01', '\$0.00', None)]
print('true' if real else 'false')
" 2>/dev/null || echo "false")
    if [ "$has_real_price" = "true" ]; then
      record "Prices" "Tickers with real prices" "PASS" "${ticker_count} tickers"
    else
      record "Prices" "Tickers returned" "FAIL" "${ticker_count} tickers but ALL prices are \$0"
    fi
  else
    record "Prices" "Tickers returned" "FAIL" "0 tickers"
  fi

  # ── 5-7. Candles REST ──
  local intervals="1h 1D 5m"
  for interval in $intervals; do
    echo "[test] Candles REST: ${interval} historical..."
    if [ -n "$first_symbol" ] && [ "$first_symbol" != "" ]; then
      local candle_result
      candle_result=$(eval_async '
        (function() {
          var provider = Engine.context.PerpsController.providers.get("myx");
          return provider.getMarkets().then(function(markets) {
            var sym = markets[0] ? markets[0].name : null;
            if (sym === null) return JSON.stringify({error: "no markets"});
            var result = null;
            var err = null;
            provider.subscribeToCandles({symbol: sym, interval: "'"${interval}"'", callback: function(d) { result = d; }, onError: function(e) { err = String(e); }});
            return new Promise(function(resolve) {
              setTimeout(function() {
                var candles = result && result.candles ? result.candles : [];
                var first = candles[0];
                var last = candles[candles.length - 1];
                resolve(JSON.stringify({
                  symbol: sym, interval: "'"${interval}"'", count: candles.length, error: err,
                  first: first ? {time: first.time, open: first.open, close: first.close, vol: first.volume} : null,
                  last: last ? {time: last.time, open: last.open, close: last.close, vol: last.volume} : null
                }));
              }, 8000);
            });
          });
        })()
      ') || candle_result='{"count":0,"error":"eval failed"}'
      local candle_count candle_error
      candle_count=$(json_field "$candle_result" "count")
      candle_error=$(json_field "$candle_result" "error")
      preview "candles ${interval}" "$(json_decode "$candle_result")" 400
      if [ -n "$candle_count" ] && [ "$candle_count" != "0" ] && [ "$candle_count" != "" ]; then
        record "Candles REST" "${interval} historical" "PASS" "${candle_count} candles"
      else
        record "Candles REST" "${interval} historical" "FAIL" "count=${candle_count:-0} err=${candle_error:-none}"
      fi
    else
      record "Candles REST" "${interval} historical" "SKIP" "no markets available"
    fi
  done

  # ── 5b. Candles WS: Live updates (sustained) ──
  # Subscribe and wait for multiple WS callbacks over time to prove the socket
  # stays open and delivers data at intervals (not just one burst).
  # Callback 1 = REST snapshot, callbacks 2+ = WS live updates.
  echo "[test] Candles WS: Sustained kline updates..."
  if [ -n "$first_symbol" ] && [ "$first_symbol" != "" ]; then
    local ws_candle_result
    ws_candle_result=$(eval_async '
      new Promise(function(resolve) {
        var callCount = 0;
        var firstCount = 0;
        var timestamps = [];
        var targetWsCallbacks = 3;
        var timer = setTimeout(function() {
          if (typeof unsub === "function") unsub();
          resolve(JSON.stringify({wsReceived: callCount > 1, callbackCount: callCount, restCount: firstCount, wsCallbacks: callCount - 1, timestamps: timestamps}));
        }, 65000);
        var unsub;
        var provider = Engine.context.PerpsController.providers.get("myx");
        unsub = provider.subscribeToCandles({symbol: "'"${first_symbol}"'", interval: "1m", limit: 5, callback: function(d) {
          callCount++;
          if (callCount === 1) { firstCount = d.candles.length; return; }
          timestamps.push(Date.now());
          if (callCount - 1 >= targetWsCallbacks) {
            clearTimeout(timer);
            if (typeof unsub === "function") unsub();
            resolve(JSON.stringify({wsReceived: true, callbackCount: callCount, restCount: firstCount, wsCallbacks: callCount - 1, timestamps: timestamps}));
          }
        }, onError: function(e) {
          clearTimeout(timer);
          if (typeof unsub === "function") unsub();
          resolve(JSON.stringify({wsReceived: false, error: String(e), callbackCount: callCount}));
        }});
      })
    ') || ws_candle_result='{"wsReceived":false,"error":"eval failed"}'
    preview "WS kline" "$(json_decode "$ws_candle_result")" 500
    local ws_received ws_callbacks
    ws_received=$(json_field "$ws_candle_result" "wsReceived")
    ws_callbacks=$(json_field "$ws_candle_result" "wsCallbacks")
    if [ "$ws_received" = "True" ] || [ "$ws_received" = "true" ]; then
      record "Candles WS" "Sustained kline updates" "PASS" "${ws_callbacks} WS callbacks received"
    else
      local ws_error
      ws_error=$(json_field "$ws_candle_result" "error")
      record "Candles WS" "Sustained kline updates" "FAIL" "got ${ws_callbacks:-0} WS callbacks in 65s ${ws_error:+err=$ws_error}"
    fi
  else
    record "Candles WS" "Sustained kline updates" "SKIP" "no markets available"
  fi

  # ── 5c. Prices WS: Live ticker updates ──
  # Check if subscribeToPrices delivers a second (WS-driven) callback
  echo "[test] Prices WS: Live ticker update..."
  if [ -n "$first_symbol" ] && [ "$first_symbol" != "" ]; then
    local ws_price_result
    ws_price_result=$(eval_async '
      new Promise(function(resolve) {
        var callCount = 0;
        var timer = setTimeout(function() { resolve(JSON.stringify({wsReceived: false, callbackCount: callCount})); }, 15000);
        var unsub;
        var provider = Engine.context.PerpsController.providers.get("myx");
        unsub = provider.subscribeToPrices({symbols: ["'"${first_symbol}"'"], callback: function(d) {
          callCount++;
          if (callCount >= 2) {
            clearTimeout(timer);
            if (typeof unsub === "function") unsub();
            var sample = d[0] ? {symbol: d[0].symbol, price: d[0].price} : null;
            resolve(JSON.stringify({wsReceived: true, callbackCount: callCount, sample: sample}));
          }
        }});
      })
    ') || ws_price_result='{"wsReceived":false,"error":"eval failed"}'
    preview "WS prices" "$(json_decode "$ws_price_result")" 400
    local ws_price_received
    ws_price_received=$(json_field "$ws_price_result" "wsReceived")
    if [ "$ws_price_received" = "True" ] || [ "$ws_price_received" = "true" ]; then
      record "Prices WS" "Live ticker update" "PASS" "received multiple callbacks"
    else
      record "Prices WS" "Live ticker update" "FAIL" "no 2nd callback in 15s (REST poll only?)"
    fi
  else
    record "Prices WS" "Live ticker update" "SKIP" "no markets available"
  fi

  # ── 8. Auth: isReadyToTrade ──
  # NOTE: myxClient.auth() is sync — it just stores signer + getAccessToken callback.
  # It sets #authenticated=true immediately, no API call. So "ready:true" proves nothing.
  echo "[test] Auth: isReadyToTrade..."
  echo "         ⚠ WARNING: myxClient.auth() is sync — ready:true does NOT mean credentials are valid"
  local ready_result
  ready_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").isReadyToTrade().then(function(r) {
      return JSON.stringify(r);
    }).catch(function(e) { return JSON.stringify({ready: false, error: e.message}); })
  ') || ready_result='{"ready":false,"error":"eval failed"}'
  preview "isReadyToTrade" "$(json_decode "$ready_result")" 300
  local is_ready
  is_ready=$(json_field "$ready_result" "ready")
  if [ "$is_ready" = "True" ] || [ "$is_ready" = "true" ]; then
    record "Auth" "isReadyToTrade" "UNVERIFIED" "returns ready:true but auth is never validated"
  else
    local ready_error
    ready_error=$(json_field "$ready_result" "error")
    record "Auth" "isReadyToTrade" "FAIL" "${ready_error:-not ready}"
  fi

  # ── 9. Positions: getPositions ──
  echo "[test] Positions: getPositions..."
  local positions_result
  positions_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").getPositions().then(function(p) {
      return JSON.stringify({count: p.length, sample: p[0] ? p[0] : null});
    }).catch(function(e) { return JSON.stringify({error: e.message}); })
  ') || positions_result='{"error":"eval failed"}'
  preview "positions" "$(json_decode "$positions_result")" 300
  local pos_error
  pos_error=$(json_field "$positions_result" "error")
  if [ -n "$pos_error" ] && [ "$pos_error" != "" ]; then
    record "Positions" "getPositions" "FAIL" "$pos_error"
  else
    local pos_count
    pos_count=$(json_field "$positions_result" "count")
    record "Positions" "getPositions" "UNVERIFIED" "returned ${pos_count} (auth not validated)"
  fi

  # ── 10. Orders: getOrders ──
  echo "[test] Orders: getOrders..."
  local orders_result
  orders_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").getOrders().then(function(o) {
      return JSON.stringify({count: o.length, sample: o[0] ? o[0] : null});
    }).catch(function(e) { return JSON.stringify({error: e.message}); })
  ') || orders_result='{"error":"eval failed"}'
  preview "orders" "$(json_decode "$orders_result")" 300
  local ord_error
  ord_error=$(json_field "$orders_result" "error")
  if [ -n "$ord_error" ] && [ "$ord_error" != "" ]; then
    record "Orders" "getOrders" "FAIL" "$ord_error"
  else
    local ord_count
    ord_count=$(json_field "$orders_result" "count")
    record "Orders" "getOrders" "UNVERIFIED" "returned ${ord_count} (auth not validated)"
  fi

  # ── 11. Account: getAccountState ──
  echo "[test] Account: getAccountState..."
  local account_result
  account_result=$(eval_async '
    Engine.context.PerpsController.providers.get("myx").getAccountState().then(function(a) {
      return JSON.stringify(a || {});
    }).catch(function(e) { return JSON.stringify({error: e.message}); })
  ') || account_result='{"error":"eval failed"}'
  preview "accountState" "$(json_decode "$account_result")" 400
  local acct_error
  acct_error=$(json_field "$account_result" "error")
  if [ -n "$acct_error" ] && [ "$acct_error" != "" ]; then
    record "Account" "getAccountState" "FAIL" "$acct_error"
  else
    record "Account" "getAccountState" "UNVERIFIED" "returned data (auth not validated)"
  fi

  # ── 12. Ping: Health check ──
  echo "[test] Ping: Health check..."
  local ping_result
  ping_result=$(eval_async '
    (function() {
      var provider = Engine.context.PerpsController.providers.get("myx");
      if (typeof provider.ping === "function") {
        return provider.ping().then(function() { return JSON.stringify({ok: true}); }).catch(function(e) { return JSON.stringify({ok: false, error: e.message}); });
      }
      return Promise.resolve(JSON.stringify({ok: false, error: "ping not implemented"}));
    })()
  ') || ping_result='{"ok":false,"error":"eval failed"}'
  preview "ping" "$(json_decode "$ping_result")" 200
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
eval_async 'Engine.context.PerpsController.init().then(function() { return JSON.stringify({ok: true}); })' >/dev/null 2>&1 || true
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
  eval_async 'Engine.context.PerpsController.toggleTestnet().then(function(r) { return JSON.stringify(r); })' >/dev/null 2>&1 || true
  echo "  Restored to isTestnet=$INITIAL_TESTNET"
else
  echo "  Already at isTestnet=$INITIAL_TESTNET"
fi
