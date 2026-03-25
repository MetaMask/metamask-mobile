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

- [x] **01-read-markets** — Fetch MYX markets with prices
  - Tier 1: PASS — 8 markets found, META @ $2160, most pools inactive (expected on testnet)
  - Tier 2: PASS (2/2) — `myx-qa/01-read-markets.mp4`
  - Tier 3: PASS — human confirmed

- [x] **02-read-account** — Fetch account state (availableBalance, totalBalance)
  - Tier 1: PASS — Available Margin $10,273.55 (Free Margin $620.87 + Wallet Balance $9,652.68)
  - Tier 2: PASS (2/2) — `myx-qa/02-read-account.mp4`
  - Tier 3: PASS — human confirmed
  - Learning: SDK returns typed `AccountInfo` object (not a tuple). Fixed `parseAccountTuple` to use correct field names (`freeMargin`, `quoteProfit`, etc.). Unrealized PnL comes from positions, not `getAccountInfo()`. All 7 MYX UI fields now captured: Available Margin, Free Margin, Wallet Balance, Locked Realized PnL USDC, Unrealized PnL, Withdrawable META, Locked Realized PnL META.

- [x] **03-calculate-fees** — Calculate fees for $1000 trade
  - Tier 1: PASS — Taker 0.02% (testnet), protocol fee $0.20 for $1000, referrer/referral rebates both $0
  - Tier 2: PASS (4/4) — `myx-qa/03-calculate-fees.mp4`
  - Tier 3: PASS — human confirmed
  - Learning: Testnet taker rate (0.02%) differs from mainnet (0.055%). Historical trades confirm execution fees of -$1 per order. Referrer rebates are $0 because `setUserFeeData` has not been called yet.
  - **Broker validation** (`brokerValidation.ts`): 5/5 tests PASS:
    1. Broker address matches MYX-provided credentials (Linea Sepolia `0x30b1bc...`)
    2. SDK client accepts broker address in config
    3. `setUserFeeData` is callable on-chain (contract at broker address, reverts with `ECDSAInvalidSignature` on dummy sig)
    4. `referrals.claimRebate()` method exists and is a function
    5. Trade history includes `referrerRebate`, `referralRebate`, `rebateClaimedAmount` fields (currently null/0)
  - **Broker rebate activation** (`activateBrokerRebate.ts`): BLOCKED — `setUserFeeData` is an on-chain contract call on the broker contract itself. It requires an EIP-712 signature from the broker owner. We have the owner private key (`0xAdA1c1...`) and the contract name is "Metamask Broker", but the exact EIP-712 domain (version) and struct type hash are unknown. Contract reverts with `NotBrokerSigner(recovered_address)` — the recovered signer doesn't match because our EIP-712 typed data hash doesn't match the contract's.
  - **ACTION NEEDED**: Ask MYX team for the exact EIP-712 domain spec (version string, struct name/layout) used by the broker contract's `setUserFeeData`, or ask them to provide a working example of calling `setUserFeeData` with a valid signature. PoC script `activateBrokerRebate.ts` is ready — just needs the correct EIP-712 types.

- [x] **04-validate-order** — Validate small ($5, expect invalid) and valid ($150, expect valid) orders
  - Tier 1: PASS — Per-pool min order $10 for META/CXY/MASK. Most pools return N/A (no level config).
  - Tier 2: PASS (21/21) — `myx-qa/04-validate-order.mp4`. Navigates to META market, opens trade form, types $5 (rejected `ORDER_SIZE_MIN` min $11), types $150 (accepted). Screenshots both states.
  - Tier 3: PASS — human confirmed
  - Learning: Controller returns `minimumRequired: 11` (adds safety margin over the $10 on-chain min). Validation is synchronous — no on-chain call needed. Does NOT place the order — that's tested in 06.

- [x] **05-read-fills** — Read order fills (needs prior trades)
  - Tier 1: PASS — 20 orders in history (7 filled market orders, 13 rejected/cancelled limit/trigger orders)
  - Tier 2: PASS (5/5) — `myx-qa/05-read-fills.mp4`. Navigates to Perps home, shows activity section with recent trades.
  - Tier 3: human review — _pending_
  - Learning: Fills include filled market orders and rejected orders with `cancelReason`. Type `2` orders are trigger (TP/SL) orders.

### Market Orders

- [x] **06-place-market-order** — Place market buy, verify position created
  - Tier 1: PASS — PoC placed $150 META LONG 2x, tx `0x98789a...`, position confirmed at entry $2156.05
  - Tier 2: PASS (7/7, flow 13/13) — `myx-qa/06-place-market-order.mp4`. Full UI: market detail → Long → $150 → Place Order → position appeared (META entry $2155.55) → cleanup closed position → 0 positions
  - Tier 3: human review — _pending_
  - Learning: MYX chain confirmation ~10s on testnet. Position appeared within first poll cycle. Cleanup via eval_ref close is faster than UI close for recipe cleanup.

### Position Management

- [x] **07-update-tpsl** — Set TP/SL on open position
  - Tier 1: PASS — TP $2500 + SL $2000 set on META LONG, tx `0x6846ef...`, 2 trigger orders created. PoC shows TP/SL columns in position table.
  - Tier 2: PASS (21/21, flow 13/13) — `myx-qa/07-update-tpsl.mp4`. Full UI: opens position → presses auto-close toggle → TP/SL screen → +25% TP / -10% SL → Set → navigates back → scrolls to show "Auto close: TP $X / SL $Y" with Edit button → cleanup
  - Tier 3: human review — _pending_
  - **BUG FIXED**: MYX positions had `takeProfitPrice: undefined` because TP/SL are separate trigger orders, not position attributes. Fixed `getPositions()` to cross-reference open orders by `positionId` and inject TP/SL prices. Also fixed `adaptOrderItemFromMYX` to detect trigger orders (`orderType 2/3`) and set `isTrigger: true`, `isPositionTpsl: true`, `detailedOrderType: "Take Profit"/"Stop Loss"`.
  - Learning: MYX TP/SL are separate decrease trigger orders. TP uses GTE trigger (LONG) / LTE (SHORT), SL uses LTE (LONG) / GTE (SHORT). Cross-reference by `positionId` on `MYXOrderItem`.

- [x] **08-add-margin** — Add $10 margin to open position
  - Tier 1: PASS — Margin $150 -> $160 (+$10), tx `0x0e91e9...`
  - Tier 2: PASS (15/15, flow 13/13) — `myx-qa/08-add-margin.mp4`. Opens position → shows Margin $150 → adds $10 → shows Margin $160 → cleanup
  - Tier 3: human review — _pending_
  - Codepath: `updateMargin()`

- [x] **09-close-position** — Close single position, verify removed
  - Tier 1: PASS — Position opened and closed, tx confirmed
  - Tier 2: PASS (11/11, flow 13/13) — `myx-qa/09-close-position.mp4`. Shows "Modify / Close Long" before → closes → shows "Long / Short" after (position gone)
  - Tier 3: human review — _pending_
  - Learning: Testnet keeper can get stuck when multiple orders queue. Cancel stale orders before placing new ones.

- [ ] **10-place-and-close-all** — Place order -> close all -> verify zero positions
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 11 --leverage 2 --type market` then `npx tsx closeOrder.ts --close-all` — _pending_
  - Tier 2: recipe + `myx-qa/10-place-and-close-all.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `closePositions()`

### Limit Orders

- [ ] **11-place-limit-order** — Place limit buy, verify in open orders
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 150 --leverage 2 --type limit --price 1000` — _pending_
  - Tier 2: recipe + `myx-qa/11-place-limit-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `placeOrder()` (limit path)

- [ ] **12-cancel-order** — Place limit -> cancel -> verify removed
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --cancel <orderId>` — _pending_
  - Tier 2: recipe + `myx-qa/12-cancel-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `cancelOrder()`

- [ ] **13-edit-order** — Place limit -> edit price -> cleanup
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx editOrder.ts --price-pct 1` — _pending_
  - Tier 2: recipe + `myx-qa/13-edit-order.mp4` — _pending_
  - Tier 3: human review — _pending_
  - Codepath: `editOrder()`

### Full Lifecycle

- [ ] **14-full-cycle** — Place -> TP/SL -> margin -> close -> log check
  - Tier 1: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 11 --leverage 2 --type market` then `npx tsx addTpSl.ts --tp 2500 --sl 2000` then `npx tsx addMargin.ts --usd 10` then `npx tsx closeOrder.ts --close <positionId>` — _pending_
  - Tier 2: recipe + `myx-qa/14-full-cycle.mp4` — _pending_
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
| Medium | Wrong SDK type mapping | myxAdapter.ts | `parseAccountTuple` used array indices instead of SDK `AccountInfo` field names | FIXED -> correct field mapping (`freeMargin`, `quoteProfit`, etc.) |
| Medium | Misattributed field | myxAdapter.ts | `quoteProfit` (locked realized PnL) mapped as `unrealizedPnl` | FIXED -> unrealized PnL now computed from positions |

## MYX SDK Missing Exports (report to MYX team)

| SDK type | Local duplicate | Used by | Notes |
|---|---|---|---|
| `OrderItem` | `MYXOrderItem` | `getOrders()` return type, `adaptOrderItemFromMYX` | Active/pending orders (limit, trigger). 28 fields. |
| `UpdateOrderParams` | `MYXUpdateOrderParams` | `editOrder()` | 12 fields including orderId, size, price, TP/SL. |
| `KlineData` | `MYXKlineWsData` | WebSocket kline subscription callback | Single-char property names (E, T, c, h, l, o, t, v). |

## Testnet Broker Credentials

MYX team provided dedicated broker addresses for MetaMask (2026-03-22):

| Network | Chain | Owner Address | Broker Address |
|---------|-------|--------------|----------------|
| Arb Sepolia | 421614 | `0x49F983F21379D70b7756588E6C9b11f26fF3a4Bd` | `0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176` |
| Linea Sepolia | 59141 | `0xAdA1c11226C0c1EFb001049334C14B0C70a0D84e` | `0x30b1bc9234fea72daba5253bf96d56a91483cbc0` |

Owner private keys are in `.myx.env` (gitignored). The broker address is set via `MM_PERPS_MYX_BROKER_ADDRESS_TESTNET` in `.js.env` and tags every trade for referral rebate attribution. Revenue activation requires calling `setUserFeeData()` with an EIP-712 signature from MYX's backend — not yet available.

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
6. **Fee rate precision**: 1e8 (not 1e6). SDK returns `55000` for 0.055% taker fee. Testnet rate is `20000` (0.02%).
7. **SDK AccountInfo type**: Returns a typed object `{ freeMargin, walletBalance, freeBaseAmount, baseProfit, quoteProfit, reservedAmount, releaseTime }` — NOT a 7-element tuple. `quoteProfit` = Locked Realized PnL USDC. Unrealized PnL is NOT in this response — it comes from per-position data.
8. **Broker revenue model**: MYX uses referral rebates, not a direct fee. Broker address tags trades (done). Revenue requires `setUserFeeData()` — this is an on-chain call to the broker contract (NOT a backend API). Requires EIP-712 signature from broker owner (`0xAdA1c1...`). We have the owner private key but don't know the exact EIP-712 domain version/struct layout. Contract name is "Metamask Broker". Need MYX team to provide the EIP-712 spec or a working example.
9. **`setUserFeeData` is on `client.account`** (not `client.utils` as the SDK types suggest). Method: `client.account.setUserFeeData(address, chainId, deadline, params, signature)`.
10. **`referrals.claimRebate`** exists and is callable. Takes `tokenAddress` (collateral token). This is how MetaMask withdraws accumulated rebates after activation.
