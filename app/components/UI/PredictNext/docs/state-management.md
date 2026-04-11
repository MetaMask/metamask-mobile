# PredictNext State Management

## State Categories

PredictNext uses four state categories, each chosen for a specific kind of responsibility.

| Category                | Where                              | Why                                                                   | Examples                                                                  |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Server cache            | BaseDataService and UI query cache | Fetched-and-cached data with staleness, refetching, and deduplication | Events, markets, positions, activity, balance, prices                     |
| Session state           | Redux in `PredictController`       | Persists across navigation and backgrounding                          | Active order, selected payment token, pending deposits and claims         |
| Transient service state | Service internals                  | Implementation detail not read directly by UI                         | Rate limiting timestamps, optimistic overlays, WebSocket connection state |
| View-local state        | React `useState` and local hooks   | Dies with the view and stays close to interaction logic               | Keypad input, scroll position, search query, bottom sheet visibility      |

This division keeps the persistent state footprint small and places each concern where it can be managed most naturally.

Related docs:

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

Registration requirement:

- add service names to `app/constants/data-services.ts` in `DATA_SERVICES`
- `app/core/ReactQueryService/` creates the UI query client via `createUIQueryClient`

### Full read data flow

```text
UI: useQuery({ queryKey: ['PredictMarketData:getEvents', params] })
  → ReactQueryService.queryClient (UI QueryClient)
    → createUIQueryClient intercepts, calls messenger adapter
      → Engine.controllerMessenger.call('PredictMarketData:getEvents', params)
        → MarketDataService.getEvents(params)
          → this.fetchQuery({ queryKey, queryFn: () => adapter.fetchEvents(params) })
            → PolymarketAdapter.fetchEvents(params) → HTTP → Polymarket Gamma API
          → result cached in service internal QueryClient
          → service publishes 'PredictMarketData:cacheUpdated:hash' event
            → UI QueryClient updates cache
              → component re-renders
```

### Example BaseDataService method

```typescript
import { BaseDataService } from '@metamask/base-data-service';
import type { EventsParams, PredictEvent } from '../types';

export class MarketDataService extends BaseDataService {
  readonly name = 'PredictMarketData';

  async getEvents(params: EventsParams = {}) {
    return await this.fetchQuery<PredictEvent[]>({
      queryKey: ['PredictMarketData:getEvents', params],
      staleTime: 5 * 60 * 1000,
      queryFn: async () => await this.adapter.fetchEvents(params),
    });
  }

  async getEvent(eventId: string) {
    return await this.fetchQuery<PredictEvent>({
      queryKey: ['PredictMarketData:getEvent', eventId],
      staleTime: 60 * 1000,
      queryFn: async () => await this.adapter.fetchEvent(eventId),
    });
  }
}
```

### Example UI query usage

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { PredictEvent } from '../types';

export function useEvent(eventId: string) {
  return useQuery<PredictEvent>({
    queryKey: ['PredictMarketData:getEvent', eventId],
  });
}
```

This arrangement makes read state declarative and minimizes Redux involvement for fetched data.

## Redux State Shape

Redux stores only session state that must survive navigation and backgrounding. Market data, portfolio lists, and balances should not live in Redux when they can live in the query cache.

Minimal `PredictController` state:

```typescript
interface ActiveOrderState {
  marketId: string;
  outcomeId: string;
  amount: string;
  side: 'buy' | 'sell';
  startedAt: number;
}

interface PendingDeposit {
  transactionId: string;
  amount: string;
  createdAt: number;
}

interface PendingClaim {
  positionId: string;
  transactionId: string;
  createdAt: number;
}

interface AccountMeta {
  lastViewedEventId?: string;
  hasSeenPredictEducation?: boolean;
}

interface PaymentToken {
  symbol: string;
  address: string;
  decimals: number;
}

interface PredictControllerState {
  activeOrder: ActiveOrderState | null;
  selectedPaymentToken: PaymentToken | null;
  pendingDeposits: Record<string, PendingDeposit>;
  pendingClaims: Record<string, PendingClaim>;
  accountMeta: Record<string, AccountMeta>;
}
```

Benefits of the reduced shape:

- smaller persistence payloads
- less stale duplication
- less reducer branching
- fewer state synchronization bugs between Redux and server cache

## Query Key Convention

All query keys follow the same convention:

```typescript
['ServiceName:methodName', ...params];
```

Examples:

```typescript
['PredictMarketData:getEvents', { category: 'sports', cursor: 'next-page' }][
  ('PredictMarketData:getEvent', 'event-42')
]['PredictMarketData:getCarouselEvents'][
  ('PredictPortfolio:getPositions', 'account-1')
][('PredictPortfolio:getBalance', 'account-1')][
  ('PredictPortfolio:getActivity', 'account-1')
];
```

Why this matters:

- cache keys are readable in tooling and logs
- query invalidation becomes consistent
- UI and services share one stable contract

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
  queryKey: ['PredictPortfolio:getBalance', accountId],
  staleTime: 30 * 1000,
  queryFn: async () => await this.adapter.fetchBalance(accountId),
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
  accountId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolio:getPositions', accountId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolio:getBalance', accountId],
    }),
  ]);
}
```

Manual refresh example:

```typescript
export async function refreshPredictAccount(
  queryClient: QueryClient,
  accountId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolio:getPositions', accountId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolio:getActivity', accountId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolio:getBalance', accountId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['PredictPortfolio:getUnrealizedPnl', accountId],
    }),
  ]);
}
```

## Session State vs View State

A useful decision rule:

- if the state must survive route changes or backgrounding, put it in Redux
- if the state is fetched, cache it in services and query clients
- if the state is implementation-only, keep it inside the service
- if the state exists only for one rendered route, keep it local

Examples:

```typescript
// Good local state: keypad input for the active OrderScreen session
const [typedAmount, setTypedAmount] = useState('0');

// Good Redux state: selected payment token reused across Predict flows
dispatch(setSelectedPaymentToken(token));

// Good query cache state: positions fetched from portfolio service
const { data: positions } = useQuery({
  queryKey: ['PredictPortfolio:getPositions', accountId],
});
```

## Summary

PredictNext state management works best when read data is query-backed, session intent lives in Redux, and ephemeral UI logic stays local. This removes redundant state ownership and supports the redesign goal of deep modules with slim interfaces.
