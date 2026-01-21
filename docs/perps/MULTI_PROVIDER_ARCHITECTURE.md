# Multi-Provider Perps Architecture Plan

---

## Implementation Guide (Phase 1)

> **For developers implementing Phase 1**: This section provides a quick reference for implementing the aggregation layer. Start from the `main` branch where HyperLiquid is the only provider.
>
> **Reference Implementation**: The `feat/perps/myx-integration` branch contains a proof-of-concept MYX integration that demonstrates multi-provider patterns. Use it as a reference for:
>
> - Provider implementation patterns (`MYXProvider.ts`)
> - Provider selector UI components (`PerpsProviderSelector/`)
> - Hook patterns (`usePerpsProvider.ts`)
>
> ⚠️ This branch is experimental and will be removed. Extract patterns, don't merge directly.

### Prerequisites

- Start from `main` branch (no MYX code unless feature-flagged)
- HyperLiquid is the only active provider initially
- This phase adds infrastructure without changing existing behavior

### Files Created (Phase 1)

| File                                                 | Purpose                                                | Lines |
| ---------------------------------------------------- | ------------------------------------------------------ | ----- |
| `controllers/providers/AggregatedPerpsProvider.ts`   | Main aggregation wrapper implementing `IPerpsProvider` | ~400  |
| `controllers/routing/ProviderRouter.ts`              | Order routing logic                                    | ~100  |
| `controllers/routing/index.ts`                       | Re-exports                                             | ~5    |
| `controllers/aggregation/SubscriptionMultiplexer.ts` | WebSocket multiplexing                                 | ~150  |
| `controllers/aggregation/index.ts`                   | Re-exports                                             | ~5    |

### Files Modified (Phase 1)

| File                                 | Changes                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `controllers/types/index.ts`         | Add `providerId?: PerpsProviderType` to data types (`MarketInfo`, `Position`, `Order`, `PriceUpdate`, `AccountState`, `OrderResult`, `OrderFill`). Add `AggregationMode`, `RoutingStrategy`, `AggregatedProviderConfig` types. |
| `selectors/perpsController/index.ts` | Already has `selectPerpsActiveProvider`                                                                                                                                                                                        |
| `hooks/usePerpsProvider.ts`          | Already has provider selection support                                                                                                                                                                                         |

### Implementation Order

1. **Types first** (foundation)
   - Add `providerId?: PerpsProviderType` to data types (optional)
   - Add aggregation config types

2. **ProviderRouter** (routing)
   - Phase 1 routing: `explicit providerId > default provider`
   - Advanced strategies (best_price, user_preference per market, etc.) deferred to Phase 3

3. **SubscriptionMultiplexer** (subscriptions)
   - Manage WebSocket subscriptions across providers
   - Tag all updates with `providerId`

4. **AggregatedPerpsProvider** (core)
   - Implements `IPerpsProvider`
   - Aggregates read operations, routes write operations
   - Uses `params.providerId ?? this.defaultProvider` for write operations

5. **Integration** (wire up)
   - PerpsController already manages multiple providers
   - AggregatedPerpsProvider can be used when aggregation is needed

### Key Implementation Principle

**AggregatedPerpsProvider implements `IPerpsProvider`.** This means:

- PerpsController can use it as a drop-in replacement
- All returned data MUST include `providerId` so UI can differentiate sources
- Read operations aggregate from all providers in parallel
- Write operations use `params.providerId ?? this.defaultProvider` (optional override, defaults to active provider)

### Pattern: Injecting providerId

Every aggregated method follows this pattern:

```typescript
async getPositions(params?: GetPositionsParams): Promise<Position[]> {
  const results = await Promise.all(
    this.getActiveProviders().map(async ([id, provider]) => {
      const positions = await provider.getPositions(params);
      return positions.map(p => ({ ...p, providerId: id })); // Inject providerId
    })
  );
  return results.flat();
}
```

### Verification Checklist

- [ ] Data types have optional `providerId` field
- [ ] AggregatedPerpsProvider injects `providerId` in all returned data
- [ ] AggregatedPerpsProvider write methods use `params.providerId ?? this.defaultProvider`
- [ ] SubscriptionMultiplexer tags all updates with source provider
- [ ] Existing tests pass (no regressions)

---

## Executive Summary

This document outlines the architectural approach for enabling **seamless multi-provider support** in MetaMask Mobile Perps. The goal is to allow users to interact with multiple perpetual trading providers (HyperLiquid, MYX, and future providers) simultaneously, with intelligent routing and aggregated data views.

## Problem Statement

### Current Limitations

1. **Single Active Provider**: Only one provider operates at a time; switching requires full disconnect/reconnect (~1-2s)
2. **No Cross-Provider Views**: Users cannot see consolidated positions, compare prices, or aggregate balances
3. **Manual Provider Selection**: Users must explicitly switch providers to access different markets
4. **Siloed State**: Each provider maintains separate state; no way to view unified portfolio

### User Impact

- Friction when comparing prices across providers
- No ability to find best execution across DEXs
- Cannot manage positions across providers from single view
- Limited market access (stuck on one provider's markets)

---

## Proposed Architecture: Provider Aggregation Layer

### Design Philosophy

**"Wrapper Pattern over Restructuring"**

Instead of restructuring the entire PerpsController and state management, we introduce an **AggregatedPerpsProvider** that implements `IPerpsProvider` and coordinates multiple backend providers. This approach:

- Preserves existing architecture
- Enables incremental adoption
- Maintains backward compatibility
- Simplifies testing

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PerpsController                          │
│  (No changes - continues to work with IPerpsProvider interface) │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AggregatedPerpsProvider                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Router     │  │ Aggregator  │  │ Subscription Multiplexer│ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ HyperLiquid     │ │      MYX        │ │   Future        │
│   Provider      │ │    Provider     │ │  Provider(s)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Core Components

### 1. AggregatedPerpsProvider

**Location**: `app/components/UI/Perps/controllers/providers/AggregatedPerpsProvider.ts`

```typescript
interface AggregatedProviderConfig {
  providers: Map<PerpsProviderType, IPerpsProvider>;
  router: ProviderRouter;
  aggregationMode: 'all' | 'active' | 'specific';
  defaultProvider?: PerpsProviderType;
}

class AggregatedPerpsProvider implements IPerpsProvider {
  private providers: Map<PerpsProviderType, IPerpsProvider>;
  private router: ProviderRouter;
  private subscriptionMux: SubscriptionMultiplexer;

  // === Read Operations (Aggregate across providers) ===

  async getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]> {
    // Return union of all markets with provider field
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        const markets = await provider.getMarkets(params);
        return markets.map((m) => ({ ...m, providerId: id }));
      }),
    );
    return this.deduplicateMarkets(results.flat());
  }

  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    // Aggregate positions from all providers
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        const positions = await provider.getPositions(params);
        return positions.map((p) => ({ ...p, providerId: id }));
      }),
    );
    return results.flat();
  }

  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    // Return aggregated account state
    const states = await Promise.all(
      this.getActiveProviders().map(([id, provider]) =>
        provider
          .getAccountState(params)
          .then((s) => ({ ...s, providerId: id })),
      ),
    );
    return this.aggregateAccountStates(states);
  }

  // === Write Operations (Route to specific provider or default) ===

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    // Use explicit providerId if passed, otherwise fall back to defaultProvider
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    const result = await provider.placeOrder(params);
    return { ...result, providerId };
  }

  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    // Use explicit providerId if passed, otherwise fall back to defaultProvider
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    return provider.cancelOrder(params);
  }

  // === Subscription Operations (Multiplex across providers) ===

  subscribeToPrices(params: SubscribePricesParams): () => void {
    return this.subscriptionMux.subscribeToPrices({
      ...params,
      providers: this.getActiveProviders(),
    });
  }
}
```

### 2. ProviderRouter

**Location**: `app/components/UI/Perps/controllers/routing/ProviderRouter.ts`

Determines which provider handles an operation. **Phase 1 uses simple routing; advanced strategies are deferred to Phase 3.**

#### Phase 1: Simple Routing

```typescript
// Phase 1: Only default_provider strategy
type RoutingStrategy = 'default_provider';

interface ProviderRouter {
  // Simple selection: explicit providerId wins, otherwise use default
  selectProvider(params: {
    coin: string;
    providerId?: PerpsProviderType;
  }): PerpsProviderType;

  // Get all providers that support a market
  getProvidersForMarket(coin: string): PerpsProviderType[];
}
```

**Phase 1 Routing Logic**:

```typescript
class ProviderRouter {
  private defaultProvider: PerpsProviderType;

  selectProvider(params: {
    coin: string;
    providerId?: PerpsProviderType;
  }): PerpsProviderType {
    // 1. Explicit providerId always wins
    if (params.providerId) return params.providerId;

    // 2. Fall back to default provider
    return this.defaultProvider;
  }
}
```

**Why this is sufficient:**

- User selects from market list → Market has `providerId` → No routing needed
- Programmatic call without `providerId` → Uses default provider (typically HyperLiquid)

### 3. SubscriptionMultiplexer

**Location**: `app/components/UI/Perps/providers/SubscriptionMultiplexer.ts`

Manages WebSocket subscriptions across multiple providers and aggregates callbacks.

```typescript
interface SubscriptionMultiplexer {
  subscribeToPrices(params: {
    symbols: string[];
    providers: [PerpsProviderType, IPerpsProvider][];
    callback: (updates: PriceUpdate[]) => void;
    aggregationMode: 'merge' | 'best_price';
  }): () => void;

  subscribeToPositions(params: {
    providers: [PerpsProviderType, IPerpsProvider][];
    callback: (positions: Position[]) => void;
  }): () => void;
}

class SubscriptionMultiplexerImpl implements SubscriptionMultiplexer {
  private priceCache: Map<string, Map<PerpsProviderType, PriceUpdate>> =
    new Map();

  subscribeToPrices({ symbols, providers, callback, aggregationMode }) {
    const unsubscribers: (() => void)[] = [];

    // Group symbols by provider availability
    const symbolsByProvider = this.groupSymbolsByProvider(symbols, providers);

    symbolsByProvider.forEach((providerSymbols, [providerId, provider]) => {
      const unsub = provider.subscribeToPrices({
        symbols: providerSymbols,
        callback: (updates) => {
          // Update cache
          updates.forEach((u) => {
            if (!this.priceCache.has(u.coin)) {
              this.priceCache.set(u.coin, new Map());
            }
            this.priceCache.get(u.coin)!.set(providerId, u);
          });

          // Aggregate and emit
          const aggregated = this.aggregatePrices(aggregationMode);
          callback(aggregated);
        },
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }

  private aggregatePrices(mode: 'merge' | 'best_price'): PriceUpdate[] {
    const result: PriceUpdate[] = [];

    this.priceCache.forEach((providerPrices, coin) => {
      if (mode === 'merge') {
        // Return one entry per provider
        providerPrices.forEach((price, providerId) => {
          result.push({ ...price, providerId });
        });
      } else {
        // Return best price across providers
        const best = this.findBestPrice(providerPrices);
        result.push(best);
      }
    });

    return result;
  }
}
```

### 4. Extended Type Definitions

**Location**: `app/components/UI/Perps/controllers/types/index.ts`

```typescript
// All data types have optional providerId (injected by aggregator for UI differentiation)
export interface MarketInfo {
  // ... existing fields
  providerId?: PerpsProviderType; // Which provider this market comes from (injected)
}

export interface Position {
  // ... existing fields
  providerId?: PerpsProviderType; // Which provider holds this position (injected)
}

export interface Order {
  // ... existing fields
  providerId?: PerpsProviderType; // Which provider this order is on (injected)
}

export interface PriceUpdate {
  // ... existing fields
  providerId?: PerpsProviderType; // Price source (injected)
}

export interface AccountState {
  // ... existing fields
  providerId?: PerpsProviderType; // Which provider this account state is from (injected)
}

export interface OrderResult {
  // ... existing fields
  providerId?: PerpsProviderType; // Which provider executed this order (injected)
}

export interface OrderFill {
  // ... existing fields
  providerId?: PerpsProviderType; // Which provider this fill occurred on (injected)
}

// Write operation params have optional providerId (defaults to active provider)
export type OrderParams = {
  // ... existing fields
  providerId?: PerpsProviderType; // Optional: override active provider
};

// Aggregated account state
export interface AggregatedAccountState {
  total: AccountState; // Combined totals
  byProvider: Map<PerpsProviderType, AccountState>;
}
```

**Design Rationale:**

- **Read operations**: Aggregator injects `providerId` into returned data so UI knows the source
- **Write operations**: `providerId` is optional; when not provided, uses `defaultProvider` (the currently active provider)

This allows most write operations to simply use the active provider without specifying `providerId`, while still allowing explicit routing when needed.

---

## State Management Strategy

### Option A: Minimal State Changes (Recommended for Phase 1)

Keep existing state structure, add aggregation at read time:

```typescript
// PerpsController state remains unchanged
state = {
  activeProvider: 'hyperliquid', // Kept for backward compat
  accountState: AccountState, // From primary provider
  // ...
};

// Add new aggregated selectors
export const selectAggregatedPositions = createSelector(
  [selectPerpsControllerState],
  (state) => {
    // Aggregation happens in selector, not stored
    return Engine.context.PerpsController.getAggregatedPositions();
  },
);
```

### Option B: Extended State (Phase 2+)

Add per-provider state tracking:

```typescript
state = {
  // Mode selection
  multiProviderMode: boolean;
  activeProviders: PerpsProviderType[];

  // Per-provider state
  providerStates: {
    [providerId: string]: {
      accountState: AccountState | null;
      initializationState: InitializationState;
      lastError: string | null;
    }
  };

  // Aggregated (computed from providerStates)
  aggregatedBalance: string;
  aggregatedUnrealizedPnl: string;
}
```

---

## UI/UX Considerations

### 1. Provider Badges on Data

All positions, orders, and market data should display which provider they're from:

```tsx
// Position card with provider indicator
<PositionCard
  position={position}
  providerBadge={<ProviderBadge providerId={position.providerId} size="sm" />}
/>
```

### 2. Market List with Provider Filter

```tsx
// Markets can be filtered by provider or shown aggregated
<MarketList
  markets={markets}
  groupBy="provider" // or 'none' for flat list
  showProviderBadges={true}
/>
```

### 3. Order Placement with Provider Selection

```tsx
// Order form with optional provider selector
<OrderForm
  defaultProvider={userPreference ?? 'hyperliquid'}
  showProviderSelector={hasMultipleProviders}
  onProviderChange={(providerId) => setSelectedProvider(providerId)}
/>
```

### 4. Portfolio Summary

```tsx
// Unified portfolio view with per-provider breakdown
<PortfolioSummary
  totalBalance={aggregatedState.total.withdrawable}
  unrealizedPnl={aggregatedState.total.unrealizedPnl}
  breakdown={aggregatedState.byProvider}
/>
```

---

## Migration Path

### Phase 1: Foundation (Non-Breaking)

**Goal**: Add multi-provider infrastructure without changing existing behavior

1. Create `AggregatedPerpsProvider` wrapper
2. Implement `ProviderRouter` with simple `default_provider` strategy only
   - Routing logic: `explicit providerId > default provider`
   - No per-market preferences, no price comparison, no fee optimization
3. Add `providerId` fields to types (optional, backward compatible)
4. Keep existing single-provider mode as default

**Deliverables**:

- New files only, no modifications to existing code
- Feature flag: `PERPS_MULTI_PROVIDER_ENABLED = false`
- Unit tests for new components

### Phase 2: Read Aggregation

**Goal**: Enable viewing data from multiple providers simultaneously

1. Update `SubscriptionMultiplexer` for price feeds
2. Implement aggregated `getPositions()`, `getOrders()`
3. Add UI components for provider badges
4. Create aggregated portfolio view

**Deliverables**:

- Multi-provider market view
- Consolidated positions list
- Per-provider balance breakdown

### Phase 3: Future Improvements (Out of Scope)

> **Note**: These are potential future enhancements, not currently planned for implementation.

**Potential features**:

- Advanced routing strategies (`best_price`, `user_preference` per market, `lowest_fee`)
- Provider comparison UI (fees, liquidity, spread)
- Automatic best-execution routing
- Fallback error handling

---

## API Changes Summary

### New Methods on PerpsController

```typescript
// Get markets from all providers
getAggregatedMarkets(): Promise<MarketInfo[]>

// Get positions from all providers
getAggregatedPositions(): Promise<Position[]>

// Get account states from all providers
getAggregatedAccountState(): Promise<AggregatedAccountState>

// Configure routing strategy
setRoutingStrategy(strategy: RoutingStrategy): void

// Get providers for a specific market
getProvidersForMarket(coin: string): PerpsProviderType[]
```

### Extended Hook API

```typescript
// New hook for multi-provider data
function useAggregatedPositions() {
  return useQuery({
    queryKey: ['perps', 'aggregatedPositions'],
    queryFn: () => Engine.context.PerpsController.getAggregatedPositions(),
  });
}

// Extended existing hook
function usePerpsLivePositions(options?: {
  providers?: PerpsProviderType[];  // Filter by provider
  throttleMs?: number;
}) { ... }
```

---

## Performance Considerations

### Parallel Requests

All multi-provider operations use `Promise.all()` for parallel execution:

```typescript
// Good: Parallel requests
const [hlPositions, myxPositions] = await Promise.all([
  hlProvider.getPositions(),
  myxProvider.getPositions(),
]);

// Bad: Sequential requests
const hlPositions = await hlProvider.getPositions();
const myxPositions = await myxProvider.getPositions(); // Waits for HL
```

### Caching Strategy

```typescript
// Cache aggregated results with provider-aware invalidation
const cache = new Map<string, {
  data: any;
  timestamp: number;
  providers: PerpsProviderType[];
}>();

// Invalidate when any provider's data changes
invalidateCache(providerId: PerpsProviderType) {
  cache.forEach((entry, key) => {
    if (entry.providers.includes(providerId)) {
      cache.delete(key);
    }
  });
}
```

### WebSocket Connection Management

```typescript
// Limit concurrent WebSocket connections
const MAX_CONCURRENT_PROVIDERS = 3;

// Prioritize connections based on user activity
prioritizeConnections(recentlyUsedProviders: PerpsProviderType[]) {
  // Keep recently used providers connected
  // Disconnect least-used if over limit
}
```

---

## Error Handling

### Provider-Specific Errors

```typescript
class ProviderError extends Error {
  constructor(
    message: string,
    public providerId: PerpsProviderType,
    public originalError?: Error,
    public isRetryable: boolean = false,
  ) {
    super(`[${providerId}] ${message}`);
  }
}

// Handle in aggregated operations
async getAggregatedPositions() {
  const results = await Promise.allSettled(
    providers.map(([id, p]) => p.getPositions())
  );

  const positions: Position[] = [];
  const errors: ProviderError[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      positions.push(...result.value);
    } else {
      errors.push(new ProviderError(
        result.reason.message,
        providerIds[i],
        result.reason,
      ));
    }
  });

  // Return partial results with error reporting
  return { positions, errors, hasPartialData: errors.length > 0 };
}
```

### Fallback Behavior

```typescript
async placeOrderWithFallback(params: OrderParams) {
  const providers = this.router.getRankedProviders(params);

  for (const providerId of providers) {
    try {
      return await this.providers.get(providerId).placeOrder(params);
    } catch (error) {
      if (!this.isRetryableError(error)) throw error;
      // Try next provider
      continue;
    }
  }

  throw new Error('All providers failed');
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('AggregatedPerpsProvider', () => {
  describe('getPositions', () => {
    it('aggregates positions from all providers', async () => {
      mockHLProvider.getPositions.mockResolvedValue([hlPosition]);
      mockMYXProvider.getPositions.mockResolvedValue([myxPosition]);

      const result = await aggregatedProvider.getPositions();

      expect(result).toHaveLength(2);
      expect(result[0].providerId).toBe('hyperliquid');
      expect(result[1].providerId).toBe('myx');
    });

    it('handles partial failures gracefully', async () => {
      mockHLProvider.getPositions.mockResolvedValue([hlPosition]);
      mockMYXProvider.getPositions.mockRejectedValue(new Error('MYX down'));

      const { positions, errors } = await aggregatedProvider.getPositions();

      expect(positions).toHaveLength(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].providerId).toBe('myx');
    });
  });
});
```

### Integration Tests

```typescript
describe('Multi-Provider Flow', () => {
  it('routes order to correct provider based on market', async () => {
    // HL has BTC, MYX has BTC
    // User preference: MYX for BTC

    await controller.setMarketPreference('BTC', 'myx');
    await controller.placeOrder({ coin: 'BTC', ... });

    expect(mockMYXProvider.placeOrder).toHaveBeenCalled();
    expect(mockHLProvider.placeOrder).not.toHaveBeenCalled();
  });

  it('aggregates prices from multiple providers in real-time', async () => {
    const priceUpdates: PriceUpdate[] = [];

    controller.subscribeToPrices({
      symbols: ['BTC', 'ETH'],
      callback: (updates) => priceUpdates.push(...updates),
    });

    // Simulate price updates from both providers
    emitHLPrice({ coin: 'BTC', price: '50000' });
    emitMYXPrice({ coin: 'BTC', price: '50100' });

    await waitFor(() => {
      expect(priceUpdates.filter(p => p.coin === 'BTC')).toHaveLength(2);
    });
  });
});
```

---

## File Structure

```
app/components/UI/Perps/
├── controllers/
│   ├── providers/
│   │   ├── AggregatedPerpsProvider.ts      # Phase 1: Aggregation wrapper
│   │   ├── HyperLiquidProvider.ts
│   │   └── MYXProvider.ts
│   ├── routing/
│   │   ├── ProviderRouter.ts               # Phase 1: Order routing
│   │   └── index.ts                        # Phase 1: Re-exports
│   ├── aggregation/
│   │   ├── SubscriptionMultiplexer.ts      # Phase 1: WebSocket multiplexing
│   │   └── index.ts                        # Phase 1: Re-exports
│   ├── types/
│   │   └── index.ts                        # Phase 1: Add providerId fields
│   └── PerpsController.ts                  # No changes for Phase 1
├── selectors/
│   └── perpsController/
│       └── index.ts                        # Already has provider selectors
├── hooks/
│   ├── usePerpsProvider.ts                 # Already has provider selection
│   ├── useAggregatedPositions.ts           # Phase 2
│   └── useMultiProviderPrices.ts           # Phase 2
└── components/
    ├── ProviderBadge/                      # Phase 2
    ├── ProviderComparison/                 # Phase 3
    └── AggregatedPortfolio/                # Phase 2
```

---

## Success Metrics

| Metric               | Current          | Target                     |
| -------------------- | ---------------- | -------------------------- |
| Provider switch time | ~2 seconds       | Instant (< 100ms)          |
| Markets available    | ~300 (HL only)   | ~500+ (HL + MYX)           |
| Price comparison     | None             | Real-time across providers |
| Portfolio visibility | Single provider  | All providers unified      |
| Order execution      | Manual selection | Automatic best routing     |

---

## Risks and Mitigations

| Risk                        | Impact                    | Mitigation                                    |
| --------------------------- | ------------------------- | --------------------------------------------- |
| Increased complexity        | Higher maintenance burden | Comprehensive testing, clear documentation    |
| WebSocket connection limits | Memory/battery usage      | Connection pooling, priority-based management |
| State inconsistency         | Incorrect data displayed  | Strong typing, validation layer               |
| Provider API differences    | Aggregation errors        | Extensive adapter testing                     |
| Performance degradation     | Slower UI                 | Parallel requests, smart caching              |

---

## Conclusion

The multi-provider architecture transforms MetaMask Mobile Perps from a single-exchange client to a **DEX aggregator**, enabling:

1. **Unified Portfolio**: Single view of all positions across providers
2. **Best Execution**: Automatic routing to optimal provider
3. **Market Coverage**: Access to all markets across all supported DEXs
4. **Resilience**: Fallback options when one provider fails

The **Wrapper Pattern** approach minimizes risk by preserving existing architecture while enabling incremental feature rollout. Phase 1 can be implemented with zero breaking changes, making it safe to deploy behind a feature flag.
