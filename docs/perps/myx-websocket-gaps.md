# MYX SDK WebSocket Gaps

## Context

MetaMask's perps UI requires real-time streaming for positions, orders, fills, and account state. The MYX SDK currently supports WebSocket for prices/candles but NOT for account-level data. We're forced to REST-poll every 5 seconds, which is:

- Higher latency (5s delay vs instant)
- More network traffic (repeated full fetches vs incremental updates)
- Worse UX (positions/balance appear with delay after trades)

## Currently Available WebSocket Channels

| Channel          | SDK Method          | Status    |
| ---------------- | ------------------- | --------- |
| Tickers (prices) | `subscribeTickers`  | Working   |
| Klines (candles) | `subscribeKline`    | Working   |
| Positions        | `subscribePosition` | Unclear\* |

\*`subscribePosition` exists in the SDK types but behavior is unclear — does it push updates when positions change (open/close/liquidation)?

## Missing WebSocket Channels (currently REST-polled)

### 1. Account State (Balance)

- **Current**: REST polling `getAccountInfo(poolId, address)` every 5s across all pools
- **Need**: WebSocket push when balance changes (deposit, withdrawal, order fill, funding payment)
- **Payload**: `{ freeAmount, walletBalance, reservedAmount, orderHoldInUSD, totalCollateral, lockedRealizedPnl, unrealizedPnl }`

### 2. Positions

- **Current**: REST polling `listPositions(address)` every 5s
- **Need**: WebSocket push on position open/close/modify/liquidation
- **Payload**: Full `PositionType` array (or incremental delta)
- **Note**: If `subscribePosition` already does this, we need documentation/examples

### 3. Open Orders

- **Current**: REST polling `getOrderHistory(params, address)` every 5s, filtering for open orders
- **Need**: WebSocket push on order create/fill/cancel/expire
- **Payload**: `{ orderId, status, orderType, direction, size, price, ... }`

### 4. Order Fills

- **Current**: REST polling `getOrderHistory` filtered by status=Successful
- **Need**: WebSocket push on each fill
- **Payload**: `{ orderId, symbol, side, size, price, fee, timestamp, ... }`

## Questions for MYX Team

1. Does `subscribePosition` push real-time updates when positions change? What events trigger updates?
2. Is there a roadmap for WebSocket account/order/fill streaming?
3. What is the recommended way to detect position changes in real-time?
4. Are there rate limits on the REST endpoints we're polling?
5. Can `getAccountInfo` be called without specifying a poolId (aggregate across all pools)?

## Impact

With WebSocket streaming, we could:

- Show instant balance updates after trades
- Show positions appearing/disappearing in real-time
- Show order status changes immediately
- Reduce network traffic by ~90% (no polling)
- Match feature parity with HyperLiquid provider (which uses full WebSocket streaming)
