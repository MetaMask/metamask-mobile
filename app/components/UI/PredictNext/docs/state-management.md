# PredictNext State Management

## State Categories

PredictNext uses four state categories, each chosen for a specific kind of responsibility.

| Category                     | Where                                                      | Why                                                                                               | Examples                                                               |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Server cache                 | `BaseDataService`-backed services and UI query cache       | Fetched-and-cached data with staleness, refetching, deduplication, and write-through live updates | Events, markets, positions, activity, balance, prices                  |
| Service-owned workflow state | `BaseController`-backed services (per-service Redux slice) | Survives navigation; provides cross-component reactivity through Redux selectors                  | Active order state machine, selected payment token, account readiness  |
| Transient service internals  | Service private fields                                     | Implementation detail not read directly by UI                                                     | Rate limit timestamps, WebSocket socket handles, circuit breaker state |
| View-local state             | React `useState` and local hooks                           | Dies with the view and stays close to interaction logic                                           | Keypad input, scroll position, search query, bottom sheet visibility   |

```text
┌─────────────────────────────────────────────────────────────┐
│                    PredictNext State Map                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ React Local State ──────────────────────────────┐      │
│  │  useState / local hooks                           │      │
│  │  keypad input, scroll, search, tabs               │      │
│  │  Dies with the view                               │      │
│  └───────────────────────────────────────────────────┘      │
│                                                             │
│  ┌─ Redux (per-service BaseController slices) ──────┐      │
│  │  state.engine.backgroundState.PredictTradingService:     │      │
│  │    activeOrder, selectedPaymentToken, status      │      │
│  │  state.engine.backgroundState.PredictSession      │      │
│  │  Service: readiness, eligibility summary          │      │
│  │  Each slice declares persistence per field        │      │
│  │  via StateMetadata; most workflow state is        │      │
│  │  persist: false.                                  │      │
│  └───────────────────────────────────────────────────┘      │
│                                                             │
│  ┌─ BaseDataService Cache ──────────────────────────┐      │
│  │  Server cache (TanStack Query)                    │      │
│  │  events, markets, positions, balance, activity    │      │
│  │  Shared, deduplicated, live-update patched        │      │
│  └───────────────────────────────────────────────────┘      │
│                                                             │
│  ┌─ Service Internals ──────────────────────────────┐      │
│  │  Transient operational state                      │      │
│  │  rate limits, socket state, circuits              │      │
│  │  Never exposed to UI                              │      │
│  └───────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

`PredictController` does not appear in the state map. It is a stateless composition root; it instantiates services and steps out of the way. There is no shared `state.engine.backgroundState.PredictController` slice for PredictNext.

This division keeps the persistent state footprint small and places each concern where it can be managed most naturally.

Related docs:

- [interface ledger](./interface-ledger.md)
- [hooks](./hooks.md)
- [components](./components.md)
- [error handling](./error-handling.md)
- [testing](./testing.md)

## BaseDataService Integration

PredictNext read services should use `@metamask/base-data-service` so fetched data is cache-aware, deduplicated, and naturally aligned with the UI query layer.

Primary read services:

- `MarketDataService`
- `PortfolioService`

Key rules:

- each service owns an internal query client
- service methods call `this.fetchQuery()` with canonical query keys
- UI reads with `useQuery` and `useInfiniteQuery` from `@metamask/react-data-query`
- UI does not define `queryFn` for service-backed reads
- cache synchronization flows through messenger events
- live updates patch service-owned query caches only when they include stable identifiers and complete-enough data
- live updates invalidate/refetch query families when safe patching is uncertain
- UI should not apply separate overlay state

Registration requirement:

- add service names to `app/constants/data-services.ts` in `DATA_SERVICES`
- `app/core/ReactQueryService/` creates the UI query client via `createUIQueryClient`

### Full read data flow

```text
UI: useQuery({ queryKey: ['PredictMarketDataService:getEvents', params] })
  → ReactQueryService.queryClient (UI QueryClient)
    → createUIQueryClient intercepts, calls messenger adapter
      → Engine.controllerMessenger.call('PredictMarketDataService:getEvents', params)
        → MarketDataService.getEvents(params)
          → this.fetchQuery({ queryKey, queryFn: () => client.fetchEvents(params) })
            → PredictSessionService.getClient(ownerAddress)
            → PredictClient.fetchEvents(params) → PolymarketAdapter → HTTP → Polymarket Gamma API
          → result cached in service internal QueryClient
          → service publishes 'PredictMarketDataService:cacheUpdated:hash' event
            → UI QueryClient updates cache
              → component re-renders

Live update path:

Venue stream → PredictClient → LiveDataService
  → MarketDataService/PortfolioService patch or invalidate internal QueryClient entries
  → service publishes cacheUpdated events
  → UI QueryClient updates cache
  → component re-renders
```

### Example BaseDataService method

```typescript
import { BaseDataService } from '@metamask/base-data-service';
import type { EventsParams, PredictEvent } from '../types';

export class MarketDataService extends BaseDataService {
  readonly name = 'PredictMarketDataService';

  async getEvents(params: EventsParams = {}) {
    return await this.fetchQuery<PredictEvent[]>({
      queryKey: ['PredictMarketDataService:getEvents', params],
      staleTime: 5 * 60 * 1000,
      queryFn: async () => {
        const ownerAddress = await this.getCurrentOwnerAddress();
        const client = await this.predictSessionService.getClient(ownerAddress);
        return await client.fetchEvents(params);
      },
    });
  }

  async getEvent(eventId: string) {
    return await this.fetchQuery<PredictEvent>({
      queryKey: ['PredictMarketDataService:getEvent', eventId],
      staleTime: 60 * 1000,
      queryFn: async () => {
        const ownerAddress = await this.getCurrentOwnerAddress();
        const client = await this.predictSessionService.getClient(ownerAddress);
        return await client.fetchEvent(eventId);
      },
    });
  }
}
```

### Example UI query usage

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { PredictEvent } from '../types';

export function useEventDetail(eventId: string) {
  return useQuery<PredictEvent>({
    queryKey: ['PredictMarketDataService:getEvent', eventId],
  });
}
```

This arrangement makes read state declarative and minimizes Redux involvement for fetched data.

## Redux State Shape

Redux stores only state that needs cross-component reactivity or selective persistence. Market data, portfolio lists, and balances live in the query cache, not in Redux. Workflow state lives in per-service `BaseController` slices, not in a single feature-wide slice.

Each state-owning service declares its own `BaseController` state shape and `StateMetadata`. The full PredictNext Redux footprint is the union of those slices. Concrete shapes are owned by each service's chapter in [services.md](./services.md); this section describes only how each slice is shaped and which fields persist.

`TradingService` state slice (sketch):

```typescript
interface SelectedPaymentToken {
  tokenAddress: string;
  symbol: string;
}

interface TradingServiceState {
  status:
    | 'IDLE'
    | 'PREVIEWING'
    | 'DEPOSITING'
    | 'PLACING_ORDER'
    | 'SUCCESS'
    | 'ERROR';
  activePreview: OrderPreview | null;
  lastOrderReceipt: OrderReceipt | null;
  lastErrorCode: PredictErrorCode | null;
  selectedPayment: SelectedPaymentToken | null;
}

// StateMetadata: all workflow fields persist: false.
const tradingMetadata: StateMetadata<TradingServiceState> = {
  status: { persist: false, anonymous: true },
  activePreview: { persist: false, anonymous: true },
  lastOrderReceipt: { persist: false, anonymous: true },
  lastErrorCode: { persist: false, anonymous: true },
  selectedPayment: { persist: false, anonymous: true },
};
```

`PredictSessionService` state slice (sketch):

```typescript
interface PredictSessionServiceState {
  readinessByOwner: Record<string, PredictAccountReadiness>;
  eligibility: { eligible: boolean; blockReason?: string };
  // activeVenueId is intentionally omitted from the initial design.
  // If/when venue selection becomes a sticky user preference rather than
  // a geo-derived runtime decision, add it as a persist: true field.
}

const sessionMetadata: StateMetadata<PredictSessionServiceState> = {
  readinessByOwner: { persist: false, anonymous: true },
  eligibility: { persist: false, anonymous: true },
};
```

Benefits of the per-service shape:

- each service owns one slice with one focused `:stateChange` event
- field-level `StateMetadata` lets persistence and debug-snapshot inclusion be tuned per concern
- no shared `PredictController` slice means no cross-feature coupling at the state level
- adding a service means adding a slice, not extending a god state shape
- removing a service means removing a slice, not editing a god state shape

## Query Key Convention

Canonical query key shapes are owned by [interface-ledger.md](./interface-ledger.md). Query keys follow the runtime namespace rule:

```typescript
[
  'PredictMarketDataService:getEvents',
  { category: 'sports', cursor: 'next-page' },
];
['PredictMarketDataService:getEvent', 'event-42'];
['PredictMarketDataService:getCarouselEvents'];
['PredictPortfolioService:getPositions', ownerAddress];
['PredictPortfolioService:getBalance', ownerAddress];
['PredictPortfolioService:getActivity', ownerAddress, cursor];
```

Why this matters:

- cache keys are readable in tooling and logs
- query invalidation becomes consistent
- UI and services share one stable interface

## Stale Time Strategy

Different data types need different freshness policies.

| Data Type       | Stale Time | Rationale                                         |
| --------------- | ---------- | ------------------------------------------------- |
| Event metadata  | 5 min      | Titles, images, and descriptions change rarely    |
| Market prices   | 1 min      | Prices move often and must stay useful            |
| Resolved events | 1 hour     | Post-resolution data is mostly static             |
| Positions       | 1 min      | Portfolio views should feel current               |
| Balance         | 30 sec     | Order entry requires fresher values               |
| Activity        | 5 min      | Historical records rarely need sub-minute refresh |
| Carousel        | 5 min      | Curated content changes slowly                    |

Example service configuration:

```typescript
await this.fetchQuery({
  queryKey: ['PredictPortfolioService:getBalance', ownerAddress],
  staleTime: 30 * 1000,
  queryFn: async () => {
    const client = await this.predictSessionService.getClient(ownerAddress);
    return await client.fetchBalance();
  },
});
```

## Cache Invalidation

Mutation flows should invalidate only the queries affected by the write.

Rules:

- after placing order, invalidate positions and balance
- after deposit or withdraw, invalidate balance
- after claim, invalidate positions and balance
- manual refresh invalidates all current-account Predict queries

Example invalidation helper:

```typescript
import { QueryClient } from '@metamask/react-data-query';

export async function invalidateAfterOrder(
  queryClient: QueryClient,
  ownerAddress: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolioService:getPositions', ownerAddress],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolioService:getBalance', ownerAddress],
    }),
  ]);
}
```

Manual refresh example:

```typescript
export async function refreshPredictAccount(
  queryClient: QueryClient,
  ownerAddress: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolioService:getPositions', ownerAddress],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolioService:getActivity', ownerAddress],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolioService:getBalance', ownerAddress],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolioService:getUnrealizedPnL', ownerAddress],
    }),
  ]);
}
```

## Where state belongs — decision rule

A useful decision tree, applied in order:

1. **Is it fetched server data?** → Cache it in a `BaseDataService`-backed service. Hooks read via `useQuery`.
2. **Does it need cross-component reactivity?** → Owning service extends `BaseController` and exposes the field in its slice. Hooks read via `useSelector`. Mutations happen through `this.update()` inside the service.
3. **Does only one screen need it?** → Local `useState` inside the screen (or a view-local hook colocated with the screen).
4. **Is it pure implementation detail the UI never reads?** → Private field on the service.

Examples:

```typescript
// Server data: positions live in PortfolioService's query cache.
const { data: positions } = useQuery({
  queryKey: ['PredictPortfolioService:getPositions', ownerAddress],
});

// Workflow state with cross-component reactivity:
// activeOrder lives in TradingService's BaseController slice.
const activeOrder = useSelector(selectPredictActiveOrder);

// Workflow mutations call messenger actions:
messenger.call('PredictTradingService:placeOrder', params);

// View-local input: keypad amount only the OrderScreen renders.
const [typedAmount, setTypedAmount] = useState('0');

// Private service detail: rate-limit window, not exposed.
// (Lives as a private field inside TradingService; never published.)
```

## Summary

PredictNext state management works best when read data is query-backed, workflow state lives in per-service `BaseController` slices, and ephemeral UI logic stays local. There is no shared `PredictController` Redux slice and no unified feature-wide state shape. Each service owns one slice with one focused `:stateChange` event and one `StateMetadata` config. This removes redundant state ownership and supports the redesign goal of deep modules with slim interfaces.
