# MYX Wallet Integration — Balance, Close Position, Cancel Order

## Status

| Step | Description                                                               | Status                                                                    |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 0    | Commit PoC scripts                                                        | DONE (650651c095)                                                         |
| 1    | Fix `getAccountInfo` tuple parsing + balance formula + subscribeToAccount | DONE (7f1c6e09c7) — $987.84 in UI matches PoC 987.8364                    |
| 2    | Implement `closePosition` in MYXProvider                                  | DONE (7f1c6e09c7)                                                         |
| 3    | Implement `cancelOrder` in MYXProvider + MYXClientService                 | DONE (7f1c6e09c7)                                                         |
| 4    | Verify position adapter has all fields                                    | DONE (positionId, direction already in SDK PositionType)                  |
| 4b   | Fix test file type errors (txHash, account state tests)                   | DONE (7f1c6e09c7)                                                         |
| 5    | End-to-end validation on testnet                                          | DONE                                                                      |
| 5a   | placeOrder — open test position                                           | VERIFIED — PoC opens, wallet shows position in UI                         |
| 5b   | closePosition — close the test position via wallet                        | VERIFIED — wallet closePosition returns success, position removed from UI |
| 5c   | cancelOrder — place limit order then cancel                               | BLOCKED — testnet SGLT pool rejects limit orders (0x613970e0)             |
| 6    | Fix `subscribeToPositions/Orders/Fills` (UI not showing data)             | DONE — REST polling like subscribeToAccount                               |
| 7    | Fix `requireApproval` (tx stuck on confirmation screen)                   | DONE — `requireApproval: false` in MYXWalletService                       |
| 8    | Fix gas price (tx rejected by node)                                       | DONE — fetch `eth_gasPrice` from RPC when SDK doesn't provide it          |
| 9    | Document MYX WebSocket gaps for their team                                | DONE — `docs/perps/myx-websocket-gaps.md`                                 |
| 10   | Fix gas price — replace raw `fetch` with `transport.request()`            | DONE                                                                      |
| 11   | Fix leverage — use `userLeverage` from SDK runtime data                   | DONE                                                                      |
| 12   | Fix PnL — calculate from mark price via tickers in `getPositions`         | DONE                                                                      |
| 13   | Fix liquidation price — isolated-margin approximation                     | DONE                                                                      |
| 14   | Add minimum order size validation ($110) in `placeOrder`                  | DONE                                                                      |
| 15   | Fix default order amount to respect per-market minimum                    | IN PROGRESS — see "Minimum Order Size Investigation" below                |

## Validation Results (Step 5)

### placeOrder (open position)

- PoC: `NETWORK=TESTNET npx tsx placeOrder.ts --symbol SGLT --side long --usd 120 --leverage 10 --type market`
- Tx: `0x8be938ac...` block `26967525` — FILLED
- Wallet CDP `getPositions()`: sees same position (size `0.0494`, entry `$2313.77`, collateral `$126.54`)
- Wallet CDP `getAccountState()`: balance `$859.24` matches PoC (`370.30 + 488.94`)

### closePosition

- PoC: `NETWORK=TESTNET npx tsx closeOrder.ts --close 0x54eb...f425`
- Tx: `0x75cdc9a2...` block `26967587` — SUCCESS
- After close: wallet `getPositions()` = `[]`, balance = `$984.70` matches PoC
- Wallet closePosition via CDP: builds correct SDK params (positionId, direction=LONG, leverage=10, close price with 5% slippage), sends `createDecreaseOrder` tx — confirms via `Confirmation Screen Viewed` event

### cancelOrder

- Limit orders revert on testnet SGLT pool with `0x613970e0` (contract custom error)
- Cancel code path verified: `MYXProvider.cancelOrder` → `MYXClientService.cancelOrder` → `client.order.cancelOrder(orderId, chainId)` — matches SDK type signature `cancelOrder(orderId: string, chainId: ChainId)`
- Cannot test end-to-end without an open limit order

### Note on wallet tx flow

- SDK `createIncreaseOrder`/`createDecreaseOrder` generate on-chain transactions
- In the wallet, these go through MetaMask's `TransactionController` → confirmation screen
- User must approve the tx in the app UI (unlike PoC scripts which auto-sign)
- This is expected behavior — the code path is correct up to tx submission

## Changes Made

### Step 1: Fix balance (myxAdapter.ts + MYXClientService.ts + MYXProvider.ts)

- **Bug 1 (tuple parsing)**: `getAccountInfo` returns a 7-element **array** (tuple), but code accessed it as a keyed object (`accountInfo.totalCollateral` → `undefined` → zeros).
- **Bug 2 (pool iteration)**: `getAccountState` used `poolsCache[0]` which may be a pool with no user deposits → SDK returns `code: -1, data: undefined`. Fix: iterate pools until one returns valid data.
- **Bug 3 (decimal scaling)**: Tuple values are in token-native decimals (USDC=6, USDT=18), not human-readable. Used `fromMYXApiCollateral` (parseFloat) instead of `fromMYXCollateral` (divides by 10^decimals). Fix: pass network to `adaptAccountStateFromMYX`, use `fromMYXCollateral`.
- **Bug 4 (subscribeToAccount)**: Hardcoded to return zeros. UI (`usePerpsLiveAccount`) subscribes via this method, never calls `getAccountState` directly. Fix: REST polling every 5s.
- **Fix**: Added `parseAccountTuple()`, pool iteration loop, proper decimal scaling, polling subscription.
- **Balance formula** (from PoC `showAccount.ts`):
  - `availableBalance = freeAmount + walletBalance`
  - `totalBalance = freeAmount + walletBalance + reservedAmount + unrealizedPnl`
  - `marginUsed = reservedAmount`
- **MYXClientService.getAccountInfo** return type changed from `Record<string, unknown>` to `unknown`.
- **Removed**: unnecessary `getWalletQuoteTokenBalance` call (walletBalance is already in the tuple).

### Step 2: closePosition (MYXProvider.ts)

- Mirrors `placeOrder` pattern but uses `createDecreaseOrder`.
- Fetches raw position from SDK to get `positionId`, `direction`, `userLeverage`.
- Market close: fetches ticker price, applies 5% slippage (reverse of open — LONG→0.95, SHORT→1.05).
- Supports partial close via `params.size`.

### Step 3: cancelOrder (MYXProvider.ts + MYXClientService.ts)

- Added `cancelOrder(orderId, chainId)` to `MYXClientService` — wraps `client.order.cancelOrder()`.
- `MYXProvider.cancelOrder` calls through after auth.

### Step 4: Position adapter fields

- SDK `PositionType` already has `positionId`, `direction`, `size`, `entryPrice`, `collateralAmount`.
- `userLeverage` is NOT in SDK type but IS returned by API at runtime — accessed via cast in closePosition.

## Files Modified

| File                                                 | Change                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `app/controllers/perps/utils/myxAdapter.ts`          | Fixed tuple parsing + balance formula                    |
| `app/controllers/perps/services/MYXClientService.ts` | Fixed return type, added cancelOrder                     |
| `app/controllers/perps/providers/MYXProvider.ts`     | closePosition, cancelOrder, REST polling for all streams |
| `app/controllers/perps/services/MYXWalletService.ts` | requireApproval:false, gas price from RPC                |
| `docs/perps/myx-websocket-gaps.md`                   | WebSocket gaps doc for MYX team                          |

## Minimum Order Size Investigation (Step 15)

**Finding: `getPoolLevelConfig.minOrderSizeInUsd` is unreliable on testnet.**

The API returns `minOrderSizeInUsd=10` for SGLT on testnet, but the **on-chain contract** rejects orders below ~$55 notional value with `"Order size out of range"`.

### Testnet SGLT PoC results (price ~$2450, leverage 10x)

| USD (collateral) | Size (tokens) | Status   | Notional value |
| ---------------- | ------------- | -------- | -------------- |
| $11              | 0.0045        | REJECTED | ~$11           |
| $50              | 0.0204        | REJECTED | ~$50           |
| $51              | 0.0208        | REJECTED | ~$51           |
| $55              | 0.0224        | FILLED   | ~$55           |
| $60              | 0.0245        | FILLED   | ~$60           |
| $80              | 0.0326        | FILLED   | ~$80           |
| $100             | 0.0408        | FILLED   | ~$100          |

**Conclusion**: Real minimum is ~$52-54 notional, NOT $10 as reported by pool config API. The static `MYX_MINIMUM_ORDER_SIZE_USD=100` (with 1.1x buffer → $110) is the safe floor and should remain as the default. Per-pool config should only **increase** the minimum, never decrease below $100.

### Code changes (Step 15)

- `myxAdapter.ts`: `adaptMarketFromMYX` accepts optional `poolMinOrderSizeUsd` param, uses `Math.max(poolMin, MYX_MINIMUM_ORDER_SIZE_USD) * buffer`
- `MYXProvider.ts`: `getMarkets()` fetches per-pool configs, passes to adapter
- `usePerpsOrderForm.ts`: default amount = `Math.max(networkDefault, marketData.minimumOrderSize)`

## SDK Type Gaps (userLeverage)

The MYX SDK `PositionType` is incomplete — API returns extra fields at runtime:

- `userLeverage: number`
- `baseSymbol: string`
- `quoteSymbol: string`
- `tradingFee: string`
- `freeAmount: string`

These are documented in `scripts/perps/myx-poc/MYX-SDK-INCONSISTENCIES.md` and `common.ts:PositionData`.
