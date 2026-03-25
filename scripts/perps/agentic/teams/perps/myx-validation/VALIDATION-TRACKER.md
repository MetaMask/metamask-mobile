# MYX Write Integration — QA Validation Tracker

Branch: `feat/perps/myx-write-integration`

## 3-Tier Validation Process

Each recipe is validated through 3 tiers, executed sequentially:

| Tier | Method | Evidence | Who |
|------|--------|----------|-----|
| **1 - PoC** | Standalone script (`scripts/perps/myx-poc/`) | stdout capture | Agent |
| **2 - CDP** | `validate-recipe.sh` + video recording | recipe output + .mp4 | Agent |
| **3 - Human** | Watch .mp4, confirm pass/fail | User says "next" | Human |

### Commands
```bash
# Tier 1 — PoC script
cd scripts/perps/myx-poc && NETWORK=testnet npx tsx <script>.ts <args>

# Tier 2 — CDP recipe + video
xcrun simctl io 41EBD318-9727-468C-ABCA-3174F0520624 recordVideo \
  --codec h264 .agent/screenshots/myx-qa/<recipe-name>.mp4 &
RECORD_PID=$!
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/myx-validation/<recipe>.json
kill -INT $RECORD_PID; wait $RECORD_PID 2>/dev/null

# Tier 3 — Human watches .mp4, says "next"
```

## QA Checklist

### Read-Only Operations (no on-chain cost)

- [ ] **1. 09-read-markets** — Fetch MYX markets with prices
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx listMarkets.ts` — _pending_
  - Tier 2: recipe + `myx-qa/09-read-markets.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `getMarkets()`, `getMarketDataWithPrices()`

- [ ] **2. 10-read-account** — Fetch account state (availableBalance, totalBalance)
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx showAccount.ts` — _pending_
  - Tier 2: recipe + `myx-qa/10-read-account.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `getAccountState()`

- [ ] **3. 12-calculate-fees** — Calculate fees for $1000 trade
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx checkPoolMinOrder.ts` (verifies pool fee config) — _pending_
  - Tier 2: recipe + `myx-qa/12-calculate-fees.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `calculateFees()`

- [ ] **4. 13-validate-order** — Validate small ($1, expect invalid) and valid ($120, expect valid) orders
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx checkPoolMinOrder.ts` (verifies per-pool min order size) — _pending_
  - Tier 2: recipe + `myx-qa/13-validate-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `validateOrder()`

- [ ] **5. 11-read-fills** — Read order fills (needs prior trades)
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx listOrders.ts` — _pending_
  - Tier 2: recipe + `myx-qa/11-read-fills.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `getOrderFills()`

### Market Orders

- [ ] **6. 01-place-market-order** — Place market buy, verify position created
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 11 --leverage 2 --type market` — _pending_
  - Tier 2: recipe + `myx-qa/01-place-market-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `placeOrder()`

### Position Management

- [ ] **7. 02-update-tpsl** — Set TP/SL on open position
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx addTpSl.ts --tp 2500 --sl 2000` — _pending_
  - Tier 2: recipe + `myx-qa/02-update-tpsl.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `updatePositionTPSL()`

- [ ] **8. 03-add-margin** — Add $10 margin to open position
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx addMargin.ts --usd 10` — _pending_
  - Tier 2: recipe + `myx-qa/03-add-margin.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `updateMargin()`

- [ ] **9. 04-close-position** — Close single position, verify removed
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --close <positionId>` — _pending_
  - Tier 2: recipe + `myx-qa/04-close-position.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `closePosition()`

- [ ] **10. 05-place-and-close-all** — Place order -> close all -> verify zero positions
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 11 --leverage 2 --type market` then `npx tsx closeOrder.ts --close-all` — _pending_
  - Tier 2: recipe + `myx-qa/05-place-and-close-all.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `closePositions()`

### Limit Orders

- [ ] **11. 08-place-limit-order** — Place limit buy, verify in open orders
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 150 --leverage 2 --type limit --price 1000` — _pending_
  - Tier 2: recipe + `myx-qa/08-place-limit-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `placeOrder()` (limit path)

- [ ] **12. 06-cancel-order** — Place limit -> cancel -> verify removed
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --cancel <orderId>` — _pending_
  - Tier 2: recipe + `myx-qa/06-cancel-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `cancelOrder()`

- [ ] **13. 07-edit-order** — Place limit -> edit price -> cleanup
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx editOrder.ts --price-pct 1` — _pending_
  - Tier 2: recipe + `myx-qa/07-edit-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `editOrder()`

### Full Lifecycle

- [ ] **14. full-cycle** — Place -> TP/SL -> margin -> close -> log check
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 11 --leverage 2 --type market` then `npx tsx addTpSl.ts --tp 2500 --sl 2000` then `npx tsx addMargin.ts --usd 10` then `npx tsx closeOrder.ts --close <positionId>` — _pending_
  - Tier 2: recipe + `myx-qa/full-cycle.mp4` — _pending_
  - Tier 3: human review — _pending_

## Codepath Review Findings

| Severity | Category | Lines | Finding | Status |
|----------|----------|-------|---------|--------|
| Medium | Magic number | 633 | `60_000` TTL inline | FIXED -> `MYX_MARKET_DETAIL_CACHE_TTL_MS` |
| Medium | Magic number | 807-808, 1160-1173 | `1.05`/`0.95` slippage buffer | FIXED -> `MYX_SLIPPAGE_BUFFER_HIGH/LOW` |
| Medium | Magic number | 791-792 | `BigInt(1e6)` | FIXED -> `BigInt(MYX_FEE_RATE_PRECISION)` |
| Low | Magic number | 2038 | `0.0001` near-zero guard | FIXED -> `MYX_NEAR_ZERO_THRESHOLD` |
| Low | Magic number | 1644-1772 | `limit: 50` x4 | FIXED -> `MYX_HISTORY_QUERY_LIMIT` |
| Low | Magic number | 2023-2065 | `2 * maxLeverage` x2 | FIXED -> `MYX_MAINTENANCE_MARGIN_MULTIPLIER` |
| Low | Magic string | 319 | `'MYX mainnet not yet available'` | OK -- kept as `MYX_NOT_SUPPORTED_ERROR` constant |
| Low | Magic string | 140-141 | Block explorer URLs | FIXED -> `MYX_BLOCK_EXPLORER_URL` in myxConfig |
| Medium | `as unknown as X` | 1181, 1367 | `rawPos as unknown as` | FIXED -> `getUserLeverage()` helper, clean cast |
| Medium | Protocol coupling | 116 | `hyperLiquidValidation` import | OK -- `validateOrderParams` is generic despite file name |
| Low | Missing ensureError | 1910, 1976 | Manual `instanceof Error` | FIXED -> `ensureError()` + `logger.error()` |
| Low | Missing Sentry log | 1910, 1976 | Missing `logger.error` | FIXED -> added Sentry logging |

## MYX SDK Missing Exports (report to MYX team)

| SDK type | Local duplicate | Used by | Notes |
|---|---|---|---|
| `OrderItem` | `MYXOrderItem` | `getOrders()` return type, `adaptOrderItemFromMYX` | Active/pending orders (limit, trigger). 28 fields. |
| `UpdateOrderParams` | `MYXUpdateOrderParams` | `editOrder()` | 12 fields including orderId, size, price, TP/SL. |
| `KlineData` | `MYXKlineWsData` | WebSocket kline subscription callback | Single-char property names (E, T, c, h, l, o, t, v). |

## Testnet Environment Status

- SDK version: **1.0.6**
- Broker (Linea Sepolia 59141): `0x30b1bc9234fea72daba5253bf96d56a91483cbc0`
- Broker (Arb Sepolia 421614): `0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176`
- Active pool: META (Linea Sepolia, poolId `0x13b0abcc...`, state=2/Trench)
- Account: `0x316BDE...` with ~$10k testnet USDC

## Critical Learnings

1. **Broker env var**: `MM_PERPS_MYX_BROKER_ADDRESS_TESTNET` in `.js.env`. Babel bakes at compile time — must trash `/tmp/metro-cache` + restart + relaunch after changing.
2. **Wait times**: MYX chain confirmation 10-15s. All write recipe waits set to 15s.
3. **Collateral token**: USDC `0xD984fd34...` on Linea Sepolia (6 decimals). No deposit step needed.
4. **Eval ref resolution**: `myx/X` -> `perps/myx/X` (3-part) via validate-recipe.sh.
5. **Provider-direct evals**: Must use `c.providers.get('myx')` — controller-level calls lack `providerId`.
