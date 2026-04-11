# PredictNext Hook Architecture

## Philosophy

PredictNext reduces hook surface area by using a small number of deep hooks rather than many view-specific wrappers. The target is seven deep hooks aligned to service domains.

Guiding rules:

- Data hooks are thin and query-oriented
- Imperative hooks are deep and own async workflows
- View-specific derivation stays local to the view
- Components never import services directly

Related docs:

- [components](./components.md)
- [state management](./state-management.md)
- [error handling](./error-handling.md)
- [testing](./testing.md)

## Hook Catalog

### useEvents

Purpose:

- Read event lists, featured content, and paginated market data

Maps to:

- `MarketDataService`, implemented as a `BaseDataService`

Return contract:

```typescript
function useEvents(params?: EventsParams): {
  events: PredictEvent[];
  featured: PredictEvent[];
  search: (query: string) => void;
  fetchMore: () => void;
  isLoading: boolean;
  isError: boolean;
};
```

Implementation sketch:

```typescript
import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@metamask/react-data-query';
import type { EventsParams, PredictEvent } from '../types';

interface EventsResult {
  events: PredictEvent[];
  featured: PredictEvent[];
  search: (query: string) => void;
  fetchMore: () => void;
  isLoading: boolean;
  isError: boolean;
}

export function useEvents(initialParams?: EventsParams): EventsResult {
  const [searchQuery, setSearchQuery] = useState('');
  const params = useMemo(
    () => ({ ...initialParams, searchQuery }),
    [initialParams, searchQuery],
  );

  const featuredQuery = useQuery<PredictEvent[]>({
    queryKey: ['PredictMarketData:getCarouselEvents'],
  });

  const eventsQuery = useInfiniteQuery<{
    items: PredictEvent[];
    nextCursor?: string;
  }>({
    queryKey: ['PredictMarketData:getEvents', params],
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [eventsQuery.data],
  );

  const fetchMore = useCallback(() => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  }, [eventsQuery]);

  return {
    events,
    featured: featuredQuery.data ?? [],
    search: setSearchQuery,
    fetchMore,
    isLoading: featuredQuery.isLoading || eventsQuery.isLoading,
    isError: featuredQuery.isError || eventsQuery.isError,
  };
}
```

Notes:

- query keys are the contract between UI and service cache
- no `queryFn` is supplied in UI code
- the messenger-backed query client resolves the data source

### usePortfolio

Purpose:

- Read positions, activity, balance, and aggregate P&L for one account

Maps to:

- `PortfolioService`, implemented as a `BaseDataService`

Return contract:

```typescript
function usePortfolio(accountId: string): {
  positions: PredictPosition[];
  activity: ActivityItem[];
  balance: Balance;
  pnl: UnrealizedPnL;
  refresh: () => void;
};
```

Implementation sketch:

```typescript
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@metamask/react-data-query';
import type {
  ActivityItem,
  Balance,
  PredictPosition,
  UnrealizedPnL,
} from '../types';

export function usePortfolio(accountId: string) {
  const queryClient = useQueryClient();

  const positionsQuery = useQuery<PredictPosition[]>({
    queryKey: ['PredictPortfolio:getPositions', accountId],
  });
  const activityQuery = useQuery<ActivityItem[]>({
    queryKey: ['PredictPortfolio:getActivity', accountId],
  });
  const balanceQuery = useQuery<Balance>({
    queryKey: ['PredictPortfolio:getBalance', accountId],
  });
  const pnlQuery = useQuery<UnrealizedPnL>({
    queryKey: ['PredictPortfolio:getUnrealizedPnl', accountId],
  });

  const refresh = useCallback(() => {
    void Promise.all([
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
  }, [accountId, queryClient]);

  return {
    positions: positionsQuery.data ?? [],
    activity: activityQuery.data ?? [],
    balance: balanceQuery.data ?? { available: '0', currency: 'USDC' },
    pnl: pnlQuery.data ?? { amount: '0', percentage: 0 },
    refresh,
  };
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

## Hook Composition Rules

1. Deep hooks compose services, not each other.
2. Views compose deep hooks and thin local hooks.
3. Components do not import services directly.
4. Query hooks use stable query keys and avoid inline cache semantics.
5. Imperative hooks return a small state machine instead of leaking service internals.
6. Error translation happens in services or deep hooks, never in presentational components.

## Example View Composition

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { EventCard } from '../components/primitives/EventCard';
import { Chart } from '../components/primitives/Chart';
import { PositionCard } from '../components/primitives/PositionCard';
import { useEvents } from '../hooks/useEvents';
import { usePortfolio } from '../hooks/usePortfolio';
import { useLiveData } from '../hooks/useLiveData';

export function EventDetails({
  route,
}: {
  route: { params: { eventId: string; accountId: string } };
}) {
  const { events } = useEvents({ eventId: route.params.eventId });
  const { positions } = usePortfolio(route.params.accountId);
  const { data: livePrices } = useLiveData('event-prices', {
    eventId: route.params.eventId,
  });

  const event = events[0];

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
      {positions.map((position) => (
        <PositionCard key={position.id} position={position} />
      ))}
    </ScrollView>
  );
}
```

The important boundary is that views orchestrate and primitives render. The service layer remains hidden behind hook APIs that are stable enough for broad reuse and deep enough to absorb complexity.
