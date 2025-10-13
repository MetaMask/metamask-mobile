# Candle Data Migration: REST → Streaming

## Problem

### Current Architecture Issues

**Root Cause**: `PerpsMarketDetailsView` creates two concurrent REST calls for the same coin:

1. **Chart Data**: Calls `usePerpsPositionData` with user-selected interval (e.g., 3m)
2. **24h Stats**: Calls `usePerpsMarketStats` → internally calls `usePerpsPositionData` with 1h interval

**Current Flow**:

```
PerpsMarketDetailsView
├─> usePerpsPositionData({ coin: 'BTC', interval: '3m' })  // Chart
│   └─> PerpsController.fetchHistoricalCandles('BTC', '3m')
│       └─> REST API + setInterval polling
│           └─> Sentry trace: "Perps Fetch Historical Candles"
│
└─> usePerpsMarketStats({ coin: 'BTC' })  // Stats
    └─> usePerpsPositionData({ coin: 'BTC', interval: '1h' })
        └─> PerpsController.fetchHistoricalCandles('BTC', '1h')
            └─> REST API + setInterval polling
                └─> Sentry trace: "Perps Fetch Historical Candles" (DUPLICATE NAME)
```

**Problems**:

- Two simultaneous REST calls with identical Sentry trace names
- No cache sharing between different intervals
- Periodic polling via `setInterval` → unnecessary network traffic
- Mixed architecture: prices use WebSocket, candles use REST

### Why Two Different Intervals?

- **Chart**: Needs fine-grained data (3m/5m/15m) for visual detail
- **Stats**: Needs 24h high/low calculation using 1h candles (24 data points)
- Product requirement: different granularities for different use cases

## Ideal Future State

**Performance Optimization**: Unified interval across codebase

- If chart AND stats both used **1h candles** → 1 WebSocket subscription shared via cache
- Example: 10 components using BTC-1h = still only 1 WebSocket connection
- Significant bandwidth/memory savings

**Current Constraint**: Product requirements need different granularities

- Chart requires visual detail (3m intervals)
- Stats calculation optimized for 1h intervals

**Trade-off**: Accept multiple interval subscriptions NOW

- Architecture supports cache sharing per `(coin, interval)` combination
- Future: If product unifies to single interval → automatically becomes 1 subscription
- Migration path exists without code changes

## Solution

Migrate candle data to streaming pattern using WebSocket subscriptions with lazy loading.

## Architecture

### Cache Strategy

**Pre-warm (Always ON)**

- prices, orders, positions, account
- Single persistent WebSocket per channel
- Pre-warmed on app entry

**On-Demand (Lazy Load)**

- **candles**: Subscribe per `(coin, interval)`
- Auto-disconnect when `subscribers.size === 0`
- **Why**: Caching all markets × all intervals = excessive memory/bandwidth

### Protocol-Agnostic Design

All WebSocket operations via `PerpsController` abstraction:

```typescript
PerpsController.subscribeToCandles({ coin, interval, callback })
  → HyperLiquidClientService.subscribeToCandles(...)
    → SubscriptionClient.candle({ coin, interval }, callback)
```

## Implementation Steps

### 1. Create CandleStreamChannel

**File**: `providers/channels/CandleStreamChannel.ts`

- Extends `StreamChannel<CandleData>`
- Cache key: `${coin}-${interval}`
- Initial load: REST `candleSnapshot`
- Live updates: WebSocket `candle` subscription
- **NO** `prewarm()` method
- Auto-cleanup via base class when unmounted

### 2. Update PerpsController

**File**: `controllers/PerpsController.ts`

```typescript
subscribeToCandles({
  coin: string,
  interval: CandlePeriod,
  callback: (data: CandleData) => void
}): () => void
```

- Delegates to `activeProvider.subscribeToCandles(...)`
- Protocol-agnostic abstraction layer

### 3. Update HyperLiquidClientService

**File**: `services/HyperLiquidClientService.ts`

```typescript
subscribeToCandles({
  coin: string,
  interval: CandlePeriod,
  callback: (candle: Candle) => void
}): () => void
```

- Uses SDK's `subscriptionClient.candle({ coin, interval }, callback)`
- Maintains historical data + appends live candles
- Initial load via existing `candleSnapshot` REST

### 4. Integrate CandleStreamChannel

**File**: `providers/PerpsStreamManager.tsx`

```typescript
export class PerpsStreamManager {
  public readonly candles = new CandleStreamChannel();
  // NO prewarm for candles
}
```

### 5. Create usePerpsLiveCandles Hook

**File**: `hooks/stream/usePerpsLiveCandles.ts`

```typescript
usePerpsLiveCandles({
  coin: string,
  interval: CandlePeriod,
  duration: TimeDuration,
  throttleMs?: number
}): {
  candleData: CandleData | null,
  isLoading: boolean,
  error: Error | null
}
```

### 6. Migrate usePerpsMarketStats

**File**: `hooks/usePerpsMarketStats.ts`

- Replace `usePerpsPositionData` → `usePerpsLiveCandles`
- Same params: `{ coin, interval: ONE_HOUR, duration: ONE_DAY }`

### 7. Migrate PerpsMarketDetailsView

**File**: `Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx`

- Replace `usePerpsPositionData` → `usePerpsLiveCandles`
- Dynamic interval from `selectedCandlePeriod`

### 8. Delete usePerpsPositionData

**Files**:

- `hooks/usePerpsPositionData.ts`
- `hooks/usePerpsPositionData.test.ts`
- Remove from `hooks/index.ts`

### 9. Update or Remove Sentry Trace

**File**: `controllers/PerpsController.ts`

- Option A: Remove `fetchHistoricalCandles` trace (redundant with streaming)
- Option B: Keep but rename to `Perps Fetch Historical Candles (${interval})`

## Testing

### Unit Tests

- CandleStreamChannel subscription/unsubscription
- usePerpsLiveCandles with multiple subscribers
- Cache sharing verification

### Integration Tests

- PerpsMarketDetailsView with live candles
- 24h stats calculation accuracy
- Auto-cleanup on component unmount

## Files Changed

**Create (2)**

- `providers/channels/CandleStreamChannel.ts`
- `hooks/stream/usePerpsLiveCandles.ts`

**Modify (5)**

- `providers/PerpsStreamManager.tsx`
- `controllers/PerpsController.ts`
- `services/HyperLiquidClientService.ts`
- `hooks/usePerpsMarketStats.ts`
- `Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx`

**Delete (2)**

- `hooks/usePerpsPositionData.ts`
- `hooks/usePerpsPositionData.test.ts`

## Benefits

- ✅ Eliminates duplicate Sentry traces
- ✅ Real-time candle updates (no polling)
- ✅ Shared cache across components
- ✅ Protocol-agnostic architecture
- ✅ Efficient memory/bandwidth (lazy load)
- ✅ Consistent streaming pattern

## Cost Analysis

**Before (Current)**:

- 2 REST calls (BTC-3m + BTC-1h, different intervals)
- 2 polling setIntervals → repeated network requests
- Duplicate Sentry traces (identical names, no differentiation)
- No cache sharing

**After (Streaming)**:

- 2 WebSocket subscriptions (BTC-3m for chart, BTC-1h for stats)
- Real-time push updates (no polling)
- Separate cache per `(coin, interval)` → distinct operations tracked correctly
- Auto-cleanup when components unmount → 0 connections

**Future Optimization Path**:

- If product unifies intervals → automatically reduces to 1 subscription
- Cache sharing: 10 components using BTC-1h = still only 1 WebSocket
- Architecture already supports this optimization (no code changes needed)

**Reality Check**: We will maintain 2 subscriptions per coin:

- **Required**: 1h interval for 24h high/low stats calculation
- **Required**: User-selected interval (3m/5m/15m/etc) for chart display
- This is NOT a bug—it's a product requirement for different data granularities
- Architecture optimizes by sharing cache when multiple components use same `(coin, interval)`

---

## JIRA Issue Preparation

### Title

`Migrate Candle Data from REST Polling to WebSocket Streaming`

### Type

Technical Debt / Improvement

### Priority

Medium (eliminates duplicate Sentry traces, improves real-time data)

### Labels

- `perps`
- `performance`
- `architecture`
- `websocket`
- `technical-debt`

### Description Template

```markdown
## Problem

Currently getting duplicate Sentry traces for "Perps Fetch Historical Candles" because:

- PerpsMarketDetailsView makes 2 concurrent REST calls for same coin (different intervals)
- Chart data uses user-selected interval (e.g., 3m)
- 24h stats use fixed 1h interval for high/low calculation
- Both use setInterval polling → inefficient, stale data

## Solution

Migrate to WebSocket streaming pattern (like prices/orders/positions already do):

- Create CandleStreamChannel with lazy loading
- Use HyperLiquid's WebSocket candle subscription API
- Share cache per (coin, interval) combination
- Auto-cleanup when components unmount

## Expected Outcome

- ✅ Eliminates duplicate Sentry traces
- ✅ Real-time candle updates (no polling)
- ✅ Protocol-agnostic architecture
- ⚠️ Will maintain 2 WebSocket subscriptions per coin (1h for stats + user interval for chart)
  - This is correct behavior—not a bug
  - Product requires different data granularities

## Implementation Details

See: `app/components/UI/Perps/MIGRATION_PLAN_CANDLES.md`

## Files Impacted

- Create: 2 files (CandleStreamChannel, usePerpsLiveCandles)
- Modify: 5 files
- Delete: 2 files (usePerpsPositionData + test)

## Testing

- Unit tests for CandleStreamChannel
- Integration tests for PerpsMarketDetailsView
- Verify 24h stats calculation accuracy
```

### Story Points

Estimate: **5 points** (medium complexity, well-defined scope)

### Acceptance Criteria

- [ ] CandleStreamChannel created with lazy loading pattern
- [ ] usePerpsLiveCandles hook created and tested
- [ ] PerpsMarketDetailsView migrated (no polling, uses streaming)
- [ ] usePerpsMarketStats migrated (no polling, uses streaming)
- [ ] usePerpsPositionData deleted (no deprecation)
- [ ] Sentry traces no longer show duplicates
- [ ] 24h high/low stats still calculate correctly
- [ ] Memory usage efficient (auto-cleanup on unmount verified)
- [ ] Protocol-agnostic (abstracted via PerpsController)

### Notes for Implementation

- Two subscriptions per coin is EXPECTED (1h + user interval)
- Architecture supports future optimization if product unifies intervals
- Cache sharing works: 10 components using BTC-1h = 1 WebSocket
