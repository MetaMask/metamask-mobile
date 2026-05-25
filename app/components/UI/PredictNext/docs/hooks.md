# PredictNext Hook Architecture

## Philosophy

PredictNext organizes hooks by domain using co-located folders with barrel exports. Data-fetching hooks are granular — each hook triggers exactly one query, so components only pay for the data they actually need. Imperative hooks (trading, transactions, live data) remain deep since they manage complex stateful workflows.

The old Predict codebase had 37 hooks, many 100-300 lines each with duplicated caching, error handling, and state management. With BaseDataService handling the heavy lifting at the service level, data hooks shrink to 3-5 lines each. Having 12-15 granular hooks is not the same problem as 37 complex ones.

Guiding rules:

- Each data hook triggers exactly one query — no wasted API calls
- Imperative hooks are deep and own async workflows
- Related hooks are co-located in domain folders with barrel exports
- View-specific derivation stays local to the view
- Components never import services directly

Related docs:

- [interface ledger](./interface-ledger.md)
- [components](./components.md)
- [state management](./state-management.md)
- [error handling](./error-handling.md)
- [testing](./testing.md)

## Hook Directory Structure

```
hooks/
├── events/
│   ├── useFeaturedEvents.ts       # carousel/featured events
│   ├── useEventList.ts            # paginated event feed
│   ├── useEventSearch.ts          # search results
│   ├── useEventDetail.ts          # single event by ID
│   ├── usePriceHistory.ts         # price history for a market
│   ├── useCryptoPriceHistory.ts   # crypto up/down price history
│   ├── useCryptoReferencePrice.ts # crypto up/down Reference Price
│   ├── usePrices.ts               # current Outcome prices
│   └── index.ts                   # barrel export
├── portfolio/
│   ├── usePositions.ts            # user positions
│   ├── useBalance.ts              # prediction market balance
│   ├── useActivity.ts             # transaction history
│   ├── usePnL.ts                  # unrealized P&L
│   └── index.ts                   # barrel export
├── trading/
│   ├── useTrading.ts              # deep — order state machine
│   └── index.ts
├── transactions/
│   ├── useTransactions.ts         # deep — deposit/withdraw/claim
│   └── index.ts
├── live-data/
│   ├── useLiveData.ts             # deep — WebSocket lifecycle
│   └── index.ts
├── navigation/
│   ├── usePredictNavigation.ts
│   └── index.ts
├── guard/
│   ├── usePredictGuard.ts
│   └── index.ts
└── index.ts                       # top-level barrel
```

Components import from the domain barrel or the top-level barrel:

```typescript
import { useFeaturedEvents } from '../hooks/events';
import { useBalance } from '../hooks/portfolio';

// or from the top-level barrel
import { useFeaturedEvents, useBalance } from '../hooks';
```

## Hook Catalog — Event Queries

All event hooks map to `MarketDataService` (BaseDataService). Each triggers exactly one query.

### useFeaturedEvents

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { PredictEvent } from '../../types';

export function useFeaturedEvents() {
  const descriptor = marketDataQueries.getCarouselEvents();

  return useQuery<PredictEvent[]>({
    queryKey: descriptor.queryKey,
  });
}
```

### useEventList

```typescript
import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { PredictEvent, FetchEventsParams } from '../../types';

export function useEventList(params: FetchEventsParams) {
  const descriptor = marketDataQueries.getEvents(params);

  const query = useInfiniteQuery<{
    items: PredictEvent[];
    cursor?: string | null;
  }>({
    queryKey: descriptor.queryKey,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  });

  const events = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const fetchMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return {
    events,
    fetchMore,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
```

### useEventSearch

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type {
  PaginatedResult,
  PredictEvent,
  SearchEventsParams,
} from '../../types';

export function useEventSearch(params: SearchEventsParams) {
  const descriptor = marketDataQueries.searchEvents(params);

  return useQuery<PaginatedResult<PredictEvent>>({
    queryKey: descriptor.queryKey,
    enabled: params.query.length > 0,
  });
}
```

### useEventDetail

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { PredictEvent } from '../../types';

export function useEventDetail(eventId: string) {
  const descriptor = marketDataQueries.getEvent(eventId);

  return useQuery<PredictEvent>({
    queryKey: descriptor.queryKey,
  });
}
```

### usePriceHistory

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { PricePoint, TimePeriod } from '../../types';

export function usePriceHistory(marketId: string, period: TimePeriod) {
  const descriptor = marketDataQueries.getPriceHistory(marketId, period);

  return useQuery<PricePoint[]>({
    queryKey: descriptor.queryKey,
  });
}
```

### useCryptoPriceHistory

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { CryptoPricePoint, CryptoPriceParams } from '../../types';

export function useCryptoPriceHistory(params: CryptoPriceParams) {
  const descriptor = marketDataQueries.getCryptoPriceHistory(params);

  return useQuery<CryptoPricePoint[]>({
    queryKey: descriptor.queryKey,
    enabled: Boolean(params.symbol) && Boolean(params.eventStartTime),
  });
}
```

### useCryptoReferencePrice

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { CryptoReferencePriceParams, ReferencePrice } from '../../types';

export function useCryptoReferencePrice(params: CryptoReferencePriceParams) {
  const descriptor = marketDataQueries.getCryptoReferencePrice(params);

  return useQuery<ReferencePrice | null>({
    queryKey: descriptor.queryKey,
    enabled:
      Boolean(params.eventId) &&
      Boolean(params.symbol) &&
      Boolean(params.eventStartTime) &&
      Boolean(params.endDate),
  });
}
```

### usePrices

```typescript
import { useQuery } from '@metamask/react-data-query';
import { marketDataQueries } from '../../query-descriptors';
import type { MarketPrices, PriceQuery } from '../../types';

export function usePrices(queries: PriceQuery[]) {
  const descriptor = marketDataQueries.getPrices(queries);

  return useQuery<MarketPrices>({
    queryKey: descriptor.queryKey,
    enabled: queries.length > 0,
  });
}
```

Notes:

- Query descriptor shapes are owned by [interface-ledger.md](./interface-ledger.md).
- Hooks import descriptor modules and pass `descriptor.queryKey`; they do not hand-author query key arrays.
- No `queryFn` is supplied — the messenger-backed query client resolves the data source.
- Each hook can be imported independently. A component needing only featured events does not trigger the event list or search queries.

## Hook Catalog — Portfolio Queries

All portfolio hooks map to `PortfolioService` (BaseDataService). Same pattern — one query per hook.

### usePositions

```typescript
import { useQuery } from '@metamask/react-data-query';
import { portfolioQueries } from '../../query-descriptors';
import type { PredictPosition } from '../../types';

export function usePositions(ownerAddress: string) {
  const descriptor = portfolioQueries.getPositions(ownerAddress);

  return useQuery<PredictPosition[]>({
    queryKey: descriptor.queryKey,
  });
}
```

### useBalance

```typescript
import { useQuery } from '@metamask/react-data-query';
import { portfolioQueries } from '../../query-descriptors';
import type { PredictBalance } from '../../types';

export function useBalance(ownerAddress: string) {
  const descriptor = portfolioQueries.getBalance(ownerAddress);

  return useQuery<PredictBalance>({
    queryKey: descriptor.queryKey,
  });
}
```

### useActivity

```typescript
import { useInfiniteQuery } from '@metamask/react-data-query';
import { portfolioQueries } from '../../query-descriptors';
import type { ActivityItem } from '../../types';

export function useActivity(ownerAddress: string) {
  const descriptor = portfolioQueries.getActivity(ownerAddress);

  return useInfiniteQuery<{ items: ActivityItem[]; cursor?: string | null }>({
    queryKey: descriptor.queryKey,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}
```

### usePnL

```typescript
import { useQuery } from '@metamask/react-data-query';
import { portfolioQueries } from '../../query-descriptors';
import type { UnrealizedPnL } from '../../types';

export function usePnL(ownerAddress: string) {
  const descriptor = portfolioQueries.getUnrealizedPnL(ownerAddress);

  return useQuery<UnrealizedPnL>({
    queryKey: descriptor.queryKey,
  });
}
```

### useTrading

Purpose:

- Drive preview, payment selection, placement, and reset flows for order entry

Maps to:

- `TradingService`
- write operations call `messenger.call('PredictTradingService:placeOrder', ...)` directly; the composition-root `PredictController` is never on the hot path

Return contract. `workflow` is the `TradingWorkflowState` discriminated union from [services.md §6](./services.md#6-tradingservice-basecontroller); `selectedPayment` is its peer slice. The hook does not expose a separate `orderError` field — error info lives on the `ERROR` variant of `workflow` and the type system enforces that it is only present there.

```typescript
function useTrading(): {
  preview: (params: PreviewParams) => Promise<OrderPreview>;
  placeOrder: (params: PlaceOrderParams) => Promise<void>;
  workflow: TradingWorkflowState; // discriminated union by status
  selectedPayment: SelectedPaymentToken | null;
  selectPayment: (token: SelectedPaymentToken) => void;
  reset: () => void;
};
```

Implementation sketch:

```typescript
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { PredictError } from '../errors/PredictError';
import {
  selectPredictActiveOrder,
  selectPredictSelectedPaymentToken,
} from '../selectors';
import type {
  OrderPreview,
  PlaceOrderParams,
  PreviewParams,
  SelectedPaymentToken,
} from '../types';

export function useTrading() {
  const messenger = Engine.controllerMessenger;

  // State subscriptions read from state.engine.backgroundState.PredictTradingService via selectors.
  // selectPredictActiveOrder returns TradingWorkflowState (the discriminated union).
  const workflow = useSelector(selectPredictActiveOrder);
  const selectedPayment = useSelector(selectPredictSelectedPaymentToken);

  const preview = useCallback(
    async (params: PreviewParams): Promise<OrderPreview> => {
      try {
        return await messenger.call(
          'PredictTradingService:previewOrder',
          params,
        );
      } catch (error) {
        throw PredictError.from(error);
      }
    },
    [messenger],
  );

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<void> => {
      try {
        await messenger.call('PredictTradingService:placeOrder', params);
      } catch (error) {
        throw PredictError.from(error);
      }
    },
    [messenger],
  );

  const selectPayment = useCallback(
    (token: SelectedPaymentToken) => {
      messenger.call('PredictTradingService:selectPaymentToken', token);
    },
    [messenger],
  );

  const reset = useCallback(() => {
    messenger.call('PredictTradingService:reset');
  }, [messenger]);

  return {
    preview,
    placeOrder,
    workflow,
    selectedPayment,
    selectPayment,
    reset,
  };
}
```

`useTrading` is intentionally a thin React integration. The order state machine, deposit-before-order chaining, rate limiting, and analytics emission all live inside `TradingService`. The hook just calls messenger actions and subscribes to the service's Redux slice; it never holds workflow state of its own.

### useTransactions

Purpose:

- Handle deposit, withdraw, and claim side effects plus pending transaction state

Maps to:

- `TransactionService`

Return contract:

```typescript
function useTransactions(): {
  deposit: (params: DepositParams) => Promise<FundingReceipt>;
  withdraw: (params: WithdrawParams) => Promise<FundingReceipt>;
  claim: (params: ClaimParams) => Promise<FundingReceipt>;
  pendingTx: PendingTransaction | null;
};
```

Implementation sketch:

```typescript
import { useCallback, useState } from 'react';
import Engine from '../../../core/Engine';
import type {
  ClaimParams,
  DepositParams,
  PendingTransaction,
  WithdrawParams,
} from '../types';

export function useTransactions() {
  const messenger = Engine.controllerMessenger;
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);

  const wrap = useCallback(
    async <T extends object>(
      kind: PendingTransaction['kind'],
      params: T,
      task: () => Promise<FundingReceipt>,
    ) => {
      setPendingTx({ kind, createdAt: Date.now(), params });
      try {
        return await task();
      } finally {
        setPendingTx(null);
      }
    },
    [],
  );

  return {
    deposit: (params: DepositParams) =>
      wrap('deposit', params, () =>
        messenger.call('PredictTransactionService:deposit', params),
      ),
    withdraw: (params: WithdrawParams) =>
      wrap('withdraw', params, () =>
        messenger.call('PredictTransactionService:withdraw', params),
      ),
    claim: (params: ClaimParams) =>
      wrap('claim', params, () =>
        messenger.call('PredictTransactionService:claim', params),
      ),
    pendingTx,
  };
}
```

`pendingTx` stays in `useState` because it's purely view-local — only the screen that initiated the deposit/withdraw/claim needs to render its progress indicator. If another surface ever needs to observe in-flight transactions, that state moves into `TransactionService`'s public state slice rather than being lifted into a shared store at the hook level.

### useLiveData

Purpose:

- Subscribe to live channels for prices, scores, and status updates

Maps to:

- `LiveDataService`

Return contract:

```typescript
function useLiveData(
  channel: string,
  params: unknown,
): {
  data: unknown;
  status: 'connected' | 'reconnecting' | 'disconnected';
};
```

Implementation sketch:

```typescript
import { useEffect, useState } from 'react';
import Engine from '../../../core/Engine';
import type { SubscriptionChannel, SubscriptionParams } from '../types';

export function useLiveData<TData>(
  channel: SubscriptionChannel,
  params: SubscriptionParams,
) {
  const messenger = Engine.controllerMessenger;
  const [data, setData] = useState<TData | null>(null);
  const [status, setStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');

  useEffect(() => {
    setStatus('reconnecting');

    // PredictLiveDataService:subscribe returns a handle that lets us tear down the subscription on unmount.
    const handlePromise = messenger.call('PredictLiveDataService:subscribe', {
      channel,
      params,
      onOpen: () => setStatus('connected'),
      onMessage: (nextData: TData) => setData(nextData),
      onClose: () => setStatus('disconnected'),
      onReconnect: () => setStatus('reconnecting'),
    });

    return () => {
      handlePromise.then((handle) => handle.unsubscribe());
    };
  }, [channel, messenger, params]);

  return { data, status };
}
```

Read-services internally subscribe to the same `LiveDataService` updates to patch their TanStack Query caches, so most components observe live data through their existing `useQuery` hooks (write-through cache pattern). `useLiveData` exists for the small number of cases where a component needs the raw stream — for example, a price-tick animation that should not invalidate a cache entry.

### usePredictNavigation

Purpose:

- Centralize route helpers, tabs, and navigation-specific screen state

Maps to:

- Predict navigation stack definitions

Return contract:

```typescript
function usePredictNavigation(): {
  navigateToEvent: (eventId: string) => void;
  navigateToOrder: (marketId: string, outcomeId: string) => void;
  navigateBack: () => void;
  tabs: TabConfig;
  scrollState: ScrollState;
};
```

Implementation sketch:

```typescript
import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

export function usePredictNavigation() {
  const navigation = useNavigation();
  const [scrollY, setScrollY] = useState(0);

  return {
    navigateToEvent: (eventId: string) =>
      navigation.navigate('PredictEventDetails', { eventId }),
    navigateToOrder: (marketId: string, outcomeId: string) =>
      navigation.navigate('PredictOrderScreen', { marketId, outcomeId }),
    navigateBack: () => navigation.goBack(),
    tabs: useMemo(
      () => ({
        home: { key: 'home', label: 'Home' },
        portfolio: { key: 'portfolio', label: 'Portfolio' },
        activity: { key: 'activity', label: 'Activity' },
      }),
      [],
    ),
    scrollState: {
      y: scrollY,
      setY: setScrollY,
      isScrolled: scrollY > 0,
    },
  };
}
```

### usePredictGuard

Purpose:

- Gate access based on eligibility, network, feature availability, and account restrictions

Maps to:

- `PredictSessionService` for **Account Readiness** and feature eligibility
- app-level wallet/network modules for network switching

Return contract:

```typescript
function usePredictGuard(): {
  isEligible: boolean;
  canTrade: boolean;
  ensureNetwork: () => Promise<boolean>;
  blockReason: string | null;
};
```

Implementation sketch:

```typescript
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ensurePredictSupportedNetwork } from '../network/ensurePredictSupportedNetwork';
import { selectPredictEligibility, selectPredictReadiness } from '../selectors';

export function usePredictGuard() {
  // Guard data composes from PredictSessionService (eligibility, Account Readiness)
  // and wallet-side network state. There is no standalone GuardService in the
  // initial seven-service model; if cross-cutting guard logic grows, the design
  // can be revisited later in this document.
  const eligibility = useSelector(selectPredictEligibility);
  const readiness = useSelector(selectPredictReadiness);

  const ensureNetwork = useCallback(async () => {
    if (readiness.canTrade) {
      return true;
    }
    return await ensurePredictSupportedNetwork();
  }, [readiness.canTrade]);

  return {
    isEligible: eligibility.eligible,
    canTrade: readiness.canTrade,
    ensureNetwork,
    blockReason:
      eligibility.blockReason ?? readiness.blockers?.[0]?.code ?? null,
  };
}
```

## View-Local Hooks Pattern

Deep hooks should not absorb every derived boolean needed by every route. View-local hooks remain thin and compute state specific to one screen.

Example:

```typescript
// app/components/UI/PredictNext/views/OrderScreen/useBuyViewState.ts
import { useMemo } from 'react';
import type { useTrading } from '../../hooks/trading';

interface UseBuyViewStateParams {
  amount: number;
  balance: number;
  trading: ReturnType<typeof useTrading>;
}

export function useBuyViewState({
  amount,
  balance,
  trading,
}: UseBuyViewStateParams) {
  return useMemo(() => {
    // The discriminated union lets us narrow on status without defensive
    // `&& Boolean(error)` checks — the ERROR variant always carries errorCode.
    const status = trading.workflow.status;
    const canPlaceOrder = status === 'IDLE' && amount > 0;
    const isInsufficientBalance = amount > balance;
    const isBusy = status === 'PREVIEWING' || status === 'PLACING_ORDER';
    const shouldShowInlineError = status === 'ERROR';

    return {
      canPlaceOrder,
      isInsufficientBalance,
      isBusy,
      shouldShowInlineError,
    };
  }, [amount, balance, trading.workflow]);
}
```

This pattern keeps deep hooks stable and reusable while allowing view code to stay explicit.

## Hook Usage by Component Tier

Not every tier uses hooks. The rule is: primitives are pure, widgets wire data, views orchestrate.

```text
Views (PredictHome, EventDetails, OrderScreen)
  │
  ├── Guard hooks:    usePredictGuard
  ├── Nav hooks:      usePredictNavigation
  ├── Imperative:     useTrading, useTransactions
  │
  └── Widgets (EventFeed, PortfolioSection, OrderForm)
        │
        ├── Data hooks:  useEventList, useFeaturedEvents, usePositions, useBalance
        │                    │
        │                    v
        │              BaseDataService (MarketDataService, PortfolioService)
        │                    │
        │                    ├── MarketDataService → PredictSessionService → PredictClient
        │                    └── PortfolioService → PredictSessionService → PredictClient
        │
        └── Primitives (EventCard, OutcomeButton, PositionCard)
              │
              └── No hooks. Pure props only.
```

| Tier                                        | Uses hooks?                    | Uses services directly? | Receives props?                |
| ------------------------------------------- | ------------------------------ | ----------------------- | ------------------------------ |
| Primitives (EventCard, OutcomeButton, etc.) | No                             | No                      | Yes — data + callbacks         |
| Widgets (EventFeed, PortfolioSection, etc.) | Yes — data query hooks         | No                      | Yes — config/params from views |
| Views (PredictHome, EventDetails, etc.)     | Yes — imperative + guard hooks | No                      | Yes — route params             |

**Primitives** are pure render components. They receive display models or domain entities via props and render them. No hooks, no side effects, no data fetching. This is what makes them reusable across feeds, detail screens, and external embed points.

**Widgets** are the integration layer between data and presentation. An `EventFeed` calls `useEventList` and `useEventSearch` internally, maps `PredictEvent` data into an `EventDisplayModel`, then renders `EventCard` primitives. A `PortfolioSection` calls `usePositions`, `useBalance`, and `usePnL`, maps those read models into display models, then renders `PositionCard` and `PriceDisplay` primitives. Widgets own the data wiring and display-model preparation so views stay thin and primitives stay pure.

**Views** compose widgets and handle cross-cutting concerns: route params, eligibility guards, imperative actions (trading, transactions). A view like `PredictHome` mostly arranges widgets — it does not fetch event lists or positions directly.

This split means:

- Changing how events are fetched only touches widget code, not view or primitive code.
- Primitives can be tested with plain props (no mock hooks needed).
- Views are easy to test with the component view framework since they mostly compose widgets.

## Hook Composition Rules

```text
Read path:
  Widget → useEventList → query descriptor → useQuery(descriptor.queryKey) → messenger → MarketDataService → PredictSessionService → PredictClient → API
  Widget → useBalance → query descriptor → useQuery(descriptor.queryKey) → messenger → PortfolioService → PredictSessionService → PredictClient → API

Write path:
  View → useTrading → messenger.call('PredictTradingService:placeOrder') → TradingService → PredictSessionService → PredictClient → API
  View → useTrading → useSelector(selectPredictActiveOrder) ← state.engine.backgroundState.PredictTradingService
```

Neither path goes through `PredictController`. The composition root only runs once during feature bootstrap; nothing addresses it after that.

1. Imperative hooks compose services, not each other.
2. Widgets compose data query hooks with primitives.
3. Views compose widgets and imperative/guard hooks.
4. Primitives never use hooks — data arrives via props.
5. No tier imports services directly — always go through hooks.
6. Query hooks use descriptor-owned query keys and avoid inline cache semantics.
7. Imperative hooks return a small state machine instead of leaking service internals.
8. Error translation happens in services or imperative hooks, never in primitives.

## Example View Composition

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { EventCard, createEventDisplayModel } from '../../components/EventCard';
import { Chart } from '../../components/Chart';
import { PositionCard } from '../../components/PositionCard';
import { useEventDetail } from '../../hooks/events';
import { usePositions } from '../../hooks/portfolio';
import { useLiveData } from '../../hooks/live-data';
import type { DecimalString } from '../../types';

export function EventDetails({
  route,
}: {
  route: { params: { eventId: string; ownerAddress: string } };
}) {
  const { data: event } = useEventDetail(route.params.eventId);
  const { data: positions } = usePositions(route.params.ownerAddress);
  const { data: livePrices } = useLiveData('marketPrices', {
    eventId: route.params.eventId,
  });

  if (!event) {
    return null;
  }

  const eventDisplay = createEventDisplayModel(event, {
    surface: 'detail',
  });

  return (
    <ScrollView>
      <EventCard display={eventDisplay}>
        <EventCard.Header />
        <EventCard.Markets />
        <EventCard.Footer />
      </EventCard>
      <Chart
        data={
          (livePrices as { timestamp: number; value: DecimalString }[]) ?? []
        }
        variant="price"
      />
      {(positions ?? []).map((position) => (
        <PositionCard key={position.id} position={position} />
      ))}
    </ScrollView>
  );
}
```

The view imports exactly the hooks it needs — `useEventDetail` and `usePositions` — triggering only two queries instead of the full event and portfolio query sets. The service layer remains hidden behind hook APIs that are stable enough for broad reuse and deep enough to absorb complexity.
