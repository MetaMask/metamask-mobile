# MYX Protocol Integration - Jira Tickets

## Overview

This document provides detailed ticket breakdowns for implementing MYX protocol support in MetaMask Mobile Perps. Based on Sprint 15 stories (TAT-2459 through TAT-2463), broken down into implementation sub-tasks.

---

## Epic: MYX Protocol Integration

**Epic Summary**: Enable users to trade perpetual futures on MYX protocol alongside HyperLiquid.

**Business Value**: Expands trading options for users, provides competition for better rates, supports multi-chain strategy.

**Technical Scope**: ~4,400 lines of new code across 8 files implementing IPerpsProvider interface.

---

## Story: TAT-2459 - Toggle between MYX and HyperLiquid

**User Story**: As a user, I want to switch between MYX and HyperLiquid providers from the Perps home screen.

**Acceptance Criteria**:

- User can see available providers in Perps settings
- User can select MYX or HyperLiquid
- App connects to selected provider and loads its markets
- Provider preference persists across sessions

### Sub-tasks

#### MYX-001: Create MYX Provider skeleton

**Summary**: Create MYXProvider.ts implementing IPerpsProvider interface with stubbed methods

**Description**:
Create the main provider class that will implement all required IPerpsProvider interface methods. Initially stub all methods to throw "not implemented" errors, then implement in subsequent tickets.

**Implementation Details**:

- Create `/app/components/UI/Perps/controllers/providers/MYXProvider.ts`
- Implement constructor with PlatformDependencies injection
- Stub all 45+ interface methods
- Add provider ID constant `'myx'`
- Add to provider registry in PerpsController with feature flag check

**Technical Notes**:

- Use lazy initialization pattern (see POC guide section 5)
- Constructor must NOT call any async methods or access Engine.context

**Acceptance Criteria**:

- [ ] MYXProvider class created
- [ ] Implements IPerpsProvider interface
- [ ] All methods stubbed
- [ ] Registered in PerpsController when feature flag enabled
- [ ] Unit tests for constructor and registration

**Estimate**: 2 SP

---

#### MYX-002: Implement MYX WalletService

**Summary**: Create MYXWalletService for MetaMask wallet signing integration

**Description**:
Create a service that adapts MetaMask's KeyringController to the signing interface expected by MYX SDK.

**Implementation Details**:

- Create `/app/components/UI/Perps/services/MYXWalletService.ts`
- Implement `createSignerAdapter()` returning MYX SDK-compatible signer
- Use `signPersonalMessage` (NOT `signTypedMessage`) for message signing
- Implement `getCurrentAddress()` to get active account
- Handle account switching via Engine.context subscription

**Code Reference**:

```typescript
signMessage: async (message: string | Uint8Array): Promise<string> => {
  const hexMessage = `0x${Buffer.from(message).toString('hex')}`;
  return await this.deps.controllers.keyring.signPersonalMessage({
    from: currentAddress,
    data: hexMessage,
  });
};
```

**Technical Notes**:

- Critical: Use `signPersonalMessage`, not `signTypedMessage` (POC guide section 2.2)
- Must handle hex encoding of message bytes

**Acceptance Criteria**:

- [ ] WalletService class created
- [ ] `createSignerAdapter()` returns valid signer
- [ ] Signing works with MYX SDK
- [ ] Account switching handled
- [ ] Unit tests with mocked KeyringController

**Estimate**: 2 SP

---

#### MYX-003: Implement MYX ClientService core

**Summary**: Create MYXClientService for SDK client lifecycle management with manual auth

**Description**:
Create the core service that manages MYX SDK client initialization, authentication, and connection lifecycle.

**Implementation Details**:

- Create `/app/components/UI/Perps/services/MYXClientService.ts`
- Implement lazy initialization pattern
- Implement token generation from MYX Auth API:
  - Endpoint: `/openapi/gateway/auth/api_key/create_token`
  - Signature: SHA256(`${appId}&${timestamp}&${expireTime}&${address}&${secret}`)
- Implement manual WebSocket authentication (bypass SDK's broken auth):
  - Connect to `wss://oapi-beta.myx.finance/ws`
  - Send: `{ request: 'signin', args: 'sdk.${accessToken}' }`
  - Wait for code 9200 response
- Implement token refresh logic
- Implement health check (ping/pong)

**Technical Notes**:

- SDK's `subscription.auth()` is broken - must use manual WebSocket signin (POC guide section 2.1)
- Use `react-native-quick-crypto` for SHA256
- Store testnet credentials in config (mainnet TBD)

**Acceptance Criteria**:

- [ ] ClientService class created
- [ ] Token generation works with MYX Auth API
- [ ] Manual WebSocket authentication succeeds (code 9200)
- [ ] Connection state tracked
- [ ] Token refresh before expiry
- [ ] Unit tests with mocked HTTP/WebSocket

**Estimate**: 3 SP

---

#### MYX-004: Implement provider switching in PerpsConnectionManager

**Summary**: Handle provider switching when user changes activeProvider in Redux

**Description**:
Update PerpsConnectionManager to detect provider changes and properly reconnect.

**Implementation Details**:

- Monitor `perps.activeProvider` Redux state changes
- When provider changes:
  1. Disconnect from current provider
  2. Clear all caches and subscriptions
  3. Initialize new provider
  4. Reconnect and reload data
- Ensure clean transition with loading states

**Technical Notes**:

- Must handle race conditions if user switches quickly
- Preserve user's selected market if available on both providers

**Acceptance Criteria**:

- [ ] Provider switch detected from Redux
- [ ] Clean disconnection from previous provider
- [ ] Caches cleared on switch
- [ ] New provider connected
- [ ] Loading states shown during transition
- [ ] Unit tests for switch flow

**Estimate**: 2 SP

---

## Story: TAT-2460 - View chart and stats on MYX markets

**User Story**: As a user, I want to see MYX market data, prices, and charts.

**Acceptance Criteria**:

- User can see list of available MYX markets
- Market prices update in real-time
- Charts display OHLCV data
- 24h stats (change, volume) displayed

### Sub-tasks

#### MYX-005: Implement getMarkets() and market data

**Summary**: Fetch and transform MYX markets to MetaMask format

**Description**:
Implement market data fetching from MYX SDK and build internal mappings.

**Implementation Details**:

- Call MYX SDK `markets.getPoolSymbolAll()` to get all trading pairs
- Build `symbol → poolId` mappings (required for all operations)
- Build `poolId → symbol` mappings (for reverse lookup)
- Transform MYX market data to `MarketInfo[]` format:
  - symbol, baseAsset, quoteAsset
  - minSize, tickSize, maxLeverage
  - 24h stats if available

**Code Reference**:

```typescript
async getMarkets(): Promise<MarketInfo[]> {
  await this.ensureClientsInitialized();
  const markets = await this.client.markets.getPoolSymbolAll();

  for (const market of markets) {
    this.symbolToPoolId.set(market.symbol, market.poolId);
  }

  return markets.map(adaptMYXMarketToMarketInfo);
}
```

**Technical Notes**:

- MYX uses multi-pool model - each symbol belongs to specific pool (POC guide section 2.3)
- poolId required for all subsequent operations

**Acceptance Criteria**:

- [ ] `getMarkets()` returns valid MarketInfo[]
- [ ] symbol → poolId mappings built
- [ ] Market metadata correctly transformed
- [ ] Caching implemented for performance
- [ ] Unit tests with sample MYX market data

**Estimate**: 2 SP

---

#### MYX-006: Implement price subscriptions

**Summary**: Subscribe to real-time price updates with REST polling fallback

**Description**:
Implement price subscriptions that fall back to REST polling due to SDK WebSocket unreliability.

**Implementation Details**:

- Implement `subscribeToPrices(symbols, callback)`:
  - Attempt WebSocket subscription first
  - Fall back to REST polling every 2 seconds if unreliable
- Calculate 24h change from historical data
- Cache prices with TTL (2 seconds)
- Handle multiple symbols efficiently (batch requests)

**Technical Notes**:

- SDK ticker callback is unreliable - must have REST fallback (POC guide section 2.4)
- Polling interval: 2 seconds for prices

**Acceptance Criteria**:

- [ ] `subscribeToPrices()` implemented
- [ ] REST polling fallback works
- [ ] 24h change calculated
- [ ] Prices cached appropriately
- [ ] Unsubscribe cleans up intervals
- [ ] Unit tests with mocked responses

**Estimate**: 3 SP

---

#### MYX-007: Implement candle subscriptions

**Summary**: Subscribe to OHLCV candle data for charts

**Description**:
Implement candle subscriptions for chart display.

**Implementation Details**:

- Implement `subscribeToCandles(symbol, interval, callback)`:
  - Map MetaMask intervals to MYX resolutions (1m, 5m, 15m, 1h, 4h, 1d)
  - Subscribe via SDK or poll via REST
- Transform candle format:
  - time, open, high, low, close, volume
- Handle initial historical load + real-time updates

**Technical Notes**:

- MYX may use different interval naming - verify with SDK docs

**Acceptance Criteria**:

- [ ] `subscribeToCandles()` implemented
- [ ] Interval mapping correct
- [ ] Historical candles loaded
- [ ] Real-time updates work
- [ ] Format matches chart library expectations
- [ ] Unit tests for transformation

**Estimate**: 2 SP

---

#### MYX-008: Create myxConfig.ts with endpoints and helpers

**Summary**: Create configuration file with all MYX constants and helpers

**Description**:
Create centralized configuration for MYX integration.

**Implementation Details**:

- Create `/app/components/UI/Perps/constants/myxConfig.ts`
- Define:
  - Chain IDs: `testnet: 97`, `mainnet: 56`
  - REST API endpoints (testnet and mainnet)
  - WebSocket endpoints
  - Auth API endpoints
- Create decimal conversion helpers:
  - `toMYXPrice/Size/Collateral()` - human-readable → 30/18 decimals
  - `fromMYXPrice/Size/Collateral()` - 30/18 decimals → human-readable
- Define fee rates and trading limits

**Technical Notes**:

- Prices use 30 decimals, size/collateral use 18 decimals (POC guide section 2.5)
- Mainnet endpoints TBD - may need verification with MYX

**Acceptance Criteria**:

- [ ] Config file created
- [ ] All endpoints defined
- [ ] Chain IDs correct
- [ ] Decimal converters accurate
- [ ] Unit tests for conversions

**Estimate**: 1 SP

---

## Story: TAT-2461 - Open market order for MYX market

**User Story**: As a user, I want to place market orders on MYX protocol.

**Acceptance Criteria**:

- User can enter order parameters (size, leverage)
- Fee preview shown before submission
- Order submitted successfully
- Order confirmation displayed

### Sub-tasks

#### MYX-009: Implement placeOrder() for market orders

**Summary**: Implement market order placement with direction/operation mapping

**Description**:
Implement the core order placement logic mapping MetaMask order intent to MYX SDK calls.

**Implementation Details**:

- Implement `placeOrder(params: OrderParams)`:
  - Get poolId for symbol
  - Determine if opening new position or modifying existing
  - Map to increase/decrease order:
    - buy + no position → `createIncreaseOrder` + LONG
    - sell + no position → `createIncreaseOrder` + SHORT
    - buy + short position → `createDecreaseOrder` + SHORT
    - sell + long position → `createDecreaseOrder` + LONG
  - Convert size/price to MYX decimals
  - Submit order via SDK
  - Return order result

**Code Reference**:

```typescript
const { method, direction } = mapOrderToMYX(params.isBuy, existingPosition);

if (method === 'increase') {
  return await this.client.order.createIncreaseOrder({
    poolId,
    direction,
    size: toMYXSize(params.size),
    // ...
  });
} else {
  return await this.client.order.createDecreaseOrder({
    poolId,
    direction,
    size: toMYXSize(params.size),
    // ...
  });
}
```

**Technical Notes**:

- Critical: Direction/operation mapping logic (POC guide section 2.6)
- Must fetch existing position to determine operation

**Acceptance Criteria**:

- [ ] `placeOrder()` implemented for market orders
- [ ] Direction mapping correct
- [ ] Decimal conversions applied
- [ ] SDK called with correct params
- [ ] Order result returned
- [ ] Unit tests for all direction combinations

**Estimate**: 3 SP

---

#### MYX-010: Implement order validation

**Summary**: Validate order parameters before submission

**Description**:
Add validation layer to catch invalid orders before SDK submission.

**Implementation Details**:

- Implement `validateOrder(params)`:
  - Verify market exists and is tradeable
  - Verify size meets minimum
  - Verify leverage within allowed range
  - Verify sufficient balance for margin
  - Return validation result with specific errors
- Call validation before `placeOrder`

**Acceptance Criteria**:

- [ ] Validation function implemented
- [ ] Market existence checked
- [ ] Size limits validated
- [ ] Leverage limits validated
- [ ] Balance check implemented
- [ ] Clear error messages returned
- [ ] Unit tests for each validation

**Estimate**: 2 SP

---

#### MYX-011: Implement fee calculation

**Summary**: Calculate trading fees for order preview

**Description**:
Implement fee calculation for displaying to user before order submission.

**Implementation Details**:

- Implement `calculateFees(params)`:
  - Get fee rates from MYX (maker/taker)
  - Calculate trading fee: size × price × feeRate
  - Return fee breakdown

**Acceptance Criteria**:

- [ ] `calculateFees()` implemented
- [ ] Fee rates fetched from MYX
- [ ] Calculation accurate
- [ ] Fee breakdown returned
- [ ] Unit tests for calculation

**Estimate**: 1 SP

---

#### MYX-012: Create myxAdapter.ts type transformations

**Summary**: Create adapter utilities for type transformations

**Description**:
Create centralized adapter for transforming between MetaMask and MYX types.

**Implementation Details**:

- Create `/app/components/UI/Perps/utils/myxAdapter.ts`
- Implement:
  - `adaptOrderToMYX()` - OrderParams → MYX order format
  - `adaptPositionFromMYX()` - MYX position → Position
  - `adaptOrderFromMYX()` - MYX order → Order
  - `adaptMarketFromMYX()` - MYX market → MarketInfo
- Handle all decimal conversions
- Handle direction/operation mapping

**Acceptance Criteria**:

- [ ] Adapter file created
- [ ] All transformation functions implemented
- [ ] Decimal conversions correct
- [ ] Type-safe implementation
- [ ] Unit tests for each adapter

**Estimate**: 2 SP

---

## Story: TAT-2462 - View open MYX position

**User Story**: As a user, I want to see my MYX positions with real-time PnL.

**Acceptance Criteria**:

- User can see all open positions
- Position shows: size, entry price, PnL, liquidation price
- PnL updates in real-time
- Leverage and margin displayed

### Sub-tasks

#### MYX-013: Implement getPositions()

**Summary**: Fetch user positions from MYX

**Description**:
Implement position fetching with aggregation across pools.

**Implementation Details**:

- Implement `getPositions()`:
  - Call MYX SDK `position.listPositions()`
  - Aggregate positions across all pools (MYX multi-pool model)
  - Transform to `Position[]` format
  - Calculate unrealized PnL with current prices

**Technical Notes**:

- Must iterate all pools user has interacted with
- MYX may return positions per-pool

**Acceptance Criteria**:

- [ ] `getPositions()` implemented
- [ ] Multi-pool aggregation works
- [ ] Position data complete
- [ ] PnL calculated
- [ ] Unit tests with sample data

**Estimate**: 2 SP

---

#### MYX-014: Implement position subscriptions

**Summary**: Subscribe to position updates with REST polling fallback

**Description**:
Implement position subscriptions with reliable data delivery.

**Implementation Details**:

- Implement `subscribeToPositions(callback)`:
  - Attempt WebSocket subscription
  - Fall back to REST polling every 5 seconds
  - Cache positions for offline resilience
  - Call callback on each update

**Technical Notes**:

- WebSocket position updates are unreliable (POC guide section 2.4)
- Must have REST fallback

**Acceptance Criteria**:

- [ ] `subscribeToPositions()` implemented
- [ ] REST polling fallback works
- [ ] Positions cached
- [ ] Unsubscribe cleans up
- [ ] Unit tests for subscription flow

**Estimate**: 2 SP

---

#### MYX-015: Implement getAccountState()

**Summary**: Calculate account state from positions

**Description**:
Aggregate account information across user's pools.

**Implementation Details**:

- Implement `getAccountState()`:
  - Fetch positions from all pools
  - Calculate total equity
  - Calculate total margin used
  - Calculate total unrealized PnL
  - Calculate available balance

**Technical Notes**:

- No dedicated account state API - must derive from positions

**Acceptance Criteria**:

- [ ] `getAccountState()` implemented
- [ ] Aggregation across pools correct
- [ ] All account metrics calculated
- [ ] Unit tests for calculations

**Estimate**: 2 SP

---

#### MYX-016: Implement liquidation price calculation

**Summary**: Calculate liquidation prices for positions

**Description**:
Calculate liquidation price based on leverage and margin requirements.

**Implementation Details**:

- Implement `calculateLiquidationPrice(position)`:
  - Get maintenance margin rate from MYX
  - Calculate based on: entry price, leverage, fees
  - Handle long vs short calculations

**Acceptance Criteria**:

- [ ] Liquidation calculation implemented
- [ ] Long positions correct
- [ ] Short positions correct
- [ ] Unit tests with known values

**Estimate**: 1 SP

---

## Story: TAT-2463 - Close MYX position

**User Story**: As a user, I want to close my MYX positions.

**Acceptance Criteria**:

- User can close full position
- User can partially close position
- TP/SL orders can be set
- Margin can be adjusted

### Sub-tasks

#### MYX-017: Implement closePosition()

**Summary**: Close a single position fully

**Description**:
Implement full position closing via decrease order.

**Implementation Details**:

- Implement `closePosition(symbol)`:
  - Get current position for symbol
  - Create decrease order for full size
  - Map direction (close long → sell, close short → buy)
  - Submit via SDK

**Acceptance Criteria**:

- [ ] `closePosition()` implemented
- [ ] Full size used
- [ ] Direction mapping correct
- [ ] Position closed successfully
- [ ] Unit tests for long/short

**Estimate**: 2 SP

---

#### MYX-018: Implement closePositions() batch

**Summary**: Close multiple positions at once

**Description**:
Implement batch position closing.

**Implementation Details**:

- Implement `closePositions(symbols?)`:
  - If symbols provided, close those
  - If no symbols, close all positions
  - Execute closes sequentially or in parallel
  - Aggregate results

**Acceptance Criteria**:

- [ ] `closePositions()` implemented
- [ ] Batch execution works
- [ ] Results aggregated
- [ ] Partial failures handled
- [ ] Unit tests for batch

**Estimate**: 1 SP

---

#### MYX-019: Implement updateMargin()

**Summary**: Add or remove margin from position

**Description**:
Implement margin adjustment for existing positions.

**Implementation Details**:

- Implement `updateMargin(symbol, amount, isDeposit)`:
  - Get position for symbol
  - Call MYX SDK `position.adjustCollateral()`
  - Handle deposit (add) vs withdraw (remove)

**Acceptance Criteria**:

- [ ] `updateMargin()` implemented
- [ ] Deposit works
- [ ] Withdraw works
- [ ] Validation for min/max
- [ ] Unit tests

**Estimate**: 1 SP

---

#### MYX-020: Implement TP/SL orders

**Summary**: Set take-profit and stop-loss orders

**Description**:
Implement TP/SL order management for positions.

**Implementation Details**:

- Implement `updatePositionTPSL(symbol, tp, sl)`:
  - Get position for symbol
  - Create/update TP order if provided
  - Create/update SL order if provided
  - Handle trigger types (GTE for TP, LTE for SL on longs; reverse for shorts)

**Acceptance Criteria**:

- [ ] `updatePositionTPSL()` implemented
- [ ] TP order creation works
- [ ] SL order creation works
- [ ] Trigger direction correct
- [ ] Unit tests for long/short

**Estimate**: 2 SP

---

## Additional Tickets (Post-MVP)

### MYX-021: Implement limit orders

**Summary**: Support limit order placement

**Estimate**: 2 SP

**Description**: Extend `placeOrder()` to handle limit orders with price specification.

---

### MYX-022: Implement order management

**Summary**: Get orders, cancel orders, edit orders

**Estimate**: 3 SP

**Description**: Implement `getOrders()`, `cancelOrder()`, `editOrder()`, and order subscriptions.

---

### MYX-023: Implement withdrawal flow

**Summary**: Enable USDT withdrawals from MYX

**Estimate**: 2 SP

**Description**: Implement `withdraw()` and configure withdrawal routes for BNB Chain USDT.

---

### MYX-024: Add MYX to deposit routes

**Summary**: Configure USDT deposits to MYX

**Estimate**: 3 SP

**Description**: Configure deposit routes, may require bridge integration for cross-chain deposits.

---

### MYX-025: Health check and reconnection

**Summary**: Implement connection health monitoring

**Estimate**: 2 SP

**Description**: WebSocket ping/pong, auto-reconnect logic, connection state management.

---

## Blocked Tickets (Waiting on MYX SDK)

### MYX-BLOCKED-001: Order fill history

**Summary**: Display trade execution history

**Status**: BLOCKED - MYX SDK does not provide order fill history API

**Impact**: Users cannot see their trade execution history (fills, prices, fees)

**Unblock**: MYX team must add API endpoint

---

### MYX-BLOCKED-002: Funding history

**Summary**: Display funding payments

**Status**: BLOCKED - MYX SDK does not provide funding history API

**Impact**: Users cannot see funding payments received or paid

**Unblock**: MYX team must add API endpoint

---

### MYX-BLOCKED-003: Order book display

**Summary**: Display live order book depth

**Status**: BLOCKED - MYX SDK does not provide order book WebSocket subscription

**Impact**: Cannot display order book, affects order pricing visibility

**Unblock**: MYX team must add WebSocket channel

---

## Estimation Summary

| Category                      | Tickets            | Story Points |
| ----------------------------- | ------------------ | ------------ |
| Provider Switching (TAT-2459) | MYX-001 to MYX-004 | 9 SP         |
| Market Data (TAT-2460)        | MYX-005 to MYX-008 | 8 SP         |
| Order Placement (TAT-2461)    | MYX-009 to MYX-012 | 8 SP         |
| Positions (TAT-2462)          | MYX-013 to MYX-016 | 7 SP         |
| Close Position (TAT-2463)     | MYX-017 to MYX-020 | 6 SP         |
| **MVP Total**                 | **20 tickets**     | **38 SP**    |
| Post-MVP                      | MYX-021 to MYX-025 | 12 SP        |
| **Full Implementation**       | **25 tickets**     | **50 SP**    |

---

## Dependencies & Risks

### External Dependencies

| Dependency                   | Owner | Status        | Impact                    |
| ---------------------------- | ----- | ------------- | ------------------------- |
| MYX SDK npm package          | MYX   | Available     | Core dependency           |
| Mainnet credentials          | MYX   | NOT AVAILABLE | Blocks production release |
| Contract addresses (mainnet) | MYX   | TBD           | Blocks mainnet config     |
| SDK auth fix                 | MYX   | Outstanding   | Must maintain workaround  |

### Internal Dependencies

| Dependency                 | Status   | Impact                          |
| -------------------------- | -------- | ------------------------------- |
| Protocol aggregation merge | Complete | Required for provider switching |
| Core migration prep        | Complete | Architecture ready              |
| IPerpsProvider interface   | Complete | Interface defined               |

### Risks

| Risk                          | Likelihood | Impact | Mitigation                                                                      |
| ----------------------------- | ---------- | ------ | ------------------------------------------------------------------------------- |
| SDK auth remains broken       | High       | Medium | Manual WebSocket auth workaround documented                                     |
| Missing APIs (fills, funding) | Certain    | High   | Graceful degradation, feature flags                                             |
| Mainnet credentials delayed   | Medium     | High   | **Hardcode testnet** - MYX uses testnet even when app-wide perps env is mainnet |
| SDK version compatibility     | Medium     | Medium | Pin SDK version, test upgrades                                                  |

### Important: Testnet Hardcoding Strategy

**MYX is hardcoded to ALWAYS use testnet** regardless of app-wide perps environment setting. This design choice enables:

1. **Parallel Development**: Developers can test HyperLiquid on mainnet (real markets, liquidity) while also testing MYX on testnet
2. **No Credential Blocker**: Continue MYX development without waiting for mainnet credentials
3. **Safety**: Avoid accidental mainnet trading during development

**Implementation**: See `MYX_POC_IMPLEMENTATION_GUIDE.md` section 4.0 for code pattern.

**When to Remove**: Once MYX provides mainnet credentials and endpoints are verified.

**Reference Branch**: `feat/perps/myx-integration` contains the full POC implementation.

---

## Verification Checklist

### Per-Ticket Verification

- [ ] Unit tests pass
- [ ] Code review approved
- [ ] Integration test with MYX testnet
- [ ] Manual QA verification
- [ ] Documentation updated

### End-to-End Acceptance Flow

1. [ ] Switch to MYX provider from Perps home
2. [ ] View MYX markets with live prices
3. [ ] Open chart for BTC market
4. [ ] Place market buy order
5. [ ] View position with PnL updating
6. [ ] Set TP/SL on position
7. [ ] Close position
8. [ ] Switch back to HyperLiquid
9. [ ] Verify HyperLiquid data loads correctly

---

## Sprint Planning Recommendation

### Sprint 1 (Foundation)

- MYX-001: Provider skeleton (2 SP)
- MYX-002: WalletService (2 SP)
- MYX-003: ClientService (3 SP)
- MYX-008: Config file (1 SP)
  **Total: 8 SP**

### Sprint 2 (Market Data)

- MYX-004: Provider switching (2 SP)
- MYX-005: Markets (2 SP)
- MYX-006: Prices (3 SP)
- MYX-007: Candles (2 SP)
  **Total: 9 SP**

### Sprint 3 (Trading Core)

- MYX-009: Place order (3 SP)
- MYX-010: Validation (2 SP)
- MYX-011: Fees (1 SP)
- MYX-012: Adapters (2 SP)
  **Total: 8 SP**

### Sprint 4 (Positions)

- MYX-013: Get positions (2 SP)
- MYX-014: Position subscriptions (2 SP)
- MYX-015: Account state (2 SP)
- MYX-016: Liquidation price (1 SP)
- MYX-017: Close position (2 SP)
  **Total: 9 SP**

### Sprint 5 (Complete MVP)

- MYX-018: Batch close (1 SP)
- MYX-019: Update margin (1 SP)
- MYX-020: TP/SL (2 SP)
  **Total: 4 SP + QA/Buffer**

---

_Last Updated: January 2026_
_Document Version: 1.0_
