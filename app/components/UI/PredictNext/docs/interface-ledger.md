# PredictNext Interface Ledger

This ledger owns stable interface facts for PredictNext. If another architecture or migration document disagrees with this file on **code-level interface shapes**, this file wins. Contested topology, security, identity, KYC, funding, and recovery decisions are governed by the Kalshi ADR set (see [README — Governing ADRs](../README.md#governing-adrs)); this ledger must stay consistent with them.

Keep this file code-like. Explanatory documents should link here rather than redefining runtime names, identity/scope types, query descriptors, actions, events, errors, or public exports.

Related documents:

- [../CONTEXT.md](../CONTEXT.md) owns product vocabulary.
- [architecture.md](./architecture.md) owns the architecture narrative.
- [adapters.md](./adapters.md) owns capability interfaces and adapter responsibilities.
- [services.md](./services.md) owns workflows.
- [migration/kalshi-first.md](./migration/kalshi-first.md) owns active delivery sequencing.

## 1. Runtime Namespace Rule

| Module                | Runtime namespace             |
| --------------------- | ----------------------------- |
| PredictController     | `PredictController`           |
| PredictSessionService | `PredictSessionService`       |
| MarketDataService     | `PredictMarketDataService`    |
| PortfolioService      | `PredictPortfolioService`     |
| TradingService        | `PredictTradingService`       |
| TransactionService    | `PredictTransactionService`   |
| LiveDataService       | `PredictLiveDataService`      |
| predictAnalytics      | no namespace; injected helper |

Code snippets, query keys, messenger actions, Service Events, Redux slices, and test mocks use these names.

## 1.5. VenueAdapter and PredictClient — Canonical Framing

The canonical framing is:

> `VenueAdapter` registers one Venue and exposes focused public/account capability modules. `PredictClient` is the session-bound view of that adapter's account-scoped capabilities, produced by `PredictSessionService`; public market data remains Venue-scoped and does not require a Predict Client.

Rules:

- `VenueAdapter` groups `marketData`, `account`, `portfolio`, `trading`, optional `funding`, and optional `liveData` capabilities.
- Capability interfaces are hand-written because Kalshi and Polymarket now prove that these concerns vary independently.
- Structural presence is executable truth; `PredictVenueInfo.capabilities` is product metadata and must agree in contract tests.
- `PredictSessionService` may bind a session with closures or an internal helper. A runtime JavaScript `Proxy` is not required.
- Product modules never receive `PredictVenueSession` or import concrete adapters.
- Market data does not receive a fake session argument.
- Account Setup calls go through `VenueAccountSetupAdapter`; `PredictSessionService` does not call Venue/backend routes directly.
- Kalshi account-scoped operations use a remote adapter. Generic multi-Venue signing intents are deferred until a second remote Venue requires them.

The capability interfaces are canonical in [adapters.md](./adapters.md).

## 2. Identity and Account Scope

A Predict User is not a wallet address.

```typescript
export type PredictUserId = string;
/** CAIP-10 account ID; preserves chain namespace and address semantics. */
export type PredictWalletAccountId = string;

export interface PredictUserContext {
  /** Opaque, stable, non-PII ID derived from authenticated MetaMask identity. */
  userId: PredictUserId;
  /** Selected Funding Wallet or wallet-scoped Venue Account context. */
  walletAccountId?: PredictWalletAccountId;
}

export interface PredictAccountScope extends PredictUserContext {
  venueId: PredictVenueId;
}

export type PredictAccountScopeKey = string;
```

`getPredictAccountScopeKey(scope)` is the only way to construct a scope key. It deterministically includes `venueId`, `userId`, and the canonical CAIP-10 `walletAccountId` when present. It never applies EVM lowercasing rules to non-EVM addresses.

```typescript
interface PredictVenueStatus {
  venueId: PredictVenueId;
  status: 'available' | 'degraded' | 'unavailable';
  checkedAt: number;
  reason?: PredictErrorCode;
}

interface PredictEligibility {
  venueId: PredictVenueId;
  /** Venue/backend reachable and not kill-switched; false removes the browse surface. */
  venueAvailable: boolean;
  /** Jurisdiction/eligibility for actions; browsing is never gated on this. */
  eligible: boolean;
  blockReason?: string;
}

type PredictAccountReadinessBlockerCode =
  | 'account_setup_required'
  | 'account_setup_pending'
  | 'kyc_required'
  | 'kyc_pending'
  | 'kyc_rejected'
  | 'jurisdiction_restricted'
  | 'geo_blocked'
  | 'funding_wallet_required'
  | 'unsupported_network'
  | 'venue_unavailable'
  | 'unknown';

interface PredictAccountReadinessBlocker {
  code: PredictAccountReadinessBlockerCode;
  message?: string;
  action?: 'complete_setup' | 'retry' | 'select_wallet' | 'switch_network';
}

interface PredictAccountReadiness {
  venueId: PredictVenueId;
  accountScopeKey: PredictAccountScopeKey;
  canTrade: boolean;
  status:
    | 'ready'
    | 'setup_required'
    | 'setup_pending'
    | 'restricted'
    | 'unavailable';
  blockers?: PredictAccountReadinessBlocker[];
}
```

The session service attaches the local `accountScopeKey`; a remote response is not trusted to identify the caller.

```typescript
interface PredictPnL {
  cashPnl: DecimalString;
  percentPnl: DecimalString;
}
```

Rules:

- market-data queries include `venueId` and never include account scope unless the returned model is personalized,
- portfolio/readiness/workflow queries include `PredictAccountScope`,
- routes and domain entities include `venueId`,
- backend authorization derives the Predict User from the bearer token and ignores client identity fields as proof,
- email, KYC data, API keys, and raw authentication subjects never appear in query keys or Redux,
- Kalshi may ignore `walletAccountId` for Venue Account identity while still using it as Funding Wallet context,
- Polymarket may use `walletAccountId` to select a wallet-scoped Venue Account.

## 3. Query Descriptor Rule

Query keys are produced only by internal descriptor modules:

```typescript
marketDataQueries;
portfolioQueries;
```

```typescript
interface PredictQueryDescriptor<TKey extends readonly unknown[]> {
  queryKey: TKey;
  family: readonly unknown[];
  staleTime: number;
  scope: 'venue' | 'account';
}
```

### Market data descriptors

```typescript
interface PredictMarketDataQueryDescriptors {
  getEvents(
    venueId: PredictVenueId,
    params: FetchEventsParams,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvents', PredictVenueId, FetchEventsParams]
  >;

  getEvent(
    venueId: PredictVenueId,
    eventId: string,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getEvent', PredictVenueId, string]
  >;

  getCarouselEvents(
    venueId: PredictVenueId,
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getCarouselEvents', PredictVenueId]
  >;

  searchEvents(
    venueId: PredictVenueId,
    params: SearchEventsParams,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:searchEvents',
      PredictVenueId,
      SearchEventsParams,
    ]
  >;

  getPriceHistory(
    venueId: PredictVenueId,
    marketId: string,
    period: TimePeriod,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getPriceHistory',
      PredictVenueId,
      string,
      TimePeriod,
    ]
  >;

  getPrices(
    venueId: PredictVenueId,
    queries: PriceQuery[],
  ): PredictQueryDescriptor<
    ['PredictMarketDataService:getPrices', PredictVenueId, PriceQuery[]]
  >;

  getEventSeries?(
    venueId: PredictVenueId,
    params: FetchEventSeriesParams,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getEventSeries',
      PredictVenueId,
      FetchEventSeriesParams,
    ]
  >;

  getCryptoPriceHistory?(
    venueId: PredictVenueId,
    params: CryptoPriceHistoryParams,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getCryptoPriceHistory',
      PredictVenueId,
      CryptoPriceHistoryParams,
    ]
  >;

  getCryptoReferencePrice?(
    venueId: PredictVenueId,
    params: CryptoReferencePriceParams,
  ): PredictQueryDescriptor<
    [
      'PredictMarketDataService:getCryptoReferencePrice',
      PredictVenueId,
      CryptoReferencePriceParams,
    ]
  >;
}
```

Optional descriptors are added only with their product/adapter capability. They still have an exact Venue-qualified key contract.

`PriceQuery` is Outcome-scoped:

```typescript
interface PriceQuery {
  eventId: string;
  marketId: string;
  outcomeId: string;
}
```

### Portfolio descriptors

```typescript
interface PredictPortfolioQueryDescriptors {
  getPositions(
    scope: PredictAccountScope,
    params?: FetchPositionsParams,
  ): PredictQueryDescriptor<
    [
      'PredictPortfolioService:getPositions',
      PredictAccountScope,
      FetchPositionsParams?,
    ]
  >;

  getActivity(
    scope: PredictAccountScope,
    cursor?: string,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getActivity', PredictAccountScope, string?]
  >;

  getBalance(
    scope: PredictAccountScope,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getBalance', PredictAccountScope]
  >;

  getUnrealizedPnL(
    scope: PredictAccountScope,
  ): PredictQueryDescriptor<
    ['PredictPortfolioService:getUnrealizedPnL', PredictAccountScope]
  >;
}
```

Descriptor modules are internal and are not exported from `PredictNext/index.ts`.

## 4. Messenger Actions

### Session and Account Setup

```typescript
type PredictSessionServiceActions =
  | 'PredictSessionService:getClient'
  | 'PredictSessionService:invalidate'
  | 'PredictSessionService:fetchAccountReadiness'
  | 'PredictSessionService:startAccountSetup'
  | 'PredictSessionService:resumeAccountSetup'
  | 'PredictSessionService:submitAccountSetupStep';
```

Canonical handlers:

```typescript
getClient(scope: PredictAccountScope): Promise<PredictClient>;
invalidate(scope: PredictAccountScope): void;
fetchAccountReadiness(
  scope: PredictAccountScope,
  opts?: { forceRefresh?: boolean },
): Promise<PredictAccountReadiness>;
startAccountSetup(
  scope: PredictAccountScope,
  params: StartAccountSetupParams,
): Promise<AccountSetupState>;
resumeAccountSetup(scope: PredictAccountScope): Promise<AccountSetupState>;
submitAccountSetupStep(
  scope: PredictAccountScope,
  params: AccountSetupStepParams,
): Promise<AccountSetupState>;
```

### Market data

```typescript
type PredictMarketDataServiceActions =
  | 'PredictMarketDataService:getEvents'
  | 'PredictMarketDataService:getEvent'
  | 'PredictMarketDataService:getCarouselEvents'
  | 'PredictMarketDataService:searchEvents'
  | 'PredictMarketDataService:getPriceHistory'
  | 'PredictMarketDataService:getEventSeries'
  | 'PredictMarketDataService:getCryptoPriceHistory'
  | 'PredictMarketDataService:getCryptoReferencePrice'
  | 'PredictMarketDataService:getPrices';
```

Canonical handlers:

```typescript
getEvents(
  venueId: PredictVenueId,
  params: FetchEventsParams,
): Promise<PaginatedResult<PredictEvent>>;
getEvent(
  venueId: PredictVenueId,
  eventId: string,
): Promise<PredictEvent>;
getCarouselEvents(venueId: PredictVenueId): Promise<PredictEvent[]>;
searchEvents(
  venueId: PredictVenueId,
  params: SearchEventsParams,
): Promise<PaginatedResult<PredictEvent>>;
getPriceHistory(
  venueId: PredictVenueId,
  marketId: string,
  period: TimePeriod,
): Promise<PricePoint[]>;
getEventSeries(
  venueId: PredictVenueId,
  params: FetchEventSeriesParams,
): Promise<PredictEvent[]>;
getCryptoPriceHistory(
  venueId: PredictVenueId,
  params: CryptoPriceHistoryParams,
): Promise<CryptoPricePoint[]>;
getCryptoReferencePrice(
  venueId: PredictVenueId,
  params: CryptoReferencePriceParams,
): Promise<ReferencePrice | null>;
getPrices(
  venueId: PredictVenueId,
  queries: PriceQuery[],
): Promise<MarketPrices>;
```

Optional handlers are registered only with their product capability.

### Portfolio

```typescript
type PredictPortfolioServiceActions =
  | 'PredictPortfolioService:getPositions'
  | 'PredictPortfolioService:getActivity'
  | 'PredictPortfolioService:getBalance'
  | 'PredictPortfolioService:getUnrealizedPnL';
```

Canonical handlers:

```typescript
getPositions(
  scope: PredictAccountScope,
  params?: FetchPositionsParams,
): Promise<PaginatedResult<PredictPosition>>;
getActivity(
  scope: PredictAccountScope,
  cursor?: string,
): Promise<PaginatedResult<ActivityItem>>;
getBalance(scope: PredictAccountScope): Promise<PredictBalance>;
getUnrealizedPnL(scope: PredictAccountScope): Promise<PredictPnL>;
```

Optional handlers are registered only with their product capability.

### Trading

```typescript
type PredictTradingServiceActions =
  | 'PredictTradingService:previewOrder'
  | 'PredictTradingService:placeOrder'
  | 'PredictTradingService:cancelOrder'
  | 'PredictTradingService:selectPaymentToken'
  | 'PredictTradingService:reset';
```

`cancelOrder` is registered only when the enabled product supports Resting Orders. Kalshi v1 should omit it for an Immediate-Order-only launch.

Order preview and submission use:

```typescript
interface PredictFees {
  metamaskFee: DecimalString;
  venueFee: DecimalString;
  marketFee?: DecimalString;
  totalFee: DecimalString;
  totalFeePercentage: DecimalString;
}

interface PreviewOrderParams {
  scope: PredictAccountScope;
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  amount: DecimalString;
}

interface PlaceOrderParams {
  scope: PredictAccountScope;
  previewId: string;
  idempotencyKey: string;
}

type PredictOrderStatus =
  | 'submitted'
  | 'open'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'rejected';

previewOrder(params: PreviewOrderParams): Promise<OrderPreview>;
placeOrder(params: PlaceOrderParams): Promise<OrderReceipt>;
cancelOrder(params: {
  scope: PredictAccountScope;
  orderId: string;
  idempotencyKey: string;
}): Promise<OrderReceipt>;
selectPaymentToken(token: SelectedPaymentToken): void;
reset(): void;
```

`cancelOrder` is registered only with a Resting Order product capability.

`open` applies only to Resting Orders. An Immediate Order reaches a terminal Venue state according to its time-in-force; it is never shown as an indefinitely open Order merely because it had zero Fills.

The backend/adapter revalidates the preview; callers do not submit a mutable preview as authority.

### Funding

```typescript
type PredictTransactionServiceActions =
  | 'PredictTransactionService:deposit'
  | 'PredictTransactionService:withdraw'
  | 'PredictTransactionService:claim'
  | 'PredictTransactionService:resume';
```

Canonical handlers:

```typescript
deposit(
  params: DepositParams & { scope: PredictAccountScope },
): Promise<FundingReceipt>;
withdraw(
  params: WithdrawParams & { scope: PredictAccountScope },
): Promise<FundingReceipt>;
claim(
  params: ClaimParams & { scope: PredictAccountScope },
): Promise<FundingReceipt>;
resume(params: {
  scope: PredictAccountScope;
  operationId: string;
}): Promise<FundingReceipt>;
```

Actions are product intents. They prepare a plan, obtain confirmation, and commit through the funding capability. `claim` is not exposed for an automatic-settlement Venue.

### Live data

```typescript
type PredictLiveDataServiceActions =
  | 'PredictLiveDataService:subscribe'
  | 'PredictLiveDataService:disconnect';
```

Canonical handlers:

```typescript
subscribe<TData>(params: {
  channel: SubscriptionChannel;
  params: SubscriptionParams;
  observer: LiveSubscriptionObserver<TData>;
}): Promise<SubscriptionHandle>;
disconnect(): void;
```

`predictAnalytics` has no messenger namespace.

## 5. Funding Contract

```typescript
type FundingOperation = 'deposit' | 'withdraw' | 'claim';

type FundingPlanKind = 'wallet_transfer' | 'venue_operation';

interface ExpectedFundingIntent {
  scope: PredictAccountScope;
  operation: FundingOperation;
  amount?: DecimalString;
  destinationAccountId?: PredictWalletAccountId;
  network?: ChainNamespace;
  assetId?: string; // canonical CAIP-19 when on-chain
}
```

Every `FundingPlan` includes:

- `operationId`,
- `venueId`,
- `operation`,
- amount when known,
- optional expiry,
- either a typed wallet transaction or a typed Venue operation preview.

```typescript
type FundingReceiptStatus =
  | 'submitted'
  | 'processing'
  | 'reconciling'
  | 'prefunded'
  | 'confirmed'
  | 'failed';

interface FundingOperationProjection {
  operationId: string;
  operation: FundingOperation;
  status: FundingReceiptStatus;
  updatedAt: number;
}

interface FundingReceipt {
  operationId: string;
  venueId: PredictVenueId;
  operation: FundingOperation;
  status: FundingReceiptStatus;
  amount?: DecimalString;
  txHash?: string;
  venueReference?: string;
  updatedAt: number;
}
```

`confirmed` is used only with authoritative completion evidence. A lost response is `reconciling`; a Kalshi withdrawal remains `submitted`/`processing` while no final status exists.

Rules:

1. Preparation may reserve a one-time address but never moves funds.
2. User confirmation precedes commit.
3. Commit includes an idempotency key.
4. Wallet transfer commit includes the submitted transaction hash.
5. The backend operation survives mobile teardown.
6. Repeated commit returns/reconciles the same operation.
7. Unsupported operations are absent from Venue funding capability metadata; no `unsupported` plan is returned.
8. A receipt may remain `submitted` or `processing` when the Venue has no final status endpoint.

## 6. Account Setup State

```typescript
type AccountSetupStep =
  | { kind: 'email_otp'; destination?: string } // obfuscated only
  | { kind: 'phone_otp'; destination?: string } // obfuscated only
  | { kind: 'profile_form'; fields: AccountSetupField[] }
  | { kind: 'external_link'; url: string; returnUrl?: string }
  | { kind: 'status_wait'; message: string }
  | { kind: 'complete' };

interface AccountSetupState {
  venueId: PredictVenueId;
  status: 'not_started' | 'in_progress' | 'pending' | 'complete' | 'failed';
  step?: AccountSetupStep;
  operationId?: string;
  updatedAt: number;
}
```

Raw profile values, SSN, OTP, API keys, and credentials are never stored in this state. Venue-specific opaque status values may be retained only in redacted diagnostic metadata, not used as branching enums unless the Venue contract guarantees them.

## 7. Service Events — Observation Only

Service Events are for analytics, diagnostics, and optional listeners. Cache mutation uses direct read-model writer interfaces; durable financial state lives in the backend operation ledger.

```typescript
interface PredictServiceEventBase {
  venueId: PredictVenueId;
  occurredAt: number;
  seq: number;
  accountScope?: PredictAccountScope;
  operationId?: string;
}
```

Rules:

- sequence is monotonic per emitting service and resets on initialization,
- subscribers are idempotent,
- no Service Event contains email, OTP, KYC data, wallet signatures, API keys, or raw Venue credentials,
- an operation reference is safe to log only when backend policy classifies it as non-secret,
- Service Events do not authorize retries or commits.

### Order lifecycle events

Published by `PredictTradingService`:

```typescript
type PredictOrderServiceEventName =
  | 'PredictTradingService:orderPreviewed'
  | 'PredictTradingService:orderSubmitted'
  | 'PredictTradingService:orderSucceeded'
  | 'PredictTradingService:orderFailed';
```

### Funding events

Published by `PredictTransactionService`:

```typescript
type PredictTransactionServiceEventName =
  | 'PredictTransactionService:depositSucceeded'
  | 'PredictTransactionService:withdrawSubmitted'
  | 'PredictTransactionService:claimSucceeded'
  | 'PredictTransactionService:settlementRecorded'
  | 'PredictTransactionService:transactionFailed';
```

A Kalshi withdrawal emits `withdrawSubmitted`, not a success/completion event, until authoritative completion exists.

### Live update events

Published by `PredictLiveDataService`:

```typescript
type PredictLiveDataServiceEventName =
  | 'PredictLiveDataService:marketPricesUpdated'
  | 'PredictLiveDataService:gameUpdated'
  | 'PredictLiveDataService:portfolioUpdated'
  | 'PredictLiveDataService:connectionStatusChanged';
```

### Readiness events

Published by `PredictSessionService`:

```typescript
type PredictSessionServiceEventName =
  'PredictSessionService:accountReadinessChanged';
```

## 8. Hook Names

### Event reads

```typescript
useEventList;
useEventDetail;
usePriceHistory;
usePrices;
```

Event hooks require `venueId` directly or from a route-level Venue context. They never infer one global active Venue for mixed data.

### Portfolio reads

```typescript
usePositions;
useBalance;
useActivity;
usePnL;
```

Portfolio hooks require `PredictAccountScope`.

### Imperative and lifecycle hooks

```typescript
useTrading;
useTransactions;
usePredictNavigation;
usePredictGuard;
```

### Optional capability hooks

```typescript
useFeaturedEvents; // carousel/curation capability
useEventSearch; // search capability
useCryptoPriceHistory; // crypto reference-price capability
useCryptoReferencePrice; // crypto reference-price capability
useOrders; // Resting Order capability
useLiveData; // live-data capability
```

Rules:

- use `useEventDetail`, not `useEvent`,
- use `useEventList`, not `useEventFeed`,
- preview remains behind `useTrading`,
- hooks do not recreate idempotency or workflow policy,
- Kalshi v1 may omit `useLiveData` and use bounded query polling.

## 9. Redux Slices and Selectors

Stateful modules expose:

```typescript
state.engine.backgroundState.PredictSessionService;
state.engine.backgroundState.PredictTradingService;
state.engine.backgroundState.PredictTransactionService;
```

Session state uses scope keys:

```typescript
interface PredictSessionServiceState {
  readinessByAccount: Record<PredictAccountScopeKey, PredictAccountReadiness>;
  setupByAccount: Record<PredictAccountScopeKey, AccountSetupState>;
  eligibilityByVenue: Partial<Record<PredictVenueId, PredictEligibility>>;
}

interface TransactionServiceState {
  operationsByAccount: Record<
    PredictAccountScopeKey,
    FundingOperationProjection[]
  >;
}
```

No raw Venue Session or sensitive setup input is stored in Redux.

Public selectors:

```typescript
selectPredictEligibility(
  state: RootState,
  venueId: PredictVenueId,
): PredictEligibility;
selectPredictReadiness(
  state: RootState,
  scope: PredictAccountScope,
): PredictAccountReadiness | undefined;
selectPredictAccountSetup(
  state: RootState,
  scope: PredictAccountScope,
): AccountSetupState | undefined;
selectPredictFundingOperations(
  state: RootState,
  scope: PredictAccountScope,
): FundingOperationProjection[];
selectPredictActiveOrder(state: RootState): TradingWorkflowState;
selectPredictSelectedPaymentToken(
  state: RootState,
): SelectedPaymentToken | null;
```

## 10. PredictError Interface

```typescript
type PredictErrorCategory =
  | 'empty_state'
  | 'unavailable'
  | 'action_failed'
  | 'degraded';

interface PredictErrorInput {
  code: PredictErrorCode;
  message: string;
  recoverable: boolean;
  category: PredictErrorCategory;
  metadata?: Record<string, unknown>;
  cause?: unknown;
}
```

Services prefer `PredictError.from(code, overrides?)`; category, recovery, and default message come from one registry.

Canonical codes:

```typescript
enum PredictErrorCode {
  GEO_BLOCKED = 'GEO_BLOCKED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  VENUE_UNAVAILABLE = 'VENUE_UNAVAILABLE',
  UNSUPPORTED_VENUE_CAPABILITY = 'UNSUPPORTED_VENUE_CAPABILITY',
  SERVICE_DEGRADED = 'SERVICE_DEGRADED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  ACCOUNT_SCOPE_INVALID = 'ACCOUNT_SCOPE_INVALID',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ORDER_PREVIEW_EXPIRED = 'ORDER_PREVIEW_EXPIRED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  ORDER_PLACEMENT_FAILED = 'ORDER_PLACEMENT_FAILED',
  ACCOUNT_SETUP_FAILED = 'ACCOUNT_SETUP_FAILED',
  KYC_REJECTED = 'KYC_REJECTED',
  ACCOUNT_RECOVERY_REQUIRED = 'ACCOUNT_RECOVERY_REQUIRED',
  STEP_UP_REQUIRED = 'STEP_UP_REQUIRED',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_INVALID_OR_EXPIRED = 'OTP_INVALID_OR_EXPIRED',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
  INVALID_WITHDRAWAL_ADDRESS = 'INVALID_WITHDRAWAL_ADDRESS',
  OPERATION_EXPIRED = 'OPERATION_EXPIRED',
  OPERATION_CONFLICT = 'OPERATION_CONFLICT',
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

A Venue that cannot distinguish invalid from expired OTP maps to `OTP_INVALID_OR_EXPIRED`; it does not guess.

No error metadata contains secrets or raw KYC values.

## 11. Public Entrypoint Exports

`PredictNext/index.ts` exports only stable Product UI modules, hooks, selectors, domain types, and errors.

### Public exports

```typescript
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
useEventList;
useEventDetail;
usePriceHistory;
usePrices;
usePositions;
useBalance;
useActivity;
usePnL;
useTrading;
useTransactions;
usePredictNavigation;
usePredictGuard;

// Selectors
selectPredictEligibility;
selectPredictReadiness;
selectPredictAccountSetup;
selectPredictFundingOperations;
selectPredictActiveOrder;
selectPredictSelectedPaymentToken;

// Types and errors
PredictUserId;
PredictWalletAccountId;
PredictUserContext;
PredictAccountScope;
PredictVenueId;
PredictEvent;
PredictMarket;
PredictOutcome;
PredictPosition;
PredictOrder;
OrderPreview;
OrderReceipt;
TradingWorkflowState;
SelectedPaymentToken;
PredictFees;
PredictBalance;
PredictPnL;
PredictEligibility;
PredictAccountReadinessBlockerCode;
PredictAccountReadinessBlocker;
PredictAccountReadiness;
AccountSetupState;
FundingPlan;
FundingReceipt;
FundingReceiptStatus;
FundingOperationProjection;
PredictVenueStatus;
EventDisplayModel;
PredictError;
PredictErrorCode;
PredictErrorCategory;
```

Optional capability hooks such as `useFeaturedEvents`, `useEventSearch`, `useCryptoPriceHistory`, `useCryptoReferencePrice`, `useOrders`, and `useLiveData` are promoted to the public entrypoint only when their product capability is implemented and supported. Listing a canonical hook name in §8 does not require exporting an unimplemented hook.

### Internal modules

Do not export these from the feature root:

```typescript
services/*
adapters/*
compat/*
query-descriptors/*
widgets/*
routes/*
constants/*
utils/*
Venue DTOs
adapter registries
Venue Sessions
backend auth payloads
```
