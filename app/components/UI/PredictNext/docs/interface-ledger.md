# PredictNext Interface Ledger

This ledger owns stable interface facts for PredictNext. If another architecture or migration document disagrees with this file, this file wins.

Keep this file terse and code-like. Explanatory documents should link here instead of redefining query descriptors, runtime namespaces, Service Events, hook names, funding/account-setup action names, error shape, selectors, or public exports.

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

## 1.5. PredictClient and VenueAdapter — canonical framing

`PredictClient` is a **derived type alias** over `VenueAdapter`, with the trailing `session: PredictVenueSession` parameter stripped from every method. There is no class, no hand-maintained interface, and no separate runtime declaration of `PredictClient` — it is purely a TypeScript view of the canonical `VenueAdapter` contract.

At runtime, `PredictSessionService.getClient(ownerAddress, venueId?)` returns a **proxy of the active venue adapter** that pre-binds the active `PredictVenueSession` into each method call. Product services consume `PredictClient` and never see `PredictVenueSession`. The proxy lives inside `PredictSessionService`; venue adapters remain stateless.

The canonical framing in one sentence (use verbatim when explaining this concept elsewhere):

> `PredictClient` is the session-bound view of `VenueAdapter` — a derived type alias with `session` stripped at compile time, produced as a session-binding proxy at runtime by `PredictSessionService`.

Other docs ([architecture.md](./architecture.md), [adapters.md](./adapters.md), [services.md](./services.md), [../CONTEXT.md](../CONTEXT.md)) point at this section rather than re-explaining the concept. Adapter implementations must implement every `VenueAdapter` method (capabilities are advertised via `client.capabilities`, never via optional methods).

## 2. Query descriptor rule

Query keys are never hand-authored in hooks or read services. They are produced by internal query descriptor modules:

```ts
marketDataQueries;
portfolioQueries;
```

A query descriptor owns the whole read seam for one query:

```ts
interface PredictQueryDescriptor<TKey extends readonly unknown[]> {
  queryKey: TKey;
  family: readonly unknown[];
  staleTime: number;
  accountScoped: boolean;
}
```

Hooks pass `descriptor.queryKey` to `useQuery` / `useInfiniteQuery`. Read services pass the same `descriptor.queryKey` and `descriptor.staleTime` to `this.fetchQuery()`. Cache writers invalidate or patch by `descriptor.family`.

A descriptor's query key includes `ownerAddress` only when the returned read model is account-specific.

If a Venue requires an authenticated **Predict Client** for a read-only request, that stays inside the read module implementation. The query key describes the visible read model, not session mechanics.

If a previously public Venue-data read becomes personalized, add a new descriptor rather than silently adding `ownerAddress` to the old one.

### Market data descriptors

These read **Event**, **Market**, **Outcome**, price, and **Reference Price** data. They do not include `ownerAddress`.

```ts
interface PredictMarketDataQueryDescriptors {
  getEvents(
    params: FetchEventsParams,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvents', FetchEventsParams]
  >;

  getEvent(
    eventId: string,
  ): PredictQueryDescriptor<['PredictMarketDataService:getEvent', string]>;

  getCarouselEvents(): PredictQueryDescriptor<
    ['PredictMarketDataService:getCarouselEvents']
  >;

  searchEvents(
    params: SearchEventsParams,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:searchEvents', SearchEventsParams]
  >;

  getPriceHistory(
    marketId: string,
    period: TimePeriod,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getPriceHistory', string, TimePeriod]
  >;

  getCryptoPriceHistory(
    params: CryptoPriceHistoryParams,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getCryptoPriceHistory', CryptoPriceHistoryParams]
  >;

  getCryptoReferencePrice(
    params: CryptoReferencePriceParams,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getCryptoReferencePrice',
      CryptoReferencePriceParams,
    ]
  >;

  getPrices(
    queries: PriceQuery[],
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getPrices', PriceQuery[]]
  >;
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

### Portfolio descriptors

These reads are account-specific and include `ownerAddress`.

```ts
interface PredictPortfolioQueryDescriptors {
  getPositions(
    ownerAddress: string,
  ): PredictQueryDescriptor<['PredictPortfolioService:getPositions', string]>;

  getActivity(
    ownerAddress: string,
    cursor?: string,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getActivity', string, string?]
  >;

  getBalance(
    ownerAddress: string,
  ): PredictQueryDescriptor<['PredictPortfolioService:getBalance', string]>;

  getVenueInfo(): PredictQueryDescriptor<
    ['PredictPortfolioService:getVenueInfo']
  >;

  getUnrealizedPnL(
    ownerAddress: string,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getUnrealizedPnL', string]
  >;
}
```

Query descriptor modules are internal. They are not exported from `PredictNext/index.ts`.

## 3. Messenger actions

Actions use the runtime namespace from section 1.

```ts
type PredictSessionServiceActions =
  | 'PredictSessionService:getClient'
  | 'PredictSessionService:invalidate'
  | 'PredictSessionService:fetchAccountReadiness'
  | 'PredictSessionService:startAccountSetup'
  | 'PredictSessionService:resumeAccountSetup'
  | 'PredictSessionService:submitAccountSetupStep';

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

// Transaction actions execute venue-produced Funding Plans. The action names
// remain product intents; the plan may be an EVM wallet transaction, Solana
// wallet transfer with a venue follow-up, or a venue API operation.

type PredictLiveDataServiceActions =
  | 'PredictLiveDataService:subscribe'
  | 'PredictLiveDataService:disconnect';

// predictAnalytics has no messenger actions. It is an injected helper module,
// not a service. Callers hold a direct PredictAnalytics reference and call
// `track(event, properties)` on it.
```

`PredictSessionService` does not expose `ensureSupportedNetwork`. Network switching belongs to app-level wallet/network modules; `usePredictGuard` may compose those modules with **Account Readiness**, but the Predict session module should not grow a network-action interface.

## 3.5. Funding and Account Setup canonical actions

Funding actions are product-intent actions on `PredictTransactionService`; they do not imply a specific chain or transaction shape.

```ts
type FundingPlanKind = 'wallet_transfer' | 'venue_api' | 'unsupported';
type FundingOperation = 'deposit' | 'withdraw' | 'claim';

type PredictFundingAction =
  | 'PredictTransactionService:deposit'
  | 'PredictTransactionService:withdraw'
  | 'PredictTransactionService:claim';
```

The active `PredictClient` creates Funding Plans through the adapter contract (`createDepositPlan`, `createWithdrawPlan`, `createClaimPlan`). `PredictTransactionService` executes those plans and handles any required venue follow-up, such as a Kalshi deposit indication after a Solana USDC transfer.

Account Setup is owned by `PredictSessionService`. Readiness says whether a user can trade; setup actions move the user through a venue-specific onboarding/linking flow until readiness can become `ready`.

```ts
type PredictAccountSetupAction =
  | 'PredictSessionService:startAccountSetup'
  | 'PredictSessionService:resumeAccountSetup'
  | 'PredictSessionService:submitAccountSetupStep';
```

Account Setup state is service-owned workflow state, not portfolio data. It may include venue user IDs, link IDs, obfuscated destinations, and KYC status, but raw credentials and API keys stay in private session fields.

## 4. Service Events (observation only)

> **Important**: Service Events are for **observation** (analytics, optional listeners, diagnostics). They are **not** the system of record for cache mutation. Cache coordination between services happens through narrow read-model writer interfaces owned by the cache-owning read services — see `services.md` § "Optimistic portfolio updates (direct cache coordination)".

The ledger owns cross-service product Service Event names and minimum payloads. Publishing ownership is fixed here; cache mutation ownership remains inside the read module that owns the cache and is invoked via **direct method call** on that module's writer interface, not subscription.

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
  | 'PredictTransactionService:settlementRecorded'
  | 'PredictTransactionService:transactionFailed';

interface PredictTransactionServiceEventPayload
  extends PredictServiceEventBase {
  ownerAddress: string;
  txHash?: string;
  venueReference?: string;
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
- `PredictTransactionService` publishes **Deposit**, **Withdraw**, **Claim**, and **Settlement** Service Events.
- `PredictLiveDataService` publishes **Live Update** Service Events.
- `PredictSessionService` publishes **Account Readiness** Service Events.
- `PredictPortfolioService` and `PredictMarketDataService` decide how to patch or invalidate their own caches.
- `PredictTradingService` and `PredictLiveDataService` receive only narrow read-model writer interfaces, not full read-service instances.
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
  ACCOUNT_SETUP_FAILED = 'ACCOUNT_SETUP_FAILED',
  KYC_REJECTED = 'KYC_REJECTED',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
  INVALID_WITHDRAWAL_ADDRESS = 'INVALID_WITHDRAWAL_ADDRESS',
  DEPOSIT_FAILED = 'DEPOSIT_FAILED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  CLAIM_FAILED = 'CLAIM_FAILED',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
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
createEventDisplayModel;
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
FundingPlan;
FundingReceipt;
PredictVenueStatus;
EventDisplayModel;
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
query-descriptors/*
widgets/*
routes/*
constants/*
utils/*
venue DTOs
adapter registries
```

If a migration phase needs an internal module temporarily, it imports through the migration seam explicitly and marks the import as temporary. Temporary migration access does not promote the module to the public entrypoint.
