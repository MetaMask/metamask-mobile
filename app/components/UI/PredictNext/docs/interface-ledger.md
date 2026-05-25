# PredictNext Interface Ledger

This ledger owns stable interface facts for PredictNext. If another architecture or migration document disagrees with this file, this file wins.

Keep this file terse and code-like. Explanatory documents should link here instead of redefining query keys, runtime namespaces, Service Events, hook names, error shape, selectors, or public exports.

Related documents:

- [../CONTEXT.md](../CONTEXT.md) owns product vocabulary.
- [architecture.md](./architecture.md) owns the architecture narrative.
- [services.md](./services.md) owns service responsibilities and workflows.
- [adapters.md](./adapters.md) owns the Venue adapter contract.

## 1. Runtime namespace rule

Literal runtime names use a feature-prefixed namespace. Prose may say `TradingService` or `MarketDataService` for readability, but code snippets, query keys, messenger actions, Service Events, Redux slices, and test mocks use the canonical runtime namespace.

| Module                | Runtime namespace                                         |
| --------------------- | --------------------------------------------------------- |
| PredictController     | `PredictController`                                       |
| PredictSessionService | `PredictSessionService`                                   |
| MarketDataService     | `PredictMarketDataService`                                |
| PortfolioService      | `PredictPortfolioService`                                 |
| TradingService        | `PredictTradingService`                                   |
| TransactionService    | `PredictTransactionService`                               |
| LiveDataService       | `PredictLiveDataService`                                  |
| predictAnalytics      | (injected helper — no namespace, no Engine.context entry) |

## 2. Query key rule

A query key includes `ownerAddress` only when the returned read model is account-specific.

If a Venue requires an authenticated **Predict Client** for a read-only request, that stays inside the read module implementation. The query key describes the visible read model, not session mechanics.

If a previously public Venue-data read becomes personalized, add a new query key rather than silently adding `ownerAddress` to the old one.

### Market data query keys

These read **Event**, **Market**, **Outcome**, price, and **Reference Price** data. They do not include `ownerAddress`.

```ts
interface PredictMarketDataQueryKeys {
  getEvents(
    params: FetchEventsParams,
  ): ['PredictMarketDataService:getEvents', FetchEventsParams];

  getEvent(eventId: string): ['PredictMarketDataService:getEvent', string];

  getCarouselEvents(): ['PredictMarketDataService:getCarouselEvents'];

  searchEvents(
    params: SearchEventsParams,
  ): ['PredictMarketDataService:searchEvents', SearchEventsParams];

  getPriceHistory(
    marketId: string,
    period: TimePeriod,
  ): ['PredictMarketDataService:getPriceHistory', string, TimePeriod];

  getCryptoPriceHistory(
    params: CryptoPriceHistoryParams,
  ): [
    'PredictMarketDataService:getCryptoPriceHistory',
    CryptoPriceHistoryParams,
  ];

  getCryptoReferencePrice(
    params: CryptoReferencePriceParams,
  ): [
    'PredictMarketDataService:getCryptoReferencePrice',
    CryptoReferencePriceParams,
  ];

  getPrices(
    queries: PriceQuery[],
  ): ['PredictMarketDataService:getPrices', PriceQuery[]];
}
```

Price reads are **Outcome**-scoped:

```ts
interface PriceQuery {
  eventId: string;
  marketId: string;
  outcomeId: string;
}
```

### Portfolio query keys

These reads are account-specific and include `ownerAddress`.

```ts
interface PredictPortfolioQueryKeys {
  getPositions(
    ownerAddress: string,
  ): ['PredictPortfolioService:getPositions', string];

  getActivity(
    ownerAddress: string,
    cursor?: string,
  ): ['PredictPortfolioService:getActivity', string, string?];

  getBalance(
    ownerAddress: string,
  ): ['PredictPortfolioService:getBalance', string];

  getVenueInfo(): ['PredictPortfolioService:getVenueInfo'];

  getUnrealizedPnL(
    ownerAddress: string,
  ): ['PredictPortfolioService:getUnrealizedPnL', string];
}
```

## 3. Messenger actions

Actions use the runtime namespace from section 1.

```ts
type PredictSessionServiceActions =
  | 'PredictSessionService:getClient'
  | 'PredictSessionService:invalidate'
  | 'PredictSessionService:fetchAccountReadiness';

type PredictMarketDataServiceActions =
  | 'PredictMarketDataService:getEvents'
  | 'PredictMarketDataService:getEvent'
  | 'PredictMarketDataService:getCarouselEvents'
  | 'PredictMarketDataService:searchEvents'
  | 'PredictMarketDataService:getPriceHistory'
  | 'PredictMarketDataService:getCryptoPriceHistory'
  | 'PredictMarketDataService:getCryptoReferencePrice'
  | 'PredictMarketDataService:getPrices';

type PredictPortfolioServiceActions =
  | 'PredictPortfolioService:getPositions'
  | 'PredictPortfolioService:getActivity'
  | 'PredictPortfolioService:getBalance'
  | 'PredictPortfolioService:getVenueInfo'
  | 'PredictPortfolioService:getUnrealizedPnL';

type PredictTradingServiceActions =
  | 'PredictTradingService:previewOrder'
  | 'PredictTradingService:placeOrder'
  | 'PredictTradingService:cancelOrder'
  | 'PredictTradingService:selectPaymentToken'
  | 'PredictTradingService:reset';

type PredictTransactionServiceActions =
  | 'PredictTransactionService:deposit'
  | 'PredictTransactionService:withdraw'
  | 'PredictTransactionService:claim';

type PredictLiveDataServiceActions =
  | 'PredictLiveDataService:subscribe'
  | 'PredictLiveDataService:disconnect';

// predictAnalytics has no messenger actions. It is an injected helper module,
// not a service. Callers hold a direct PredictAnalytics reference and call
// `track(event, properties)` on it.
```

`PredictSessionService` does not expose `ensureSupportedNetwork`. Network switching belongs to app-level wallet/network modules; `usePredictGuard` may compose those modules with **Account Readiness**, but the Predict session module should not grow a network-action interface.

## 4. Service Events (observation only)

> **Important**: Service Events are for **observation** (analytics, optional listeners, diagnostics). They are **not** the system of record for cache mutation. Cache coordination between services happens through direct method calls on the cache-owning service — see `services.md` § "Optimistic portfolio updates (direct cache coordination)".

The ledger owns cross-service product Service Event names and minimum payloads. Publishing ownership is fixed here; cache mutation ownership remains inside the read module that owns the cache and is invoked via **direct method call**, not subscription.

`BaseDataService` cache synchronization events, such as `PredictMarketDataService:cacheUpdated:<hash>`, follow the `BaseDataService` infrastructure convention and are not product Service Events.

### Minimum payloads

Every Service Event includes:

```ts
interface PredictServiceEventBase {
  venueId: PredictVenueId;
  occurredAt: number;
  /** Monotonic per-service sequence number. Subscribers must be idempotent. */
  seq: number;
  ownerAddress?: string; // required only for account-specific events
}
```

### Ordering and idempotency rules

- Each emitting service maintains a monotonic `seq` counter; the counter resets on `PredictController.initialize()` and is not persisted.
- Subscribers may receive the same event twice (e.g. during reconnection storms). All subscribers **must be idempotent**.
- During `PredictController.destroy()`, the composition root drops any Service Events emitted between the start of teardown and completion of `destroy()`. Subscribers that need to flush state must do so before `destroy()` returns.
- Out-of-order delivery is possible across services but not within the same emitting service. Subscribers that combine events from multiple services should resolve ordering by `occurredAt`, not by arrival order.

### Order lifecycle events

Published by `PredictTradingService`.

```ts
type PredictOrderServiceEventName =
  | 'PredictTradingService:orderPreviewed'
  | 'PredictTradingService:orderSubmitted'
  | 'PredictTradingService:orderSucceeded'
  | 'PredictTradingService:orderFailed';

interface PredictOrderServiceEventPayload extends PredictServiceEventBase {
  ownerAddress: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  quantity: DecimalString;
  price: DecimalString;
  optimisticId?: string;
}
```

### Transaction events

Published by `PredictTransactionService`.

```ts
type PredictTransactionServiceEventName =
  | 'PredictTransactionService:depositSucceeded'
  | 'PredictTransactionService:withdrawSucceeded'
  | 'PredictTransactionService:claimSucceeded'
  | 'PredictTransactionService:transactionFailed';

interface PredictTransactionServiceEventPayload
  extends PredictServiceEventBase {
  ownerAddress: string;
  txHash?: string;
  errorCode?: PredictErrorCode;
}
```

### Live Update events

Published by `PredictLiveDataService`.

```ts
type PredictLiveDataServiceEventName =
  | 'PredictLiveDataService:marketPricesUpdated'
  | 'PredictLiveDataService:gameUpdated'
  | 'PredictLiveDataService:portfolioUpdated'
  | 'PredictLiveDataService:connectionStatusChanged';
```

Live Update payloads include the stable identifiers required by the read module that patches or invalidates its cache.

```ts
interface PredictMarketPricesUpdatedPayload extends PredictServiceEventBase {
  updates: MarketPriceUpdate[];
}

interface PredictGameUpdatedPayload extends PredictServiceEventBase {
  eventId: string;
  game: PredictGame;
}

interface PredictPortfolioUpdatedPayload extends PredictServiceEventBase {
  ownerAddress: string;
  marketId?: string;
  outcomeId?: string;
}

interface PredictConnectionStatusChangedPayload
  extends PredictServiceEventBase {
  status: LiveDataConnectionStatus;
}
```

### Account Readiness events

Published by `PredictSessionService`.

```ts
type PredictSessionServiceEventName =
  'PredictSessionService:accountReadinessChanged';

interface PredictAccountReadinessChangedPayload
  extends PredictServiceEventBase {
  ownerAddress: string;
  readiness: PredictAccountReadiness;
}
```

### Service Event ownership rule

- `PredictTradingService` publishes **Order** lifecycle Service Events.
- `PredictTransactionService` publishes **Deposit**, **Withdraw**, and **Claim** Service Events.
- `PredictLiveDataService` publishes **Live Update** Service Events.
- `PredictSessionService` publishes **Account Readiness** Service Events.
- `PredictPortfolioService` and `PredictMarketDataService` decide how to patch or invalidate their own caches.
- No module mutates another module's cache directly.

## 5. Hook names

The hook interface is fixed here. Do not create duplicate names for the same intent.

### Event reads

```ts
useFeaturedEvents;
useEventList;
useEventSearch;
useEventDetail;
usePriceHistory;
useCryptoPriceHistory;
useCryptoReferencePrice;
usePrices;
```

Rules:

- Use `useEventDetail`, not `useEvent`.
- Use `useEventList`, not `useEventFeed`; feed state belongs to the `EventFeed` module.
- `usePrices` accepts `PriceQuery[]`, not `marketIds: string[]`.

### Portfolio reads

```ts
usePositions;
useBalance;
useActivity;
usePnL;
```

### Imperative and lifecycle hooks

```ts
useTrading;
useTransactions;
useLiveData;
usePredictNavigation;
usePredictGuard;
```

Rules:

- Use `usePredictGuard`, not `useEligibilityGuard`.
- Preview belongs behind `useTrading`; do not add a separate `useOrderPreview` hook.

## 6. Redux slices and public selectors

State-owning modules expose Redux state under their runtime namespace.

```ts
state.engine.backgroundState.PredictSessionService;
state.engine.backgroundState.PredictTradingService;
```

Public selectors exported from the PredictNext entrypoint:

```ts
selectPredictEligibility;
selectPredictReadiness;
selectPredictActiveOrder;
selectPredictSelectedPaymentToken;
```

Internal selectors may exist behind hooks, but adding an exported selector requires updating this ledger.

## 7. PredictError interface

`PredictError` uses an object parameter for raw construction. Services SHOULD prefer the `PredictError.from(code, overrides?)` factory, which reads `category`, `recoverable`, and the default `message` from the **canonical error registry** below. This eliminates per-call-site authoring of `category` and `recoverable`, which is where drift starts.

```ts
interface PredictErrorInput {
  code: PredictErrorCode;
  message: string;
  recoverable: boolean;
  category: PredictErrorCategory;
  metadata?: Record<string, unknown>;
  cause?: unknown;
}

class PredictError extends Error {
  constructor(input: PredictErrorInput);

  /**
   * Construct from a known code. Pulls category, recoverable, and the default
   * message from PREDICT_ERROR_REGISTRY. Overrides are only for message,
   * metadata, and cause. Accepts an unknown value to wrap as UNKNOWN.
   */
  static from(
    codeOrError: PredictErrorCode | unknown,
    overrides?: Partial<Omit<PredictErrorInput, 'code'>>,
  ): PredictError;
}
```

### Canonical error registry

Every `PredictErrorCode` maps to exactly one `{ category, recoverable, defaultMessage }` entry. The registry lives at `errors/registry.ts` and is the single source of truth — services never hand-author these fields. See `docs/error-handling.md` for the full registry contents.

```ts
interface PredictErrorRegistryEntry {
  category: PredictErrorCategory;
  recoverable: boolean;
  defaultMessage: string;
}

declare const PREDICT_ERROR_REGISTRY: Record<
  PredictErrorCode,
  PredictErrorRegistryEntry
>;
```

Hooks and Product UI modules branch on `category` first and `code` second.

```ts
type PredictErrorCategory =
  | 'empty_state'
  | 'unavailable'
  | 'action_failed'
  | 'degraded';
```

Canonical codes:

```ts
enum PredictErrorCode {
  GEO_BLOCKED = 'GEO_BLOCKED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  VENUE_UNAVAILABLE = 'VENUE_UNAVAILABLE',
  UNSUPPORTED_VENUE_CAPABILITY = 'UNSUPPORTED_VENUE_CAPABILITY',
  SERVICE_DEGRADED = 'SERVICE_DEGRADED',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ORDER_PREVIEW_EXPIRED = 'ORDER_PREVIEW_EXPIRED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  ORDER_PLACEMENT_FAILED = 'ORDER_PLACEMENT_FAILED',
  DEPOSIT_FAILED = 'DEPOSIT_FAILED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  CLAIM_FAILED = 'CLAIM_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  LIVE_DATA_DISCONNECTED = 'LIVE_DATA_DISCONNECTED',
  UNKNOWN = 'UNKNOWN',
}
```

Example (preferred factory pattern):

```ts
// Service: simply names the code. category, recoverable, and default
// message come from the registry. Override only what's specific to this call site.
throw PredictError.from(PredictErrorCode.ORDER_REJECTED, {
  metadata: { venueId, orderId },
  cause,
});
```

Raw constructor usage is reserved for tests or framework-level code that needs full control:

```ts
new PredictError({
  code: PredictErrorCode.ORDER_REJECTED,
  message: 'The Venue rejected this Order.',
  recoverable: true,
  category: 'action_failed',
  metadata: { venueId, orderId },
  cause,
});
```

## 8. Public entrypoint exports

`PredictNext/index.ts` exports only stable Product UI modules, hooks, selectors, types, and errors. Top-level folders are organizational modules, not automatic public interfaces.

### Public exports

```ts
// Views
PredictHome;
EventDetails;
OrderScreen;
TransactionsView;

// Selected primitives
EventCard;
PositionCard;
OutcomeButton;
PriceDisplay;

// Hooks
useFeaturedEvents;
useEventList;
useEventSearch;
useEventDetail;
usePriceHistory;
useCryptoPriceHistory;
useCryptoReferencePrice;
usePrices;
usePositions;
useBalance;
useActivity;
usePnL;
useTrading;
useTransactions;
useLiveData;
usePredictNavigation;
usePredictGuard;

// Selectors
selectPredictEligibility;
selectPredictReadiness;
selectPredictActiveOrder;
selectPredictSelectedPaymentToken;

// Types and errors
PredictEvent;
PredictMarket;
PredictOutcome;
PredictPosition;
OrderPreview;
OrderReceipt;
PredictBalance;
PredictAccountReadiness;
PredictError;
PredictErrorCode;
PredictErrorCategory;
```

### Internal modules

Do not export these from `PredictNext/index.ts`:

```ts
services/*
adapters/*
compat/*
widgets/*
routes/*
constants/*
utils/*
venue DTOs
adapter registries
```

If a migration phase needs an internal module temporarily, it imports through the migration seam explicitly and marks the import as temporary. Temporary migration access does not promote the module to the public entrypoint.
