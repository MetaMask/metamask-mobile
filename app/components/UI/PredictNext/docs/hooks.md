# PredictNext Hook Architecture

## Philosophy

PredictNext organizes hooks by domain using co-located folders with barrel exports. Data hooks are granular—one descriptor-owned query each. Event hooks carry explicit `venueId`; portfolio and workflow hooks carry `PredictAccountScope`. Imperative hooks remain thin React integrations over deep service-owned workflows. `useLiveData` exists only when a live capability is implemented; bounded polling is valid for Kalshi v1.

The old Predict codebase had 37 hooks, many 100-300 lines each with duplicated caching, error handling, and state management. With BaseDataService handling the heavy lifting at the service level, data hooks shrink to 3-5 lines each. Having 12-15 granular hooks is not the same problem as 37 complex ones.

Guiding rules:

- each data hook triggers one Venue/account-scoped query,
- hooks never infer one global active Venue for mixed data,
- imperative hooks call deep services; they do not own idempotency/retry state machines,
- committed operations resume by safe operation reference rather than view-local assumptions,
- related hooks are co-located with barrel exports,
- view-specific display derivation stays local,
- components never import services/adapters directly,
- sensitive setup values never enter query keys, Redux, errors, or analytics.

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
│   ├── useFeaturedEvents.ts       # optional carousel/curation capability
│   ├── useEventList.ts            # paginated event feed
│   ├── useEventSearch.ts          # optional search capability
│   ├── useEventDetail.ts          # single event by ID
│   ├── usePriceHistory.ts         # price history for a market
│   ├── useCryptoPriceHistory.ts   # optional crypto capability
│   ├── useCryptoReferencePrice.ts # optional crypto capability
│   ├── usePrices.ts               # current Outcome prices
│   └── index.ts                   # barrel export
├── portfolio/
│   ├── usePositions.ts            # user positions
│   ├── useBalance.ts              # prediction market balance
│   ├── useActivity.ts             # transaction history
│   ├── usePnL.ts                  # unrealized P&L
│   └── index.ts                   # barrel export
├── trading/
│   ├── useTrading.ts              # thin integration over TradingService
│   └── index.ts
├── transactions/
│   ├── useTransactions.ts         # thin integration over funding service
│   └── index.ts
├── live-data/                      # directory created with live capability
│   ├── useLiveData.ts             # optional integration over LiveDataService
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

Core Event hooks map to `MarketDataService` and take explicit `venueId`. Featured/search/crypto hooks are added and exported only with their adapter/product capability.

```typescript
// Optional: carousel/curation capability.
export function useFeaturedEvents(venueId: PredictVenueId) {
  return useQuery<PredictEvent[]>({
    queryKey: marketDataQueries.getCarouselEvents(venueId).queryKey,
  });
}

export function useEventList(
  venueId: PredictVenueId,
  params: FetchEventsParams,
) {
  const descriptor = marketDataQueries.getEvents(venueId, params);
  return useInfiniteQuery<PaginatedResult<PredictEvent>>({
    queryKey: descriptor.queryKey,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

// Optional: search capability.
export function useEventSearch(
  venueId: PredictVenueId,
  params: SearchEventsParams,
) {
  return useQuery<PaginatedResult<PredictEvent>>({
    queryKey: marketDataQueries.searchEvents(venueId, params).queryKey,
    enabled: params.query.length > 0,
  });
}

export function useEventDetail(venueId: PredictVenueId, eventId: string) {
  return useQuery<PredictEvent>({
    queryKey: marketDataQueries.getEvent(venueId, eventId).queryKey,
  });
}

export function usePriceHistory(
  venueId: PredictVenueId,
  marketId: string,
  period: TimePeriod,
) {
  return useQuery<PricePoint[]>({
    queryKey: marketDataQueries.getPriceHistory(venueId, marketId, period)
      .queryKey,
  });
}

export function usePrices(venueId: PredictVenueId, queries: PriceQuery[]) {
  return useQuery<MarketPrices>({
    queryKey: marketDataQueries.getPrices(venueId, queries).queryKey,
    enabled: queries.length > 0,
  });
}
```

Search, carousel, series, and crypto hooks are exported only when the corresponding adapter/product capability exists. Hooks use descriptor keys and no independent `queryFn`/cache policy.

## Hook Catalog — Portfolio Queries

All portfolio hooks map to `PortfolioService` (BaseDataService). Same pattern — one query per hook.

### usePositions

```typescript
import { useQuery } from '@metamask/react-data-query';
import { portfolioQueries } from '../../query-descriptors';
import type { PredictPosition } from '../../types';

export function usePositions(scope: PredictAccountScope) {
  const descriptor = portfolioQueries.getPositions(scope);

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

export function useBalance(scope: PredictAccountScope) {
  const descriptor = portfolioQueries.getBalance(scope);

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

export function useActivity(scope: PredictAccountScope) {
  const descriptor = portfolioQueries.getActivity(scope);

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
import type { PredictPnL } from '../../types';

export function usePnL(scope: PredictAccountScope) {
  const descriptor = portfolioQueries.getUnrealizedPnL(scope);

  return useQuery<PredictPnL>({
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

`useTrading` is a thin React integration. Preview expiry, idempotent submission, optional automatic funding policy, rate limiting, reconciliation, and analytics live inside `TradingService`. Kalshi v1 uses explicit Deposit first. The hook calls messenger actions and subscribes to the service projection; it never owns workflow state.

### useTransactions

`useTransactions(scope)` calls the supported `TransactionService` intents and exposes a view-local projection of the current invocation. The backend Venue Operation remains authoritative after commit.

```typescript
type TransactionWorkflowProjection =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'awaiting_confirmation'; plan: FundingPlan }
  | { status: 'committing'; operationId: string }
  | { status: 'reconciling'; operationId: string }
  | { status: 'success'; receipt: FundingReceipt }
  | {
      status: 'error';
      errorCode: PredictErrorCode;
      operationId?: string;
    };

function useTransactions(scope: PredictAccountScope): {
  deposit?: (params: DepositParams) => Promise<FundingReceipt>;
  withdraw?: (params: WithdrawParams) => Promise<FundingReceipt>;
  claim?: (params: ClaimParams) => Promise<FundingReceipt>;
  resume: (operationId: string) => Promise<FundingReceipt>;
  workflow: TransactionWorkflowProjection;
  operations: FundingOperationProjection[];
};
```

Operations are present only when the Venue capability supports them. Kalshi exposes Deposit/Withdraw and automatic Settlement, so `claim` is absent.

The hook may keep unsent form/input/loading state locally. `operations` comes from `PredictTransactionService.operationsByAccount` and contains only safe references/status. Once a write commits, durable state belongs to the backend operation. Unmounting the view does not imply cancellation or completion. Retry/resume calls reuse the original operation/idempotency identity.

### useLiveData

`useLiveData` exists only for a Venue/product surface with a live capability. Kalshi v1 may omit it and rely on bounded read-service polling.

Purpose:

- Subscribe to supported live channels for prices, scores, account updates, and status

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
import type {
  SubscriptionChannel,
  SubscriptionHandle,
  SubscriptionParams,
} from '../types';

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
    let disposed = false;
    let handle: SubscriptionHandle | undefined;

    void messenger
      .call('PredictLiveDataService:subscribe', {
        channel,
        params,
        observer: {
          onData: (nextData: TData) => setData(nextData),
          onStatus: setStatus,
        },
      })
      .then((nextHandle) => {
        if (disposed) {
          nextHandle.unsubscribe();
        } else {
          handle = nextHandle;
        }
      });

    return () => {
      disposed = true;
      handle?.unsubscribe();
    };
  }, [channel, messenger, params]);

  return { data, status };
}
```

Read-services internally subscribe to the same `LiveDataService` updates to patch their TanStack Query caches, so most components observe live data through their existing `useQuery` hooks (write-through cache pattern). `useLiveData` exists for the small number of cases where a component needs the raw stream — for example, a price-tick animation that should not invalidate a cache entry.

### usePredictNavigation

Purpose:

- Centralize typed Venue-qualified route helpers

Maps to:

- Predict navigation stack definitions

Return contract:

```typescript
function usePredictNavigation(): {
  navigateToEvent: (
    venueId: PredictVenueId,
    eventId: string,
    accountScope?: PredictAccountScope,
  ) => void;
  navigateToOrder: (params: {
    accountScope: PredictAccountScope;
    eventId: string;
    marketId: string;
    outcomeId: string;
  }) => void;
  navigateBack: () => void;
};
```

Tabs, scroll position, and other screen presentation state remain static constants or view-local state; the navigation hook does not own them.

### usePredictGuard

Purpose:

- Gate **actions** based on eligibility, network, feature availability, and account restrictions. Per the venue-selection policy (parent ADR), an ineligible venue is read-only: public browsing is never gated by eligibility — only venue/backend availability can remove the browse surface. Server-side enforcement is the actual control; the guard is UX.

Maps to:

- `PredictSessionService` for **Account Readiness** and feature eligibility
- app-level wallet/network modules for network switching

Return contract:

```typescript
function usePredictGuard(params: {
  venueId: PredictVenueId;
  accountScope?: PredictAccountScope;
}): {
  /** Venue/backend reachable and not kill-switched. false removes the surface. */
  venueAvailable: boolean;
  /** Jurisdiction/eligibility for actions. Browsing is never gated on this. */
  isEligible: boolean;
  /** User may begin/resume Account Setup (eligible + venue available). */
  canSetup: boolean;
  /** Account Readiness allows trading/funding actions. */
  canTrade: boolean;
  /** Prompt network switch. Call only when the blocker is network state. */
  ensureNetwork: () => Promise<boolean>;
  blockReason: string | null;
};
```

The booleans are deliberately separate: venue availability, jurisdiction eligibility, setup readiness, and network state are different conditions with different UI treatments. Do not collapse them into one flag, and do not trigger `ensureNetwork()` when the blocker is KYC, jurisdiction, or an outage.

Implementation sketch:

```typescript
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ensurePredictSupportedNetwork } from '../network/ensurePredictSupportedNetwork';
import { selectPredictEligibility, selectPredictReadiness } from '../selectors';

export function usePredictGuard({
  venueId,
  accountScope,
}: {
  venueId: PredictVenueId;
  accountScope?: PredictAccountScope;
}) {
  // Guard data composes from PredictSessionService (eligibility, Account Readiness)
  // and wallet-side network state. There is no standalone GuardService in the
  // initial seven-service model; if cross-cutting guard logic grows, the design
  // can be revisited later in this document.
  const eligibility = useSelector((state) =>
    selectPredictEligibility(state, venueId),
  );
  const readiness = useSelector((state) =>
    accountScope ? selectPredictReadiness(state, accountScope) : undefined,
  );

  const networkBlocked = readiness?.blockers?.some(
    (blocker) => blocker.code === 'unsupported_network',
  );

  const ensureNetwork = useCallback(async () => {
    if (!networkBlocked) {
      return true; // only network blockers are resolved by switching networks
    }
    return await ensurePredictSupportedNetwork();
  }, [networkBlocked]);

  const venueAvailable = eligibility.venueAvailable !== false;
  const isEligible = eligibility.eligible;

  return {
    venueAvailable,
    isEligible,
    canSetup: venueAvailable && isEligible,
    canTrade: Boolean(readiness?.canTrade),
    ensureNetwork,
    blockReason:
      eligibility.blockReason ?? readiness?.blockers?.[0]?.code ?? null,
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

This pattern keeps service-backed hooks stable while allowing view-local presentation derivation to stay explicit.

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
        │                    ├── MarketDataService → registry.marketData(venueId)
        │                    └── PortfolioService → PredictSessionService.getClient(scope)
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
  Widget → useEventList(venueId) → descriptor → MarketDataService → adapter.marketData
  Widget → useBalance(scope) → descriptor → PortfolioService → PredictSessionService → client.portfolio

Write path:
  View → useTrading(scope) → TradingService → PredictSessionService → client.trading
  View → useTransactions(scope) → TransactionService/FundingExecutor → client.funding
  View → selectors ← focused BaseController workflow projections
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
  route: {
    params: {
      venueId: PredictVenueId;
      eventId: string;
      accountScope: PredictAccountScope;
    };
  };
}) {
  const { venueId, eventId, accountScope } = route.params;
  const { data: event } = useEventDetail(venueId, eventId);
  const { data: positions } = usePositions(accountScope);
  // This view is registered only for a live-capable surface.
  const { data: livePrices } = useLiveData('marketPrices', {
    venueId,
    eventId,
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
