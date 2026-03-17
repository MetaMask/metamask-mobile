# MYX Wallet Integration — Balance, Close Position, Cancel Order

## Status

| Step | Description                                                               | Status                                                   |
| ---- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| 0    | Commit PoC scripts (already staged)                                       | PENDING — waiting for user                               |
| 1    | Fix `getAccountInfo` tuple parsing + balance formula + subscribeToAccount | VERIFIED ($987.84 in UI, matches PoC 987.8364)           |
| 2    | Implement `closePosition` in MYXProvider                                  | DONE                                                     |
| 3    | Implement `cancelOrder` in MYXProvider + MYXClientService                 | DONE                                                     |
| 4    | Verify position adapter has all fields                                    | DONE (positionId, direction already in SDK PositionType) |
| 4b   | Fix test file type errors (txHash, account state tests)                   | DONE                                                     |
| 5    | End-to-end CDP validation on testnet                                      | PENDING                                                  |

## Changes Made

### Step 1: Fix balance (myxAdapter.ts + MYXClientService.ts + MYXProvider.ts)

- **Bug 1 (tuple parsing)**: `getAccountInfo` returns a 7-element **array** (tuple), but code accessed it as a keyed object (`accountInfo.totalCollateral` → `undefined` → zeros).
- **Bug 2 (pool iteration)**: `getAccountState` used `poolsCache[0]` which may be a pool with no user deposits → SDK returns `code: -1, data: undefined`. Fix: iterate pools until one returns valid data.
- **Bug 3 (decimal scaling)**: Tuple values are in token-native decimals (USDC=6, USDT=18), not human-readable. Used `fromMYXApiCollateral` (parseFloat) instead of `fromMYXCollateral` (divides by 10^decimals). Fix: pass network to `adaptAccountStateFromMYX`, use `fromMYXCollateral`.
- **Fix**: Added `parseAccountTuple()`, pool iteration loop, proper decimal scaling.
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

| File                                                 | Change                                 |
| ---------------------------------------------------- | -------------------------------------- |
| `app/controllers/perps/utils/myxAdapter.ts`          | Fixed tuple parsing + balance formula  |
| `app/controllers/perps/services/MYXClientService.ts` | Fixed return type, added cancelOrder   |
| `app/controllers/perps/providers/MYXProvider.ts`     | Implemented closePosition, cancelOrder |

## Validation Plan

```bash
# Balance
NETWORK=TESTNET npx tsx scripts/perps/myx-poc/showAccount.ts

# Close position
NETWORK=TESTNET npx tsx scripts/perps/myx-poc/closeOrder.ts --close <positionId>

# Cancel order
NETWORK=TESTNET npx tsx scripts/perps/myx-poc/closeOrder.ts --cancel <orderId>
```

## SDK Type Gaps (userLeverage)

The MYX SDK `PositionType` is incomplete — API returns extra fields at runtime:

- `userLeverage: number`
- `baseSymbol: string`
- `quoteSymbol: string`
- `tradingFee: string`
- `freeAmount: string`

These are documented in `scripts/perps/myx-poc/MYX-SDK-INCONSISTENCIES.md` and `common.ts:PositionData`.
