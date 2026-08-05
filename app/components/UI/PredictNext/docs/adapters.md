# PredictNext Venue Adapter Architecture

This document defines the Venue seam for PredictNext. The second Venue, Kalshi, is now concrete, so the adapter is organized by real capability groups rather than one non-optional interface containing every Polymarket operation.

Stable runtime names, query keys, actions, errors, and public exports remain canonical in [interface-ledger.md](./interface-ledger.md).

Related documents:

- [../CONTEXT.md](../CONTEXT.md)
- [architecture.md](./architecture.md)
- [services.md](./services.md)
- [remote-adapters.md](./remote-adapters.md)
- [migration/kalshi-first.md](./migration/kalshi-first.md)

## 1. Design Rules

### One top-level adapter, capability modules underneath

A `VenueAdapter` is the registered implementation for one Venue. It exposes focused capability modules:

- public market data,
- account/readiness/setup,
- portfolio,
- trading,
- funding,
- live data.

Not every Venue supports every optional capability. Structural presence is authoritative; product-facing capability metadata exists so the UI can render the correct affordances.

This replaces the previous ~30-method non-optional interface. Kalshi should not implement Polymarket-only series, crypto-reference, Claim, or live-stream methods merely to throw an unsupported error.

### Public data is not account-scoped

Event, Market, Outcome, price, and public Venue status reads do not require a selected wallet or Venue Session unless the Venue itself requires authenticated public reads. The adapter hides that exceptional transport detail; the visible query remains Venue-scoped, not wallet-scoped.

### Person identity is not a wallet address

Product modules use a `PredictUserContext`:

```typescript
export type PredictUserId = string; // opaque, stable, non-PII
export type PredictWalletAccountId = string; // canonical CAIP-10 account ID

export interface PredictUserContext {
  userId: PredictUserId;
  /** Selected Funding Wallet; required only for wallet-scoped operations. */
  walletAccountId?: PredictWalletAccountId;
}

export interface PredictAccountScope extends PredictUserContext {
  venueId: PredictVenueId;
}

/**
 * Internal only; stored in PredictSessionService private fields.
 * A safe, non-secret operational handle. Per trust-model invariants 1 and 4,
 * `data` must never contain Venue credentials or API keys, OTPs, PII/KYC
 * values, bearer tokens, or transfer-authorization material — for a remote
 * Venue it is at most opaque backend session references. Adapters define a
 * concrete typed shape; `unknown` is not a license to smuggle secrets.
 */
export interface PredictVenueSession {
  venueId: PredictVenueId;
  accountScopeKey: PredictAccountScopeKey;
  expiresAt?: number;
  data: unknown;
}
```

Rules:

- Kalshi maps the authenticated Predict User to one Kalshi member and MetaMask ISV Venue Account.
- A selected CAIP-10 wallet account is Funding Wallet context for Deposit/Withdraw and may select a wallet-scoped Polymarket Venue Account.
- The backend derives the authoritative Predict User from authentication. It never authorizes a request from a client-supplied `userId`, address, email, or `external_user_id`.
- Local query keys may use `PredictAccountScope`; backend authorization does not trust it.
- Raw profile IDs, emails, KYC values, API keys, and credentials never appear in canonical entities or Redux state.

### Venue-qualified identifiers

Every Event, Market, Outcome, Order, Position, Account Readiness record, query key, route, and durable Venue Operation is Venue-qualified. A raw Venue ID is meaningful only with `venueId`.

### Adapters translate; services orchestrate

Adapters:

- call Venue or MetaMask Predict backend endpoints,
- authenticate/sign at the protocol seam,
- map Venue DTOs to canonical entities,
- prepare protocol-specific funding or order artifacts,
- expose supported live channels.

Adapters do not:

- own React/UI state,
- own product workflow transitions,
- decide whether to auto-fund an Order,
- mutate another module's cache,
- emit product analytics,
- blindly retry writes,
- store mobile sessions or credentials in Redux,
- infer a Predict User from a wallet address.

## 2. Canonical Top-Level Interface

```typescript
export interface VenueAdapter {
  readonly venueId: PredictVenueId;

  getVenueInfo(): PredictVenueInfo;

  /** Public, Venue-scoped reads. No product account session is exposed. */
  readonly marketData: VenueMarketDataAdapter;

  /** Creates operational context for account-scoped capabilities. */
  createSession(context: PredictUserContext): Promise<PredictVenueSession>;

  readonly account: VenueAccountAdapter;
  readonly portfolio: VenuePortfolioAdapter;
  readonly trading: VenueTradingAdapter;

  /** Absent when the Venue has no user-initiated funding operation. */
  readonly funding?: VenueFundingAdapter;

  /** Absent when bounded polling is the implementation. */
  readonly liveData?: VenueLiveDataAdapter;
}
```

`PredictSessionService` resolves the adapter, creates or refreshes a Venue Session, and returns a session-bound `PredictClient` view of account-scoped capability modules. It may use closures or an internal helper; a runtime JavaScript `Proxy` is not an architectural requirement.

Conceptually:

```typescript
type BindSessionMethod<T> = T extends (
  ...args: [...infer Params, PredictVenueSession]
) => infer Result
  ? (...args: Params) => Result
  : T;

type SessionBoundMethods<T> = {
  [Key in keyof T]: BindSessionMethod<T[Key]>;
};

type PredictAccountClient = Omit<
  SessionBoundMethods<VenueAccountAdapter>,
  'setup'
> & {
  setup?: SessionBoundMethods<VenueAccountSetupAdapter>;
};

export interface PredictClient {
  readonly venueId: PredictVenueId;
  readonly venueInfo: PredictVenueInfo;
  readonly account: PredictAccountClient;
  readonly portfolio: SessionBoundMethods<VenuePortfolioAdapter>;
  readonly trading: SessionBoundMethods<VenueTradingAdapter>;
  readonly funding?: SessionBoundMethods<VenueFundingAdapter>;
  readonly liveData?: SessionBoundMethods<VenueLiveDataAdapter>;
}
```

Product modules do not receive `PredictVenueSession` and do not import concrete adapters.

## 3. Public Market Data Capability

```typescript
export interface FetchEventSeriesParams {
  seriesId: string;
  endDateMin: string;
  endDateMax: string;
  limit?: number;
}

export interface VenueMarketDataAdapter {
  fetchVenueStatus(): Promise<PredictVenueStatus>;
  fetchEvents(
    params: FetchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(eventId: string): Promise<PredictEvent>;
  fetchPrices(params: { queries: PriceQuery[] }): Promise<MarketPrices>;
  fetchPriceHistory(
    marketId: string,
    period: TimePeriod,
  ): Promise<PricePoint[]>;

  /** Venue/product-specific discovery extensions, present only when supported. */
  fetchCarouselEvents?(): Promise<PredictEvent[]>;
  searchEvents?(
    params: SearchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEventSeries?(params: FetchEventSeriesParams): Promise<PredictEvent[]>;
  fetchCryptoPriceHistory?(
    params: CryptoPriceHistoryParams,
  ): Promise<CryptoPricePoint[]>;
  fetchCryptoReferencePrice?(
    params: CryptoReferencePriceParams,
  ): Promise<ReferencePrice | null>;
}
```

The `VenueAdapterRegistry` resolves this capability by `venueId` for `MarketDataService`. Public reads do not route through `PredictSessionService.getClient()` merely to inject a session that the implementation ignores.

If a Venue requires backend authentication for a nominally public read, the remote adapter may attach the app bearer token internally. The query key still reflects the visible Venue read model unless the returned data is personalized.

## 4. Account and Account Setup Capability

```typescript
export type VenueAccountReadiness = Omit<
  PredictAccountReadiness,
  'accountScopeKey'
>;

export interface VenueAccountAdapter {
  fetchReadiness(session: PredictVenueSession): Promise<VenueAccountReadiness>;

  readonly setup?: VenueAccountSetupAdapter;
}

export interface VenueAccountSetupAdapter {
  start(
    params: StartAccountSetupParams,
    session: PredictVenueSession,
  ): Promise<AccountSetupState>;

  resume(session: PredictVenueSession): Promise<AccountSetupState>;

  submitStep(
    params: AccountSetupStepParams,
    session: PredictVenueSession,
  ): Promise<AccountSetupState>;
}
```

This is the seam missing from the previous design. `PredictSessionService` owns the product workflow state and blocker precedence, but it performs Venue work only through this adapter capability. It must not call Kalshi or backend route paths directly.

Account Setup invariants:

- state is resumable after app and backend restarts,
- opaque Venue statuses remain opaque,
- sensitive profile/KYC values are never persisted in mobile state or emitted to logs/analytics,
- a backend lost response cannot cause duplicate identity or key creation,
- setup completion is followed by a readiness refresh,
- lack of `account.setup` means the Venue has no product Account Setup flow; it is not represented by methods that only throw.

## 5. Portfolio Capability

```typescript
export interface VenuePortfolioAdapter {
  fetchBalance(session: PredictVenueSession): Promise<PredictBalance>;
  fetchPositions(
    params: FetchPositionsParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictPosition>>;
  fetchActivity(
    params: FetchActivityParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<ActivityItem>>;
  fetchOrders?(
    params: FetchOrdersParams,
    session: PredictVenueSession,
  ): Promise<PaginatedResult<PredictOrder>>;
  fetchUnrealizedPnL?(session: PredictVenueSession): Promise<PredictPnL>;
}
```

Activity mapping rules:

- use Venue Fills for buy/sell execution activity,
- use Venue Settlements for automatic payouts,
- do not infer a Fill or Settlement from an Order creation record,
- include `venueId` on every item,
- normalize financial values as decimal strings.

## 6. Trading Capability

```typescript
export interface VenuePreviewOrderParams {
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  /** Buy spend amount or sell share quantity. */
  amount: DecimalString;
}

export interface VenueSubmitOrderParams {
  previewId: string;
  idempotencyKey: string;
}

export interface VenueCancelOrderParams {
  orderId: string;
  idempotencyKey: string;
}

export interface VenueAmendOrderParams {
  orderId: string;
  previewId: string;
  idempotencyKey: string;
}

export interface VenueTradingAdapter {
  getOrderPreview(
    params: VenuePreviewOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderPreview>;

  submitOrder(
    params: VenueSubmitOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt>;

  /** Present only when the Venue/product supports Resting Orders. */
  cancelOrder?(
    params: VenueCancelOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt>;

  amendOrder?(
    params: VenueAmendOrderParams,
    session: PredictVenueSession,
  ): Promise<OrderReceipt>;
}
```

### Preview and submit invariants

`OrderPreview` includes:

```typescript
export interface OrderPreview {
  previewId: string;
  venueId: PredictVenueId;
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  orderKind: 'immediate' | 'resting';
  expiresAt: string;
  sharePrice: DecimalString;
  maxAmountSpent: DecimalString;
  minAmountReceived: DecimalString;
  fees: PredictFees;
}

export interface OrderReceipt {
  operationId: string;
  venueId: PredictVenueId;
  orderId: string;
  status: PredictOrderStatus;
  filledQuantity: DecimalString;
  remainingQuantity: DecimalString;
  spentAmount: DecimalString;
  receivedAmount: DecimalString;
  fees?: PredictFees;
  txHashes: string[];
  updatedAt: number;
}

export interface PredictOrder {
  id: string;
  venueId: PredictVenueId;
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  orderKind: 'immediate' | 'resting';
  status: PredictOrderStatus;
  quantity: DecimalString;
  filledQuantity: DecimalString;
  limitPrice?: DecimalString;
  createdAt: number;
  updatedAt: number;
}
```

`VenueSubmitOrderParams` carries `previewId` and a caller-generated `idempotencyKey`; it does not send a mutable preview back as authoritative input.

The adapter/backend must:

- revalidate Venue Account, price, quantity, fees, max spend, and preview expiry,
- return the same Venue Operation for the same idempotency key,
- use a stable Venue client order ID derived from that operation,
- distinguish Order acceptance from Fills,
- never blind-retry an unkeyed submit.

### Immediate versus Resting Orders

Kalshi v1 should use Immediate Orders only unless product explicitly requires Resting Orders. If `venueInfo.capabilities.orders.resting` is false:

- `cancelOrder` and `amendOrder` are absent,
- no open-order UI is rendered,
- a partially filled or unfilled immediate result is terminal according to its time-in-force.

If Resting Orders are enabled, open-order reads, cancel/amend, partial fills, app-restart reconciliation, and live/polled updates are part of the feature—not follow-up implementation details.

## 7. Funding Capability

Funding follows **prepare → user confirmation → commit → reconcile**.

```typescript
export type PrepareFundingParams =
  | {
      operation: 'deposit';
      amount: DecimalString;
      network?: ChainNamespace;
      idempotencyKey: string;
    }
  | {
      operation: 'withdraw';
      amount: DecimalString;
      destinationAccountId: PredictWalletAccountId;
      idempotencyKey: string;
    }
  | {
      operation: 'claim';
      positionIds: string[];
      idempotencyKey: string;
    };

export interface FundingOperationPreview {
  title: string;
  amount?: DecimalString;
  destinationAccountId?: PredictWalletAccountId;
  network?: ChainNamespace;
  fee?: DecimalString;
}

export interface VenueFundingAdapter {
  readonly supportedOperations: ReadonlySet<FundingOperation>;

  prepareFunding(
    params: PrepareFundingParams,
    session: PredictVenueSession,
  ): Promise<FundingPlan>;

  commitFunding(
    params: CommitFundingParams,
    session: PredictVenueSession,
  ): Promise<FundingReceipt>;

  fetchFundingStatus?(
    operationId: string,
    session: PredictVenueSession,
  ): Promise<FundingReceipt>;
}
```

Canonical plans:

```typescript
export interface ExpectedAssetTransfer {
  assetId: string; // canonical CAIP-19
  recipientAccountId: PredictWalletAccountId; // canonical CAIP-10
  amount: DecimalString;
}

export type ChainTransactionRequest =
  | {
      namespace: 'eip155';
      chainId: string; // canonical CAIP-2
      to: string;
      data: string;
      value?: string;
      expectedTransfer: ExpectedAssetTransfer;
    }
  | {
      namespace: 'solana';
      chainId: string; // canonical CAIP-2
      serializedTransaction: string;
      expectedTransfer: ExpectedAssetTransfer;
    };

export type FundingPlan =
  | {
      kind: 'wallet_transfer';
      operationId: string;
      venueId: PredictVenueId;
      operation: FundingOperation;
      amount: DecimalString;
      expiresAt?: string;
      settlementCurrency: PredictSettlementCurrency;
      request: ChainTransactionRequest;
    }
  | {
      kind: 'venue_operation';
      operationId: string;
      venueId: PredictVenueId;
      operation: FundingOperation;
      amount?: DecimalString;
      expiresAt?: string;
      preview: FundingOperationPreview;
    };

export type CommitFundingParams =
  | {
      operationId: string;
      idempotencyKey: string;
      execution: { kind: 'wallet_transaction_submitted'; txHash: string };
    }
  | {
      operationId: string;
      idempotencyKey: string;
      execution: { kind: 'user_confirmed' };
    };
```

Rules:

- `prepareFunding()` may reserve a one-time address or create a durable preflight operation, but it must not transfer or withdraw funds.
- Before confirmation, `FundingExecutor` decodes/validates the actual wallet payload against `ExpectedAssetTransfer` and the locally stated intent; metadata alone is not trusted.
- `FundingExecutor` obtains user confirmation and performs wallet signing/submission where required.
- A Venue API withdrawal is committed only after confirmation; it is never executed during plan creation.
- The durable backend operation survives mobile teardown.
- Retrying with the same idempotency key returns/reconciles the same operation.
- A wallet transfer followed by a failed Venue indication remains resumable.
- Unsupported operations are absent from `supportedOperations` and product capability metadata. There is no fake `unsupported` Funding Plan.
- Kalshi automatic Settlement means `claim` is absent.

## 8. Live Data Capability

```typescript
export interface VenueLiveDataAdapter {
  subscribe(
    request: SubscriptionRequest,
    session: PredictVenueSession,
  ): Unsubscribe;
}
```

Live data is optional. Bounded polling may implement the first Kalshi release. If live data exists, the adapter normalizes transport payloads; `LiveDataService` owns multiplexing, reconnection, and calls read-model writer interfaces.

## 9. Venue Metadata and Product Capabilities

```typescript
export interface PredictSettlementCurrency {
  symbol: string;
  decimals: number;
  /** Canonical CAIP-19 asset ID when settlement is on-chain. */
  assetId?: string;
}

export interface PredictVenueInfo {
  venueId: PredictVenueId;
  name: string;
  settlementCurrency: PredictSettlementCurrency;
  capabilities: VenueCapabilities;
}

export interface VenueCapabilities {
  marketData: {
    featured: boolean;
    search: boolean;
    eventSeries: boolean;
    cryptoReferencePrices: boolean;
  };
  accountSetup: boolean;
  funding: {
    deposit: boolean;
    withdraw: boolean;
    claim: boolean;
  };
  settlement: 'automatic' | 'manual_claim';
  orders: {
    immediate: boolean;
    resting: boolean;
    cancel: boolean;
    amend: boolean;
  };
  liveData: boolean;
  orderbook: boolean;
}
```

Capability metadata is for product rendering and guard policy. Structural adapter capabilities are the executable truth. Contract tests assert they agree.

Venue mechanics remain hidden:

- admin or per-user credentials,
- proxy wallets,
- ISV sub-account numbers,
- API signing schemes,
- local versus remote transport,
- transaction calldata and routing,
- KYC provider payloads.

## 10. Kalshi Remote Adapter

Kalshi account-scoped operations are remote-only.

Mobile:

- uses the existing authenticated MetaMask API client,
- renders canonical setup and confirmation steps,
- signs/sends wallet transfers,
- validates canonical responses,
- never stores Kalshi PEMs.

Backend:

- derives the authoritative Predict User from authentication,
- maps that user to one Kalshi member and MetaMask ISV Venue Account,
- stores admin and per-user credentials in managed encrypted storage,
- signs Kalshi requests,
- owns durable setup and financial operation state,
- maps Kalshi DTOs to the canonical contract,
- handles idempotency, rate limits, protocol versions, reconciliation, and kill switches.

The mobile adapter is intentionally thin. It is acceptable to name it `KalshiRemoteAdapter` while Kalshi is the only remote Venue. Generalize it to a configured `MetaMaskPredictApiAdapter` when a second remote Venue proves the shared transport behavior.

Do not build generic signing intents for Kalshi launch. Kalshi Orders are signed by the backend-held per-user Venue credential. The only on-device signature in the first release is the normal wallet transaction path for a Deposit.

See [remote-adapters.md](./remote-adapters.md).

## 11. Polymarket Adapter and Migration

Polymarket remains on the legacy stack during Kalshi launch.

After Kalshi stabilizes, migrate one capability group at a time:

1. `marketData`,
2. `portfolio`,
3. `trading`,
4. `funding`, including manual Claim,
5. `liveData`.

A temporary Polymarket bridge may wrap a proven legacy capability during migration, but it must not become the target implementation. Legacy-specific editable transaction templates and old naming belong in `compat/`, created when the first Polymarket delegation requires them—not in the canonical Kalshi foundation.

## 12. Adding a Venue

A new Venue integration is successful when:

- it registers one `VenueAdapter`,
- it implements only the capability modules it supports,
- canonical IDs and queries are Venue-qualified,
- account-scoped operations use `PredictUserContext` rather than assuming wallet identity,
- UI modules branch on product capabilities, not Venue names,
- Venue DTOs, credentials, and protocol errors stay below the seam,
- shared contract tests pass,
- no unrelated service interface changes are required.

Do not freeze speculative capabilities for a future Venue. Add a capability when a concrete product workflow needs it.
