# WebSocket Subscription Fixes

## Summary

This PR addresses WebSocket subscription issues identified during the rate limiting incident investigation. The fixes reduce subscription message volume by ~75% and prevent subscription leaks.

## Changes

### 1. Filter DEXs by Allowlist on Mainnet (HIGH PRIORITY)
**Files:** `hyperLiquidConfig.ts`, `HyperLiquidProvider.ts`

- Added `MAINNET_HIP3_CONFIG` with `AutoDiscoverAll: false`
- DEX filtering is now dynamic - extracts DEX names from the `allowlistMarkets` feature flag patterns
- Added `extractDexsFromAllowlist()` method that parses patterns like `xyz:*`, `xyz:TSLA`, or `xyz`
- **Impact:** Reduces from 8 DEXs to 2 (main + xyz), ~75% reduction in subscription messages

### 2. Prevent Duplicate DEX Subscriptions (HIGH PRIORITY)
**File:** `HyperLiquidSubscriptionService.ts`

- Added `pendingClearinghouseSubscriptions` and `pendingOpenOrdersSubscriptions` Maps
- Refactored `ensureClearinghouseStateSubscription()` and `ensureOpenOrdersSubscription()` to check for pending promises
- Concurrent calls now wait for the pending promise instead of creating duplicate subscriptions
- **Impact:** Prevents 50% redundant subscriptions from race conditions

### 3. Fix Candle Subscription Cleanup (HIGH PRIORITY)
**File:** `HyperLiquidClientService.ts`

- Store subscription promise to enable cleanup even when pending
- Updated cleanup function to wait for pending promise and unsubscribe
- **Impact:** Prevents WebSocket subscription leaks when component unmounts before subscription resolves

## Test Results

| Metric | Before | After |
|--------|--------|-------|
| DEXs subscribed | 8 | 2 |
| clearinghouseState subscriptions | 16 | 2 |
| openOrders subscriptions | 16 | 2 |
| Candle subscription leaks | Yes | No |

Verified with full flow test (HomeView → MarketDetails xyz:XYZ100 → Place order → Close position → Back to Home):
- Total outgoing messages: 44
- clearinghouseState subs: 2 (main + xyz)
- openOrders subs: 2 (main + xyz)
- Candle subs/unsubs: 2/2 (balanced)

## Test Plan

- [ ] Run existing tests: `yarn test app/components/UI/Perps`
- [ ] Manual test: Connect to perps, verify only 2 DEXs subscribed in logs
- [ ] Manual test: Navigate between markets, verify candle subscriptions are balanced
- [ ] Manual test: Verify no duplicate subscriptions in WebSocket logs

## WebSocket Message Analysis

Full flow test log analysis:

| Message Type | Count | Notes |
|--------------|-------|-------|
| **OUTGOING** | 44 | Total outgoing messages |
| **INCOMING** | 402 | Total incoming messages |
| Subscriptions | 12 | subscribe messages |
| Unsubscriptions | 8 | unsubscribe messages (balanced with subs leaving page) |
| Info queries | 18 | HTTP-over-WS info requests |
| Ping | 3 | Keep-alive pings |

### Subscription Breakdown
- `clearinghouseState`: 2 (main + xyz)
- `openOrders`: 2 (main + xyz)
- `userFills`: 1
- `webData3`: 1
- `allMids`: 1
- `assetCtxs`: 2 (xyz only, subscribed/unsubscribed on navigation)
- `activeAssetCtx`: 2 (xyz:XYZ100, subscribed/unsubscribed on navigation)
- `candle`: 2 (1h + 15m intervals)
- `bbo`: 2 (subscribed/unsubscribed during order flow)

### Trading Operations
Trading operations (order placement, cancellation, modification) currently use **HTTP transport**:
- `ExchangeClient` is configured with `httpTransport` to avoid 429 rate limiting
- `InfoClient` uses `wsTransport` for info queries (multiplexed over single WS connection)
- The SDK supports WebSocket POST for exchange operations (`{"method":"post","type":"exchange",..}`)

**Potential optimization:** Now that subscription volume is reduced by 75%, we could consider moving `ExchangeClient` to WebSocket transport to:
- Reduce HTTP connection overhead
- Leverage the existing WebSocket connection
- Get faster response times (no TLS handshake per request)

## Related

- [WebSocket Investigation Report](docs/perps/perps-websocket-subscription-investigation.md)
