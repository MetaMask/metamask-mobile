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
│   ├── usePrices.ts               # current prices for markets
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
import type { PredictEvent } from '../../types';

export function useFeaturedEvents() {
  return useQuery<PredictEvent[]>({
    queryKey: ['PredictMarketData:getCarouselEvents'],
  });
}
```

### useEventList

```typescript
import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@metamask/react-data-query';
import type { PredictEvent, FetchEventsParams } from '../../types';

export function useEventList(params: FetchEventsParams) {
  const query = useInfiniteQuery<{
    items: PredictEvent[];
    nextCursor?: string;
  }>({
    queryKey: ['PredictMarketData:getEvents', params],
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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
import type { PredictEvent } from '../../types';

export function useEventSearch(query: string) {
  return useQuery<PredictEvent[]>({
    queryKey: ['PredictMarketData:searchEvents', query],
    enabled: query.length > 0,
  });
}
```

### useEventDetail

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { PredictEvent } from '../../types';

export function useEventDetail(eventId: string) {
  return useQuery<PredictEvent>({
    queryKey: ['PredictMarketData:getEvent', eventId],
  });
}
```

### usePriceHistory

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { PricePoint, TimePeriod } from '../../types';

export function usePriceHistory(marketId: string, period: TimePeriod) {
  return useQuery<PricePoint[]>({
    queryKey: ['PredictMarketData:getPriceHistory', marketId, period],
  });
}
```

### usePrices

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { MarketPrices } from '../../types';

export function usePrices(marketIds: string[]) {
  return useQuery<Map<string, MarketPrices>>({
    queryKey: ['PredictMarketData:getPrices', marketIds],
    enabled: marketIds.length > 0,
  });
}
```

Notes:

- Query keys are the contract between UI and service cache.
- No `queryFn` is supplied — the messenger-backed query client resolves the data source.
- Each hook can be imported independently. A component needing only featured events does not trigger the event list or search queries.

## Hook Catalog — Portfolio Queries

All portfolio hooks map to `PortfolioService` (BaseDataService). Same pattern — one query per hook.

### usePositions

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { PredictPosition } from '../../types';

export function usePositions(accountId: string) {
  return useQuery<PredictPosition[]>({
    queryKey: ['PredictPortfolio:getPositions', accountId],
  });
}
```

### useBalance

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { Balance } from '../../types';

export function useBalance(accountId: string) {
  return useQuery<Balance>({
    queryKey: ['PredictPortfolio:getBalance', accountId],
  });
}
```

### useActivity

```typescript
import { useInfiniteQuery } from '@metamask/react-data-query';
import type { ActivityItem } from '../../types';

export function useActivity(accountId: string) {
  return useInfiniteQuery<{ items: ActivityItem[]; nextCursor?: string }>({
    queryKey: ['PredictPortfolio:getActivity', accountId],
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

### usePnL

```typescript
import { useQuery } from '@metamask/react-data-query';
import type { UnrealizedPnL } from '../../types';

export function usePnL(accountId: string) {
  return useQuery<UnrealizedPnL>({
    queryKey: ['PredictPortfolio:getUnrealizedPnl', accountId],
  });
}
```

### useTrading

Purpose:

- Drive preview, payment selection, placement, and reset flows for order entry

Maps to:

- `TradingService`
- write operations eventually call `Engine.context.PredictController.placeOrder()`

Return contract:

```typescript
function useTrading(): {
  preview: (params: PreviewParams) => Promise<OrderPreview>;
  placeOrder: (params: PlaceOrderParams) => Promise<void>;
  orderState: OrderState;
  orderError: PredictError | null;
  selectedPayment: PaymentToken;
  selectPayment: (token: PaymentToken) => void;
  reset: () => void;
};
```

Implementation sketch:

```typescript
import { useCallback, useMemo, useState } from 'react';
import Engine from '../../../core/Engine';
import { PredictError } from '../errors/PredictError';
import type {
  OrderPreview,
  OrderState,
  PaymentToken,
  PlaceOrderParams,
  PreviewParams,
} from '../types';

export function useTrading() {
  const [orderState, setOrderState] = useState<OrderState>('idle');
  const [orderError, setOrderError] = useState<PredictError | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentToken>('USDC');

  const tradingService = useMemo(
    () => Engine.context.PredictTradingService,
    [],
  );

  const preview = useCallback(
    async (params: PreviewParams) => {
      setOrderState('previewing');
      setOrderError(null);

      try {
        const result: OrderPreview = await tradingService.previewOrder({
          ...params,
          paymentToken: selectedPayment,
        });
        setOrderState('idle');
        return result;
      } catch (error) {
        const predictError = tradingService.toPredictError(error);
        setOrderState('error');
        setOrderError(predictError);
        throw predictError;
      }
    },
    [selectedPayment, tradingService],
  );

  const placeOrder = useCallback(
    async (params: PlaceOrderParams) => {
      setOrderState('placing');
      setOrderError(null);

      try {
        await Engine.context.PredictController.placeOrder({
          ...params,
          paymentToken: selectedPayment,
        });
        setOrderState('success');
      } catch (error) {
        const predictError = tradingService.toPredictError(error);
        setOrderState('error');
        setOrderError(predictError);
        throw predictError;
      }
    },
    [selectedPayment, tradingService],
  );

  const reset = useCallback(() => {
    setOrderState('idle');
    setOrderError(null);
  }, []);

  return {
    preview,
    placeOrder,
    orderState,
    orderError,
    selectedPayment,
    selectPayment: setSelectedPayment,
    reset,
  };
}
```

`useTrading` is intentionally deep. It exposes a slim public contract while hiding the order state machine, service translation, and controller handoff.

### useTransactions

Purpose:

- Handle deposit, withdraw, and claim side effects plus pending transaction state

Maps to:

- `TransactionService`

Return contract:

```typescript
function useTransactions(): {
  deposit: (params: DepositParams) => Promise<void>;
  withdraw: (params: WithdrawParams) => Promise<void>;
  claim: (params: ClaimParams) => Promise<void>;
  pendingTx: PendingTransaction | null;
};
```

Implementation sketch:

```typescript
import { useCallback, useMemo, useState } from 'react';
import Engine from '../../../core/Engine';
import type {
  ClaimParams,
  DepositParams,
  PendingTransaction,
  WithdrawParams,
} from '../types';

export function useTransactions() {
  const transactionService = useMemo(
    () => Engine.context.PredictTransactionService,
    [],
  );
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);

  const wrap = useCallback(
    async <T extends object>(
      kind: PendingTransaction['kind'],
      params: T,
      task: () => Promise<void>,
    ) => {
      setPendingTx({ kind, createdAt: Date.now(), params });
      try {
        await task();
      } finally {
        setPendingTx(null);
      }
    },
    [],
  );

  return {
    deposit: (params: DepositParams) =>
      wrap('deposit', params, () => transactionService.deposit(params)),
    withdraw: (params: WithdrawParams) =>
      wrap('withdraw', params, () => transactionService.withdraw(params)),
    claim: (params: ClaimParams) =>
      wrap('claim', params, () => transactionService.claim(params)),
    pendingTx,
  };
}
```

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
import { useEffect, useMemo, useState } from 'react';
import Engine from '../../../core/Engine';

export function useLiveData(channel: string, params: unknown) {
  const liveDataService = useMemo(
    () => Engine.context.PredictLiveDataService,
    [],
  );
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');

  useEffect(() => {
    setStatus('reconnecting');

    const unsubscribe = liveDataService.subscribe(channel, params, {
      onOpen: () => setStatus('connected'),
      onMessage: (nextData: unknown) => setData(nextData),
      onClose: () => setStatus('disconnected'),
      onReconnect: () => setStatus('reconnecting'),
    });

    return unsubscribe;
  }, [channel, liveDataService, params]);

  return { data, status };
}
```

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

- guard and eligibility services coordinated by the controller layer

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
import { useCallback, useMemo } from 'react';
import Engine from '../../../core/Engine';

export function usePredictGuard() {
  const guardService = useMemo(() => Engine.context.PredictGuardService, []);
  const state = guardService.getCurrentState();

  const ensureNetwork = useCallback(async () => {
    if (state.canTrade) {
      return true;
    }

    return await guardService.ensureSupportedNetwork();
  }, [guardService, state.canTrade]);

  return {
    isEligible: state.isEligible,
    canTrade: state.canTrade,
    ensureNetwork,
    blockReason: state.blockReason,
  };
}
```

## View-Local Hooks Pattern

Deep hooks should not absorb every derived boolean needed by every route. View-local hooks remain thin and compute state specific to one screen.

Example:

```typescript
// app/components/UI/PredictNext/components/views/OrderScreen/useBuyViewState.ts
import { useMemo } from 'react';
import type { useTrading } from '../../../hooks/useTrading';

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
    const canPlaceBet = trading.orderState === 'idle' && amount > 0;
    const isInsufficientBalance = amount > balance;
    const isBusy =
      trading.orderState === 'previewing' || trading.orderState === 'placing';
    const shouldShowInlineError =
      trading.orderState === 'error' && Boolean(trading.orderError);

    return {
      canPlaceBet,
      isInsufficientBalance,
      isBusy,
      shouldShowInlineError,
    };
  }, [amount, balance, trading.orderError, trading.orderState]);
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
        │                    v
        │              PredictAdapter
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

**Primitives** are pure render components. They receive domain entities via props and render them. No hooks, no side effects, no data fetching. This is what makes them reusable across feeds, detail screens, and external embed points.

**Widgets** are the integration layer between data and presentation. An `EventFeed` calls `useEventList` and `useEventSearch` internally, then renders `EventCard` primitives. A `PortfolioSection` calls `usePositions`, `useBalance`, and `usePnL`, then renders `PositionCard` and `PriceDisplay` primitives. Widgets own the data wiring so views stay thin.

**Views** compose widgets and handle cross-cutting concerns: route params, eligibility guards, imperative actions (trading, transactions). A view like `PredictHome` mostly arranges widgets — it does not fetch event lists or positions directly.

This split means:

- Changing how events are fetched only touches widget code, not view or primitive code.
- Primitives can be tested with plain props (no mock hooks needed).
- Views are easy to test with the component view framework since they mostly compose widgets.

## Hook Composition Rules

```text
Read path:
  Widget → useEventList → useQuery(queryKey) → messenger → MarketDataService → adapter → API

Write path:
  View → useTrading → Engine.context.PredictController → TradingService → adapter → API
```

1. Imperative hooks compose services, not each other.
2. Widgets compose data query hooks with primitives.
3. Views compose widgets and imperative/guard hooks.
4. Primitives never use hooks — data arrives via props.
5. No tier imports services directly — always go through hooks.
6. Query hooks use stable query keys and avoid inline cache semantics.
7. Imperative hooks return a small state machine instead of leaking service internals.
8. Error translation happens in services or imperative hooks, never in primitives.

## Example View Composition

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { EventCard } from '../components/EventCard';
import { Chart } from '../components/Chart';
import { PositionCard } from '../components/PositionCard';
import { useEventDetail } from '../hooks/events';
import { usePositions } from '../hooks/portfolio';
import { useLiveData } from '../hooks/live-data';

export function EventDetails({
  route,
}: {
  route: { params: { eventId: string; accountId: string } };
}) {
  const { data: event } = useEventDetail(route.params.eventId);
  const { data: positions } = usePositions(route.params.accountId);
  const { data: livePrices } = useLiveData('event-prices', {
    eventId: route.params.eventId,
  });

  if (!event) {
    return null;
  }

  return (
    <ScrollView>
      <EventCard event={event} variant="detail">
        <EventCard.Header />
        <EventCard.Markets />
        <EventCard.Footer />
      </EventCard>
      <Chart
        data={(livePrices as { timestamp: number; value: number }[]) ?? []}
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
