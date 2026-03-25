# MYX Write Integration — Validation Tracker

Branch: `feat/perps/myx-write-integration`

## Double Validation Approach

Each flow is validated twice:
1. **PoC script** — Standalone `scripts/perps/myx-poc/` script via `NETWORK=testnet npx tsx`. Isolates SDK behavior from app integration.
2. **CDP recipe** — `validate-recipe.sh` against the live app. Write recipes use **`flow_ref`** to drive the UI (navigate screens, press buttons, fill inputs — like a human tapping through the app), with `eval_ref` only for pre/post assertions. Read-only recipes use `eval_ref` directly since there's no UI to exercise.

## Validation Checklist

### Read-Only Operations (no on-chain cost)

- [x] **09-read-markets** — Fetch MYX markets with prices
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx listMarkets.ts`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/09-read-markets.json`
  - Codepath: `getMarkets()`, `getMarketDataWithPrices()`
  - Evidence: PASS 2/2 steps. Markets: WBTC ($70,199), MYX ($0.33)

- [x] **10-read-account** — Fetch account state (availableBalance, totalBalance)
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx showAccount.ts`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/10-read-account.json`
  - Codepath: `getAccountState()`
  - Evidence: PASS 2/2 steps. Balance: 0 USDC (no funds on Linea Sepolia)

- [x] **12-calculate-fees** — Calculate fees for $1000 trade
  - PoC: N/A (internal to provider)
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/12-calculate-fees.json`
  - Codepath: `calculateFees()`
  - Evidence: PASS 2/2 steps. feeRate=0.055%, feeAmount=$55, metamaskFeeAmount=$0

- [x] **13-validate-order** — Validate small ($1, expect invalid) and valid ($120, expect valid) orders
  - PoC: N/A (internal to provider)
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/13-validate-order.json`
  - Codepath: `validateOrder()`
  - Evidence: PASS 3/3 steps. $1 → isValid:false (ORDER_SIZE_MIN, min=11), $120 → isValid:true

### Market Orders

- [x] **01-place-market-order** — Place market buy, verify position created
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 11 --leverage 2 --type market`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/01-place-market-order.json`
  - Codepath: `placeOrder()`
  - Evidence: PoC PASS. CDP: UI flow 13/13 pass, placeOrder success:true, position created (META LONG $150 2x). Needed 15s wait (not 5s) for chain confirmation. **Close also works via eval ref.**

### Position Management

- [x] **02-update-tpsl** — Set TP/SL on open position
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx addTpSl.ts --tp 2500 --sl 2000`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/02-update-tpsl.json`
  - Codepath: `updatePositionTPSL()`
  - Evidence: PASS 6/6. **Fixed 2 bugs**: (1) triggerType was NONE→now GTE/LTE based on direction, (2) tpSize/slSize were 0→now full position size.

- [x] **03-add-margin** — Add $10 margin to open position
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx addMargin.ts --usd 10`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/03-add-margin.json`
  - Codepath: `updateMargin()`
  - Evidence: PASS 6/6. **Fixed bug**: quoteToken was Account contract `0xB219...`→now collateral token `0xD984...`.

- [x] **04-close-position** — Close single position, verify removed
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --close <positionId>`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/04-close-position.json`
  - Codepath: `closePosition()`
  - Evidence: PASS 5/5 steps. Place → poll → close → poll → verified 0 positions.

- [x] **05-place-and-close-all** — Place order -> close all -> verify zero positions
  - PoC: Use `placeOrder.ts` + `showAccount.ts` to verify, then batch close via CDP only
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/05-place-and-close-all.json`
  - Codepath: `closePositions()`
  - Evidence: PASS 5/5 steps. closeAll returns {successCount:1, failureCount:0}.

### Order Fills

- [x] **11-read-fills** — Read order fills (needs prior trades)
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx listOrders.ts`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/11-read-fills.json`
  - Codepath: `getOrderFills()`
  - Evidence: PASS 2/2 steps. Returns [] (no fills yet — expected with 0 balance)

### Limit Orders (test 08 first — determines if 06/07 are viable)

- [x] **08-place-limit-order** — Place limit buy, verify in open orders
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 150 --leverage 2 --type limit --price 1000`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/08-place-limit-order.json`
  - Codepath: `placeOrder()` (limit path)
  - Evidence: PoC PASS — tx `0xb843ace6...` confirmed on Linea Sepolia. **Root cause was `triggerType: 0` (NONE) for limit orders** — contract needs LTE/GTE to know when keeper should execute. Fix: LONG limit→LTE, SHORT limit→GTE (using SDK consts). The SDK already handles execution fees internally via `getNetworkFee()`. CDP recipe: auth PASS, placeOrder reaches SDK correctly (params validated in Metro logs) but app wallet `0x8dc623...` lacks Linea Sepolia ETH for gas — testnet funding issue, not code bug.

- [x] **06-cancel-order** — Place limit -> cancel -> verify removed (depends on 08)
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --cancel <orderId>`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/06-cancel-order.json`
  - Codepath: `cancelOrder()`
  - Evidence: CDP PASS 5/5. Place limit→wait→cancel (success:true, orderId:83)→verified.

- [x] **07-edit-order** — Place limit -> edit price -> cleanup (depends on 08)
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx editOrder.ts --price-pct 1`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/07-edit-order.json`
  - Codepath: `editOrder()`
  - Evidence: CDP PASS 6/6. **Fixed bug**: `quoteToken` was Account contract address (`0xB219...`) → now collateral token (`0xD984...`). Same pattern as recipe 03 margin fix.

### Full Lifecycle

- [x] **full-cycle** — Place -> TP/SL -> margin -> close -> log check
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/full-cycle.json`
  - Evidence: CDP PASS 11/11. auth→cleanup→place market→wait→TP/SL→add margin→verify→close→wait→log check. All eval-ref based (UI flows are HyperLiquid-specific).

## Execution Order

```
Read-only first (no on-chain cost):
  09-read-markets     -> PoC: listMarkets.ts     -> Recipe -> Review getMarkets/getMarketDataWithPrices
  10-read-account     -> PoC: showAccount.ts      -> Recipe -> Review getAccountState
  12-calculate-fees   -> Recipe only              -> Review calculateFees
  13-validate-order   -> Recipe only              -> Review validateOrder

Write operations:
  01-place-market-order -> PoC: placeOrder.ts     -> Recipe -> Review placeOrder
  02-update-tpsl        -> PoC: addTpSl.ts        -> Recipe -> Review updatePositionTPSL
  03-add-margin         -> PoC: addMargin.ts       -> Recipe -> Review updateMargin
  04-close-position     -> PoC: closeOrder.ts      -> Recipe -> Review closePosition
  05-place-and-close-all -> PoC: placeOrder+close  -> Recipe -> Review closePositions
  11-read-fills         -> Recipe (needs prior trades) -> Review getOrderFills
  08-place-limit-order  -> PoC: placeOrder --type limit -> Recipe -> Review placeOrder(limit)
  06-cancel-order       -> PoC: closeOrder --cancel -> Recipe -> Review cancelOrder
  07-edit-order         -> PoC: editOrder.ts       -> Recipe -> Review editOrder

Integration:
  full-cycle            -> Recipe only (all-in-one) -> Final log_watch check
```

## How to Validate

### Per-recipe flow
```bash
# Step 1: PoC script (isolated SDK validation)
cd scripts/perps/myx-poc && NETWORK=testnet npx tsx <script>.ts <args>

# Step 2: CDP recipe (full app validation)
bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/teams/perps/myx-validation/<recipe>.json

# Step 3: DevLogger evidence
grep 'MYX-VAL\|PERPS_DEBUG' .agent/metro.log | tail -10

# Step 4: Update this tracker — change [ ] to [x], paste evidence
```

### Run all recipes
```bash
for f in scripts/perps/agentic/teams/perps/myx-validation/0*.json scripts/perps/agentic/teams/perps/myx-validation/1*.json; do
  echo "=== $(basename $f) ==="
  bash scripts/perps/agentic/validate-recipe.sh "$f" --skip-manual || echo "FAILED: $f"
done
```

## Codepath Review Findings

_To be filled during validation execution. Each feature's MYXProvider method is reviewed against `.agent/perps-review-antipatterns.md`._

| Severity | Category | Lines | Finding | Status |
|----------|----------|-------|---------|--------|
| Medium | Magic number | 633 | `60_000` TTL inline | **FIXED** → `MYX_MARKET_DETAIL_CACHE_TTL_MS` |
| Medium | Magic number | 807-808, 1160-1173 | `1.05`/`0.95` slippage buffer | **FIXED** → `MYX_SLIPPAGE_BUFFER_HIGH/LOW` |
| Medium | Magic number | 791-792 | `BigInt(1e6)` | **FIXED** → `BigInt(MYX_FEE_RATE_PRECISION)` |
| Low | Magic number | 2038 | `0.0001` near-zero guard | **FIXED** → `MYX_NEAR_ZERO_THRESHOLD` |
| Low | Magic number | 1644-1772 | `limit: 50` x4 | **FIXED** → `MYX_HISTORY_QUERY_LIMIT` |
| Low | Magic number | 2023-2065 | `2 * maxLeverage` x2 | **FIXED** → `MYX_MAINTENANCE_MARGIN_MULTIPLIER` |
| Low | Magic string | 319 | `'MYX mainnet not yet available'` | OK — kept as `MYX_NOT_SUPPORTED_ERROR` constant |
| Low | Magic string | 140-141 | Block explorer URLs | **FIXED** → `MYX_BLOCK_EXPLORER_URL` in myxConfig |
| Medium | `as unknown as X` | 1181, 1367 | `rawPos as unknown as` | **FIXED** → `getUserLeverage()` helper, clean cast |
| Medium | Protocol coupling | 116 | `hyperLiquidValidation` import | OK — `validateOrderParams` is generic despite file name |
| Low | Missing ensureError | 1910, 1976 | Manual `instanceof Error` | **FIXED** → `ensureError()` + `logger.error()` |
| Low | Missing Sentry log | 1910, 1976 | Missing `logger.error` | **FIXED** → added Sentry logging |
| OK | `__DEV__` usage | N/A | Not found — clean | |
| OK | `console.log` | N/A | Not found — uses debugLogger | |
| OK | `eslint-disable` | N/A | Not found — clean | |

## MYX SDK Missing Exports (report to MYX team)

The following types/interfaces are declared in `@myx-trade/sdk` `index.d.ts` but **not exported**, forcing us to define local duplicates in `myx-types.ts`. MYX should export these in a future SDK release.

| SDK type | Local duplicate | Used by | Notes |
|---|---|---|---|
| `OrderItem` | `MYXOrderItem` | `getOrders()` return type, `adaptOrderItemFromMYX` | Active/pending orders (limit, trigger). 28 fields. |
| `UpdateOrderParams` | `MYXUpdateOrderParams` | `editOrder()` | 12 fields including orderId, size, price, TP/SL. |
| `KlineData` | `MYXKlineWsData` | WebSocket kline subscription callback | Single-char property names (E, T, c, h, l, o, t, v). |

**Other commonly-used types that ARE exported** (no action needed): `PlaceOrderParams`, `PositionTpSlOrderParams`, `SignerLike`, `PoolSymbolAllResponse`, `TickerDataItem`, `PositionType`, `HistoryOrderItem`, `PoolOpenOrder`, `KlineDataItemType`, `KlineDataResponse`, `KlineResolution`.

**Additional SDK issues found during integration:**
1. `client.getAccessToken()` returns `null` even after successful `client.auth()` — this breaks `api.getPoolOpenOrders()` which requires a valid access token header. Workaround: use `order.getOrders()` instead.
2. `TriggerType`, `Direction`, `OrderType`, `TimeInForce` are exported as runtime values but their corresponding type aliases are also needed for type annotations (e.g. `typeof MYXTriggerType[keyof typeof MYXTriggerType]`). A simpler `type TriggerType = 0 | 1 | 2` export would help.

## Testnet Environment Status (2026-03-24)

**UNBLOCKED — MYX team provided new broker addresses for SDK 1.0.4+ contracts (2026-03-22).**

### Current state
- SDK upgraded from 1.0.4 -> **1.0.6** (done, zero type errors).
- New broker addresses deployed against current contracts:
  - **Linea Sepolia (59141)**: `0x30b1bc9234fea72daba5253bf96d56a91483cbc0` (owner `0xAdA1c11226C0c1EFb001049334C14B0C70a0D84e`)
  - **Arb Sepolia (421614)**: `0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176` (owner `0x49F983F21379D70b7756588E6C9b11f26fF3a4Bd`)
- Active pool on Linea Sepolia: **META** (poolId `0x13b0abcc...`, chainId 59141, state=2/Trench, ticker ~$2140).
- **placeOrder validated via app provider** — success:true, position created, close works.
- **Account**: `0x316BDE...` with ~$10k testnet USDC on Linea Sepolia.

### Critical Learnings (2026-03-24 Validation Session)

1. **Broker address env var**: `MM_PERPS_MYX_BROKER_ADDRESS_TESTNET` must be in `.js.env`. The `transform-inline-environment-variables` babel plugin bakes it at compile time. **Metro cache must be fully cleared** (trash `/tmp/metro-cache` + restart + relaunch app) after changing the value. A simple Metro restart or `--clear` flag is NOT enough.

2. **Old vs new broker**: SDK default broker `0x0FB08D3A...` is the OLD testnet broker (pre-1.0.4). The correct broker is `0x30b1bc9234...`. If the env var is missing or not compiled in, all write operations silently fail with contract reverts.

3. **Cross-chain pools**: MYX testnet spans chainId 59141 (Linea Sepolia) and 421614 (Arb Sepolia). The broker address is chain-specific. `MYXClientService.getMarkets()` now filters pools to match the configured chainId to avoid showing untradeable markets.

4. **Minimum order size**: $100 USD minimum on MYX (contract-enforced). `validateOrder` returns `ORDER_SIZE_MIN` with the actual per-market minimum (~$111 for META).

5. **Wait times**: MYX chain confirmation takes 10-15s, not 5s. All write recipe waits set to 15s.

6. **Account state fields**: MYX provider returns `availableBalance` (not `freeMargin`). Eval refs must use provider-direct calls (`c.providers.get('myx')`) — controller-level calls don't include `providerId` field.

7. **Collateral token**: USDC at `0xD984fd34f91F92DA0586e1bE82E262fF27DC431b` on Linea Sepolia (6 decimals). Orders pull USDC directly from wallet — no separate deposit step needed.

8. **Eval ref resolution**: Recipe refs `myx/X` resolve to `perps/myx/X` (3-part) via validate-recipe.sh. Eval files live at `teams/perps/evals/myx.json`.

### Known Limitations
- **Wait times**: 15s between action and assertion. Increase if chain is slow.
- **Idempotency**: Recipes 02-04 auto-place a position if none exists.
- **Limit orders**: Fixed — root cause was `triggerType: 0` (NONE). Now uses LTE/GTE based on direction. PoC validated on META pool.
- **Pre-conditions**: All MYX recipes require `perps.myx_testnet_ready` pre-condition (checks testnet enabled, MYX active, provider authenticated).
