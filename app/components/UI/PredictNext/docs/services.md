# PredictNext Service Architecture

This document describes the service layer for the PredictNext redesign. The service layer is where PredictNext becomes deep: reads, writes, orchestration, retries, state machines, transaction composition, and realtime coordination all live here rather than in components, hooks, or controllers.

Related documents:

- [interface-ledger.md](./interface-ledger.md) — canonical runtime namespaces, query keys, actions, Service Events, and errors
- [architecture.md](./architecture.md)
- [adapters.md](./adapters.md)
- [state-management.md](./state-management.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)

## 1. Service Overview

PredictNext uses seven services plus a stateless `PredictController` composition root. Each state-owning service extends a MetaMask base class (`BaseController` or `BaseDataService`) and registers as a first-class `Engine.context` entry; stateless services register as plain `Engine.context` entries for injection convenience. This follows the Rewards split pattern in MetaMask Mobile, where `RewardsController` (state owner) and `RewardsDataService` (helper) coexist in `Engine.context`.

| Module                  | Base class               | Approximate public interface size                | What it owns / hides                                                                                                       |
| ----------------------- | ------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `PredictController`     | Plain (composition root) | 2 methods (`initialize`, `destroy`)              | service instantiation order, shared dependency wiring, feature lifecycle. **No Redux state.**                              |
| `PredictSessionService` | `BaseController`         | 3 actions + state slice (readiness, eligibility) | PredictClient retrieval, signer resolution, venue auth/session cache, **Account Readiness ownership**, invalidation        |
| `MarketDataService`     | `BaseDataService`        | 8 actions                                        | query key definitions, cache strategy, retries, stale-time policy, venue pagination normalization                          |
| `PortfolioService`      | `BaseDataService`        | 5 actions                                        | positions / activity / balance / PnL read aggregation, cache policy, pagination normalization, background refresh behavior |
| `TradingService`        | `BaseController`         | 5 actions + order state machine slice            | order state machine, rate limiting, order lifecycle Service Events, deposit-before-order chaining                          |
| `TransactionService`    | Plain (stateless)        | 3 actions                                        | transaction workflow orchestration, transaction-controller lifecycle hooks, pending-state tracking, batch submission       |
| `LiveDataService`       | Plain (stateless)        | 2 actions + internal connection status           | socket lifecycle, reconnection, multiplexing, channel fan-out, venue transport differences                                 |
| `AnalyticsService`      | Plain (stateless)        | 1 action                                         | event normalization, session context injection, batching, venue-independent analytics vocabulary                           |

The design intent is that each service exposes only the capabilities other modules must actually use. Internal helper methods, transport concerns, and workflow states remain private. State-owning services declare `StateMetadata` per field so persistence, debug-snapshot inclusion, and UI sync are tuned per concern — most workflow state is `persist: false`, and only durable identifiers persist.

`PredictController` itself is not on any hot path. It exists to organize bootstrap, not to mediate calls. Hooks address services directly via messenger actions and Redux selectors.

Services branch on `client.capabilities`, not on optional methods. `PredictClient` methods are complete and non-optional; if unsupported code is called anyway, they throw `PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY`.

All product services talk to venues through a `PredictClient` returned by `PredictSessionService.getClient(ownerAddress, venueId?)`. Services do not call venue adapters directly and do not pass session objects around. PredictNext may register multiple venue implementations, but the product is expected to run one active venue at a time unless a future requirement explicitly adds multi-active-venue aggregation.

## 2. PredictController (Composition Root)

`PredictController` is a stateless composition root. Its only job is to instantiate the service graph, wire shared dependencies, and own feature lifecycle. It does not own Redux state, does not expose write methods, and does not appear on the read or write hot paths.

This is a deliberate departure from the legacy `PredictController` (60+ methods, 2,600+ lines, owner of all Predict state). The depth of PredictNext lives in services. The composition root just bootstraps them.

### Controller responsibilities

- instantiate state-owning services (`PredictSessionService`, `TradingService`, `MarketDataService`, `PortfolioService`) with their scoped messengers and persisted state slices
- instantiate stateless services (`TransactionService`, `LiveDataService`, `AnalyticsService`) with their dependencies
- coordinate initialization order so that services depending on `PredictSessionService` are constructed after it
- own feature lifecycle entrypoints (`initialize`, `destroy`) for bootstrap, teardown, and feature-flag-driven enable/disable

### Controller non-responsibilities

- exposing write operations such as `placeOrder`, `deposit`, `withdraw`, or `claim`
- serving read queries
- owning any Redux state slice
- transforming venue payloads
- managing caches
- implementing retry loops
- owning transaction details
- directly implementing order state transitions
- mediating Service Events between specialized services

### Hot path rule

Neither reads nor writes flow through `PredictController`. State-owning services register their own actions on the Engine messenger and own their own state slices via `BaseController` / `BaseDataService`. Hooks call those actions through `messenger.call(...)` and subscribe to those state slices through Redux selectors reading `state.engine.backgroundState.{ServiceName}`. Stateless services are accessed through messenger actions only.

### Public controller interface

```typescript
export interface PredictController {
  initialize(): Promise<void>;
  destroy(): void;
}
```

That is the entire surface. No proxy methods. No state accessors. Anything more would either re-create the legacy facade or duplicate ownership already held by a service.

### Why this shape

A controller whose public methods are a same-name forward to a service method is a shallow module: its interface size matches its implementation size, and the implementation provides no orchestration the service didn't already provide. In `PredictNext`:

- `TradingService` already owns the order workflow (state machine, deposit-before-order chaining, rate limiting, lifecycle Service Events). A `PredictController.placeOrder` that forwards to `TradingService.placeOrder` carries no additional logic.
- `TransactionService` already owns transaction orchestration. A `PredictController.deposit` that forwards adds nothing.
- `LiveDataService` already owns subscriptions. A `PredictController.subscribe` that forwards adds nothing.
- `BaseDataService`-backed services already serve reads directly. The controller is never on the read path.

Collapsing the controller to a composition root deletes the facade entirely. Hooks call services directly, and the controller's only job is to make sure the services exist.

### Composition diagram

```text
                       ┌─────────────────────────┐
                       │   PredictController     │
                       │   (composition root)    │
                       │   initialize / destroy  │
                       └────────────┬────────────┘
                                    │ instantiates and wires
                                    ▼
        ┌─────────────────┬──────────────────┬─────────────────┐
        │                 │                  │                 │
        ▼                 ▼                  ▼                 ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ PredictSession │ │ MarketData     │ │ Portfolio      │ │ Trading        │
│ Service        │ │ Service        │ │ Service        │ │ Service        │
│ (BaseController)│ │ (BaseDataSvc) │ │ (BaseDataSvc) │ │ (BaseController)│
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
        │                 │                  │                 │
        │                 │                  │                 │
        ▼                 ▼                  ▼                 ▼
       (state.engine.backgroundState.{ServiceName})

                ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
                │ Transaction    │ │ LiveData       │ │ Analytics      │
                │ Service        │ │ Service        │ │ Service        │
                │ (stateless)    │ │ (stateless)    │ │ (stateless)    │
                └────────────────┘ └────────────────┘ └────────────────┘
```

```text
Hooks (read path)                 Hooks (write path)
    │                                  │
    │  messenger.call(                 │  messenger.call(
    │   'PredictMarketDataService:getEvents'  │   'PredictTradingService:placeOrder'
    │   …)                             │   …)
    ▼                                  ▼
MarketDataService                  TradingService
    │                                  │
    │                                  ├── this.update() to advance state machine
    │                                  │
    └─── via PredictSessionService.getClient(owner) ───▶ PredictClient ──▶ active VenueAdapter

TradingService / TransactionService / LiveDataService ─▶ AnalyticsService (messenger.call('PredictAnalyticsService:track', …))
```

`PredictController` does not appear on either hot path.

## 3. PredictSessionService (BaseController)

`PredictSessionService` extends `BaseController` and is the stateful owner of venue client/session lifecycle and account readiness. It exists so venue adapters can remain stateless while product services avoid resolving signers, managing credentials, tracking eligibility/readiness, or exposing venue-account details. It registers as a first-class `Engine.context` entry; hooks call its actions through messenger and subscribe to its public state slice through Redux selectors.

Its `BaseController` state holds the small set of session-derived data that needs cross-component reactivity:

- `readinessByOwner`: a record of `PredictAccountReadiness` keyed by `ownerAddress` — the canonical owner of Account Readiness for the whole feature
- `eligibility`: feature-level eligibility (geo, feature flag)

Internal session material — API keys, signing context, raw venue auth payloads — stays in private fields and is never put in `state` or exposed through public actions. State fields are declared via `StateMetadata` with conservative persistence: most fields are `persist: false`; only durable identifiers such as the active `venueId` (when not derived from geo on each launch) may be `persist: true`.

### Responsibilities

- resolve `PredictSigner` for an `ownerAddress` through `PredictSignerProvider`
- resolve the active venue adapter and ensure a valid `PredictVenueSession` for `venueId` + `ownerAddress`
- ask the active adapter to create refreshed session material when the cached session is missing or expired
- construct and return the session-bound `PredictClient` view of the active adapter
- cache and refresh session material by active `venueId` and `ownerAddress` in private fields
- own Account Readiness for the whole feature: invoke `VenueAdapter.fetchAccountReadiness(session)`, store the result in `readinessByOwner`, expose it for selectors and dependent services
- maintain feature-level eligibility (geo, feature flag) in the public state slice
- invalidate sessions on account switch, sign-out, auth failure, venue change, or explicit caller request
- keep raw session material (API keys, signing context) private to `PredictSessionService` and the returned `PredictClient`

### Non-responsibilities

- cache canonical read models such as events, positions, balances, or activity
- implement venue DTO transformation
- orchestrate deposits, orders, withdrawals, or claims
- expose venue account addresses, wallet types, deployment flags, API keys, raw auth headers, or session objects
- mediate cross-service workflows; readiness is exposed for read, refresh, and subscription only — not for orchestration of dependent workflows

### Public interface

```typescript
export interface PredictSessionServiceState {
  readinessByOwner: Record<string, PredictAccountReadiness>;
  eligibility: { eligible: boolean; blockReason?: string };
}

// Messenger actions registered by PredictSessionService
export type PredictSessionServiceActions =
  | {
      type: 'PredictSessionService:getClient';
      handler: (
        ownerAddress: string,
        venueId?: PredictVenueId,
      ) => Promise<PredictClient>;
    }
  | {
      type: 'PredictSessionService:invalidate';
      handler: (ownerAddress: string, venueId?: PredictVenueId) => void;
    }
  | {
      type: 'PredictSessionService:fetchAccountReadiness';
      handler: (
        ownerAddress: string,
        opts?: { forceRefresh?: boolean },
      ) => Promise<PredictAccountReadiness>;
    };

export class PredictSessionService extends BaseController<
  'PredictSessionService',
  PredictSessionServiceState,
  PredictSessionServiceMessenger
> {
  // Action handlers registered on the messenger during construction.
  // fetchAccountReadiness invokes adapter.fetchAccountReadiness(session) internally,
  // then this.update(state => { state.readinessByOwner[ownerAddress] = result; }).
}
```

Product services use `PredictSessionService` before any venue operation:

```typescript
const client = await messenger.call(
  'PredictSessionService:getClient',
  ownerAddress,
);
return client.fetchBalance();
```

Hooks and views read account readiness through Redux selectors against the service's slice:

```typescript
// In selectors:
const selectReadiness = (owner: string) => (state: RootState) =>
  state.engine.backgroundState.PredictSessionService.readinessByOwner[owner];

// In a hook:
const readiness = useSelector(selectReadiness(ownerAddress));
```

Callers should treat `PredictClient` instances as operation-scoped. Do not store a `PredictClient` long-term in UI, hooks, controllers, or services; ask `PredictSessionService` for a client when venue work starts so it can validate or refresh the session first.

There is intentionally no public session-purpose enum and no public session object. `PredictSessionService` ensures the returned `PredictClient` has whatever authenticated or unauthenticated context the active venue needs for that MetaMask account. Some read-only venue APIs are still authenticated because the venue needs to know which user is being queried. If a future venue needs multiple internal credential types, `PredictSessionService` and the active adapter can manage that without changing product service APIs.

### Account Readiness ownership

Account Readiness is owned by `PredictSessionService` exclusively. `PortfolioService` does not expose it; views do not derive it from portfolio data. The session service is the only caller of `VenueAdapter.fetchAccountReadiness(session)` and the only writer of `readinessByOwner`. This avoids the previous three-owner problem (PortfolioService cache + PredictSessionService internal state + adapter method all claiming a piece) and the circular dependency that came with it (PortfolioService needed `getClient()` to fetch readiness; `getClient()` needed readiness to know whether a session was producible).

Refresh policy:

- on first call to `getClient(owner)`, ensure `readinessByOwner[owner]` is populated; fetch if missing
- on `fetchAccountReadiness(owner, { forceRefresh: true })`, bypass cache and re-invoke the adapter
- on account switch, invalidate the previous owner's entry
- on sign-out or session invalidation, clear the affected entry
- venue-specific events (KYC approved, geo flip) trigger refresh via existing service-event subscriptions

## 4. MarketDataService (BaseDataService)

`MarketDataService` is the read model for market and discovery data.

### Why BaseDataService

Market data is shared server state:

- many screens consume it
- cache behavior matters
- stale/fresh semantics matter
- identical requests should dedupe automatically

`@metamask/base-data-service` gives PredictNext the correct shape for this problem:

- TanStack Query semantics at the service layer
- shared cache via messenger
- retries through Cockatiel policy
- circuit breaker behavior
- query-key-centric reads

### Registration model

`MarketDataService` registers with Engine messenger and exposes query methods that can be invoked by React hooks without passing through `PredictController`.

### Policy defaults

- `maxRetries: 2`
- `maxConsecutiveFailures: 3`

### Stale-time strategy

- prices: `1 minute`
- active event metadata: `5 minutes`
- resolved events: `1 hour`

### Replaces legacy complexity

`MarketDataService` replaces scattered mechanisms such as:

- `GameCache`-style live game overlays, via write-through cache updates from `LiveDataService`
- `TeamsCache`-style venue metadata fetch coordination, via client/read-service cache policy
- custom pagination trackers
- view-owned fetch coordination

Sports team metadata is not exposed through a public `TeamsService`. It is an enrichment detail behind event reads: the `PredictClient` and active adapter normalize venue team payloads into canonical `PredictTeam` metadata, and read services cache the resulting `PredictEvent` objects.

### Public interface

The snippets below show method shape. The implementation should import canonical entities from `PredictNext/types` rather than redefine thin local versions; those canonical types must preserve legacy UI fields during migration.

```typescript
export interface FetchEventsParams {
  cursor?: string;
  league?: string;
  status?: 'upcoming' | 'live' | 'resolved';
  sort?: 'featured' | 'volume' | 'endingSoon';
  limit?: number;
}

export interface SearchEventsParams {
  query: string;
  limit?: number;
}

export type TimePeriod = '1H' | '1D' | '1W' | '1M' | 'ALL';

export interface PredictOutcome {
  id: string;
  label: string;
  price: DecimalString;
  probability: DecimalString;
}

export interface PredictMarket {
  id: string;
  eventId: string;
  question: string;
  status: 'open' | 'closed' | 'resolved';
  outcomes: PredictOutcome[];
}

export interface PredictEvent {
  id: string;
  title: string;
  subtitle?: string;
  status: 'upcoming' | 'live' | 'resolved';
  markets: PredictMarket[];
  startsAt?: string;
  resolvesAt?: string;
}

export interface PricePoint {
  timestamp: string;
  value: string;
}

export interface PriceQuery {
  eventId: string;
  marketId: string;
  outcomeId: string;
}

export interface PriceResult {
  eventId: string;
  marketId: string;
  outcomeId: string;
  buy: DecimalString;
  sell: DecimalString;
}

export interface MarketPrices {
  venueId: PredictVenueId;
  results: PriceResult[];
}

export interface CryptoPricePoint {
  timestamp: number;
  value: DecimalString;
}

export interface CryptoPriceParams {
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate?: string;
}

export interface CryptoReferencePriceParams extends CryptoPriceParams {
  eventId: string;
  endDate: string;
}

export type ReferencePrice = DecimalString;

export interface PaginatedResult<T> {
  items: T[];
  /** Cursor for fetching the next page when the endpoint is cursor-based. */
  cursor?: string | null;
  /** Total result count when the endpoint is page-based and exposes one. */
  totalResults?: number;
}

export interface MarketDataService {
  getEvents(params: FetchEventsParams): Promise<PaginatedResult<PredictEvent>>;
  getEvent(eventId: string): Promise<PredictEvent>;
  getCarouselEvents(): Promise<PredictEvent[]>;
  searchEvents(
    params: SearchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  getPriceHistory(marketId: string, period: TimePeriod): Promise<PricePoint[]>;
  getCryptoPriceHistory(params: CryptoPriceParams): Promise<CryptoPricePoint[]>;
  getCryptoReferencePrice(
    params: CryptoReferencePriceParams,
  ): Promise<ReferencePrice | null>;
  getPrices(queries: PriceQuery[]): Promise<MarketPrices>;
}
```

### Query key contract

Market-data query key shapes are owned by [interface-ledger.md](./interface-ledger.md). The hook layer should never invent alternate keys for these reads.

## 5. PortfolioService (BaseDataService)

`PortfolioService` is the read model for account-specific prediction-market data.

### Responsibilities

- positions
- activity history
- balances
- unrealized profit and loss
- portfolio cache patches and rollbacks in response to cache-relevant Service Events

Account Readiness is **not** owned here. It is owned by `PredictSessionService` and read through Redux selectors against that service's state slice. Views that need both portfolio data and readiness simply consume both — proximity in the UI is not a reason to merge ownership.

### Cache strategy

- positions: `1 minute`
- activity: `5 minutes`
- balance: typically `1 minute`

Positions are relatively volatile during active trading, while activity is more append-only and tolerates a slightly longer stale window.

Canonical product financial values exposed by services use decimal strings. Services and UI should not depend on raw token integers or JavaScript floating-point numbers for balances, prices, PnL, fees, or order sizing. `PredictClient` and active adapter transaction builders own conversion to raw venue/token units.

### Optimistic portfolio updates

`PortfolioService` owns portfolio read-model mutation. It subscribes to cache-relevant Service Events from workflows such as order placement and claims, then patches or invalidates its own query caches.

```text
TradingService places order
  → emits order lifecycle Service Event with ownerAddress, venueId, marketId, outcomeId, side, quantity, price, optimisticId
    → PortfolioService patches getPositions(ownerAddress) optimistically
      → UI re-renders from query cache
        → API/live update/refetch confirms position
          → PortfolioService reconciles and removes optimistic marker
```

If the workflow fails, `PortfolioService` rolls back the optimistic cache patch by `optimisticId` and invalidates the affected query family when rollback cannot be proven safe.

This keeps order workflow ownership in `TradingService` while keeping portfolio read-model ownership in `PortfolioService`. `TradingService` does not mutate portfolio query caches directly, and UI code does not apply position overlays. `PortfolioService` obtains a `PredictClient` through `PredictSessionService.getClient(ownerAddress)` before calling venue methods.

### Public interface

```typescript
export interface PredictPosition {
  id: string;
  ownerAddress: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  shares: DecimalString;
  averageEntryPrice: DecimalString;
  currentValue: DecimalString;
  unrealizedPnL: DecimalString;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'deposit' | 'withdrawal' | 'claim';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  txHash?: string;
  description: string;
}

export interface PredictBalance {
  venueId: PredictVenueId;
  ownerAddress: string;
  /** Settlement-currency decimal string, e.g. "0.56". */
  amount: DecimalString;
}

export interface PredictSettlementCurrency {
  symbol: string;
  decimals: number;
  tokenAddress?: string;
  chainId?: string;
}

export interface PredictVenueInfo {
  venueId: PredictVenueId;
  name: string;
  settlementCurrency: PredictSettlementCurrency;
  capabilities: VenueCapabilities;
}

export type PredictAccountReadinessStatus =
  | 'ready'
  | 'setup_required'
  | 'setup_pending'
  | 'restricted'
  | 'unavailable';

export type PredictAccountReadinessBlockerCode =
  | 'account_setup_required'
  | 'account_setup_pending'
  | 'kyc_required'
  | 'kyc_pending'
  | 'kyc_rejected'
  | 'jurisdiction_restricted'
  | 'geo_blocked'
  | 'venue_unavailable'
  | 'unknown';

export interface PredictAccountReadinessBlocker {
  code: PredictAccountReadinessBlockerCode;
  message?: string;
  action?: 'complete_setup' | 'complete_kyc' | 'retry';
}

export interface PredictAccountReadiness {
  venueId: PredictVenueId;
  ownerAddress: string;
  canTrade: boolean;
  status: PredictAccountReadinessStatus;
  blockers?: PredictAccountReadinessBlocker[];
}

export interface PortfolioService {
  getPositions(ownerAddress: string): Promise<PredictPosition[]>;
  getActivity(
    ownerAddress: string,
    cursor?: string,
  ): Promise<PaginatedResult<ActivityItem>>;
  getBalance(ownerAddress: string): Promise<PredictBalance>;
  getVenueInfo(): PredictVenueInfo;
  getUnrealizedPnL(ownerAddress: string): Promise<DecimalString>;
}
```

Account readiness is intentionally absent. Hooks that need it read from `PredictSessionService`'s state slice (see § 3).

### Query key contract

Portfolio query key shapes are owned by [interface-ledger.md](./interface-ledger.md).

## 6. TradingService (BaseController)

`TradingService` extends `BaseController` and owns the entire active-order workflow. This is one of the deepest modules in the system. It registers as a first-class `Engine.context` entry. Hooks call its actions through messenger and subscribe to its public `state.engine.backgroundState.PredictTradingService` slice through Redux selectors. There is no `PredictController.placeOrder` proxy — hooks talk to `TradingService` directly.

`TradingService` state is declared with `StateMetadata` per field. The order state machine and `selectedPaymentToken` are typically `persist: false` because mid-order recovery is not a product requirement; if a launch interrupts an order, the user starts again from preview.

### State machine ownership

The order lifecycle is modeled inside `TradingService`, not in hooks or screens. Transitions happen through `this.update((state) => { ... })` so the state machine state is observable via Redux subscriptions.

- `IDLE`
- `PREVIEWING`
- `DEPOSITING`
- `PLACING_ORDER`
- `SUCCESS`
- `ERROR`

The UI can render the current state, but it should not be responsible for deciding transitions.

```text
          +-------+          +------------+
          | ERROR | <------- | ANY STATE  |
          +-------+          +------------+
              |
              | (reset)
              v
          +-------+          +------------+
   +----> | IDLE  | <------> | PREVIEWING |
   |      +-------+          +------------+
   |          |                    |
   |          v                    |
   |      +------------+           |
   |      | DEPOSITING | <---------+
   |      +------------+
   |          |
   |          v
   |      +---------------+
   |      | PLACING_ORDER |
   |      +---------------+
   |          |
   |          v
   |      +---------+
   +----- | SUCCESS |
          +---------+
```

### Internal responsibilities

`TradingService` hides substantial complexity:

- rate limiting to at most one order every three seconds
- order preview lifecycle using `PredictClient` quote reads
- automatic deposit-and-order chaining when funding is insufficient
- Service Events for order lifecycle milestones that may affect portfolio or market caches
- request targeted invalidation after write completion when cache patching is insufficient
- analytics emission at preview, submit, success, and failure boundaries

### Public interface

```typescript
export type TradingStateStatus =
  | 'IDLE'
  | 'PREVIEWING'
  | 'DEPOSITING'
  | 'PLACING_ORDER'
  | 'SUCCESS'
  | 'ERROR';

export interface SelectedPaymentToken {
  tokenAddress: string;
  symbol: string;
}

export interface TradingServiceState {
  status: TradingStateStatus;
  activePreview: OrderPreview | null;
  lastOrderReceipt: OrderReceipt | null;
  lastErrorCode: PredictErrorCode | null;
  selectedPayment: SelectedPaymentToken | null;
}

// Messenger actions registered by TradingService
export type PredictTradingServiceActions =
  | {
      type: 'PredictTradingService:previewOrder';
      handler: (params: PreviewOrderParams) => Promise<OrderPreview>;
    }
  | {
      type: 'PredictTradingService:placeOrder';
      handler: (params: PlaceOrderParams) => Promise<OrderReceipt>;
    }
  | {
      type: 'PredictTradingService:cancelOrder';
      handler: (orderId: string) => Promise<void>;
    }
  | {
      type: 'PredictTradingService:selectPaymentToken';
      handler: (token: SelectedPaymentToken) => void;
    }
  | { type: 'PredictTradingService:reset'; handler: () => void };

// Class shape
export class TradingService extends BaseController<
  'PredictTradingService',
  TradingServiceState,
  TradingServiceMessenger
> {
  // No readonly state accessors. Subscribers read state.engine.backgroundState.PredictTradingService via selectors.
  // Action handlers above are registered on the messenger during construction.
  // State mutations happen exclusively through this.update().
}
```

The previous draft of this interface exposed `readonly orderState` and `readonly selectedPayment` as public properties. That was duplicate ownership — the same data lived in `PredictController` Redux state and in the service's readonly fields. With `TradingService` extending `BaseController`, state lives in one place and is read via Redux selectors.

### Hidden internals by design

The service may internally require many helpers:

- preview validator
- quote freshness checker
- funding evaluator
- rate limit gate
- order transition reducer
- order lifecycle Service Event publisher
- post-write invalidation planner

Those helpers should remain private because callers do not benefit from depending on them. The public API stays small even if the implementation is sophisticated.

## 7. TransactionService (Plain Service)

`TransactionService` owns blockchain transaction orchestration and execution for PredictNext account operations. Venue-specific transaction payload construction and payload signing stay behind `PredictClient` transaction builders.

### Responsibilities

- deposits
- withdrawals
- claims
- transaction batching where supported
- transaction-controller signing lifecycle coordination
- submission coordination
- venue-independent error normalization

### Internal complexity absorbed here

The UI and controller should never need to know whether a transaction requires:

- Safe proxy wallet interaction
- Permit2 approval
- venue-specific EIP-712 or Safe payload signing
- multiple batched calls
- venue-specific calldata shape

The `PredictClient` hides venue-specific payload construction, signing, and session details. `TransactionService` hides when and how to request the client from `PredictSessionService`, call client transaction builders, submit the resulting `TransactionBatch`, coordinate transaction-controller signing hooks, track pending state, and normalize failures.

### Public interface

```typescript
export interface TransactionService {
  deposit(params: DepositParams): Promise<TransactionResult>;
  withdraw(params: WithdrawParams): Promise<TransactionResult>;
  claim(params: ClaimParams): Promise<TransactionResult>;
}
```

`PredictError` shape, categories, and codes are owned by [interface-ledger.md](./interface-ledger.md). This service throws `PredictError` values using object-parameter construction, never positional arguments.

Every thrown error exposed from this service should be a `PredictError`. Lower-level exceptions should not escape the boundary.

## 8. LiveDataService (Plain Service)

`LiveDataService` owns realtime delivery for prediction-market updates. It does not own the read model cache; read services decide how canonical live updates mutate cached events, markets, prices, positions, balances, and activity.

### Responsibilities

- manage socket or stream connection lifecycle
- fan venue streams into stable channel abstractions
- normalize venue stream messages into canonical live update payloads
- multiplex multiple subscribers onto shared underlying connections
- reconnect with backoff
- publish canonical updates to interested services
- expose a small, generic subscription API

### Public interface

```typescript
export type LiveDataConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export interface MarketPriceUpdate {
  marketId: string;
  bestBid?: string;
  bestAsk?: string;
  lastTradedPrice?: string;
  updatedAt: string;
}

export interface CryptoPriceUpdate {
  symbol: string;
  price: string;
  updatedAt: string;
}

export interface GameUpdate {
  eventId: string;
  status: 'upcoming' | 'live' | 'resolved';
  headline?: string;
  updatedAt: string;
}

export interface SubscriptionHandle<TData> {
  readonly status: LiveDataConnectionStatus;
  readonly data?: TData;
  unsubscribe(): void;
}

export interface LiveDataService {
  readonly connectionStatus: LiveDataConnectionStatus;

  subscribe<TData = unknown>(
    channel: SubscriptionChannel,
    params: SubscriptionParams,
    onData: (data: TData) => void,
  ): SubscriptionHandle<TData>;

  disconnect(): void;
}
```

### Channel set

Supported channels:

- `'marketPrices'`
- `'cryptoPrices'`
- `'gameUpdates'`

The channel abstraction is product-level. Whether a venue implements it through WebSocket, SSE, or polling fallback is an internal concern.

### Write-through cache updates

Live updates should refresh the read-model caches rather than being overlaid in UI code. `LiveDataService` fans out canonical updates; `MarketDataService` and `PortfolioService` subscribe internally and then either patch matching query caches or invalidate/refetch when safe patching is not possible.

Patch directly when the update contains a stable identifier and complete enough data to preserve cache correctness. Invalidate and refetch when matching is uncertain, the update is too partial to merge safely, or the affected query set cannot be identified cheaply.

Examples:

- sports `GameUpdate` with `game.id` patches cached `PredictEvent` records whose `game.id` matches the update
- market price updates with canonical market or outcome IDs patch matching price and order-book query entries
- fill/order/position updates patch matching portfolio queries only when `ownerAddress` and position/order identifiers are known
- broad venue status, league, or account updates invalidate the relevant query family instead of guessing

This replaces the legacy `GameCache` overlay pattern. Query cache data should represent the freshest known read model, not a stale venue response plus a separate overlay layer.

## 9. AnalyticsService (Plain Service)

`AnalyticsService` is a cross-cutting dependency used by other services.

### Responsibilities

- track Predict product events
- inject stable session and account context
- normalize naming across venues
- batch emissions when appropriate

### Public interface

```typescript
export type PredictAnalyticsEvent =
  | 'Predict Viewed Home'
  | 'Predict Viewed Event'
  | 'Predict Previewed Order'
  | 'Predict Placed Order'
  | 'Predict Order Failed'
  | 'Predict Deposited Funds'
  | 'Predict Withdrew Funds'
  | 'Predict Claimed Winnings'
  | 'Predict Live Data Reconnected';

export interface AnalyticsService {
  track(
    event: PredictAnalyticsEvent,
    properties: Record<string, unknown>,
  ): void;
}
```

Other services should depend on `AnalyticsService` through constructor injection and call `track()` at meaningful workflow boundaries. Views should rarely emit analytics directly.

## 10. Service Interaction Patterns

Services cooperate, but dependency directions stay disciplined.

### Dependency graph

Typical direct dependencies:

- `PredictController` → instantiates and wires every other module during `initialize()`
- `PredictSessionService` → `VenueAdapterRegistry` / active venue adapter
- `PredictSessionService` → `PredictSignerProvider`
- `TradingService` → `TransactionService` (via messenger action)
- `TradingService` → `PredictSessionService` for a bound `PredictClient`
- `TradingService` → `AnalyticsService` (via messenger action)
- `MarketDataService` → `PredictSessionService` for a bound `PredictClient`
- `PortfolioService` → `PredictSessionService` for a bound `PredictClient`
- `TransactionService` → `PredictSessionService` for a bound `PredictClient`
- `LiveDataService` → `PredictSessionService` for a bound `PredictClient`
- `LiveDataService` → `AnalyticsService` (via messenger action)

`PredictController` itself is not depended on by any service after construction. Services receive only the dependencies they need through scoped messengers and constructor injection; they do not call back into the composition root.

Cross-service read-model updates flow through typed Service Events on the Engine messenger rather than direct service-to-service mutation calls.

```text
MarketDataService ─┐
PortfolioService ──┤
TradingService ────┼────────────▶ PredictSessionService ──valid session──▶ PredictClient
TransactionService ┤                                      │                    │
LiveDataService ───┘                                      │                    ▼
                                                           └────────────▶ active VenueAdapter

TradingService ───────────────▶ TransactionService            (messenger action)
TradingService / TransactionService / LiveDataService ───▶ AnalyticsService  (messenger action)

Service Events:
  TradingService ──order lifecycle──▶ PortfolioService
  LiveDataService ──live updates────▶ MarketDataService / PortfolioService
```

`AnalyticsService` should not depend back on feature services. Venue adapters should not depend upward on services and should not cache sessions that belong to `PredictSessionService`. `TradingService` should not directly mutate `PortfolioService` or `MarketDataService` caches.

### Constructor injection

Dependencies are provided explicitly during `PredictController.initialize()`. State-owning services receive a scoped messenger and an optional persisted-state slice as required by their base class; stateless services receive the messenger plus direct references where the call pattern is hot enough to justify it over messenger actions.

```typescript
// Direct injection for hot collaboration; messenger actions for everything else.
export interface TradingServiceDeps {
  messenger: TradingServiceMessenger;
  state?: Partial<TradingServiceState>;
  // PredictSessionService is reached via messenger.call('PredictSessionService:getClient', ...)
  // TransactionService is reached via messenger.call('PredictTransactionService:deposit', ...)
  // AnalyticsService is reached via messenger.call('PredictAnalyticsService:track', ...)
}
```

By default, services collaborate through the messenger. Direct constructor references are used only when a call is too hot for messenger overhead (which is rare in practice) or when a stateless utility object must be shared. This keeps boundaries explicit and tests focused — a `TradingService` test only needs to stub the messenger, not pass concrete service instances.

### Messenger clients and Service Events

PredictNext services are first-class Engine messenger clients. The app-wide `controllerMessenger` name is historical; services can register actions and publish/subscribe to events the same way controllers do.

Each service should receive a scoped messenger with an explicit namespace and allow-list:

- actions it registers for external callers, such as `PredictTradingService:placeOrder` or `PredictPortfolioService:getPositions`
- external actions it may call, such as transaction-controller or analytics-controller actions
- Service Events it may publish, such as `PredictTradingService:orderSubmitted`
- Service Events it may subscribe to, such as `PredictLiveDataService:gameUpdated`

The canonical Service Event names and minimum payloads are owned by [interface-ledger.md](./interface-ledger.md). Use this pattern for cache-relevant coordination. For example, `TradingService` publishes `PredictTradingService:orderSubmitted`; `PortfolioService` subscribes and decides whether to patch, reconcile, roll back, or invalidate its own cache. `PredictController` does not mediate that internal update.

### BaseDataService registration

The read services register with Engine under a `DATA_SERVICES` convention. Hooks use those registrations through `@metamask/react-data-query` and messenger-driven query resolution.

Illustrative shape:

```typescript
export interface PredictDataServicesRegistry {
  PredictMarketDataService: MarketDataService;
  PredictPortfolioService: PortfolioService;
}
```

This pattern gives PredictNext a shared data plane for reads while preserving a thin controller for writes.

### Guiding rule

If a new requirement introduces orchestration, retries, branching workflow state, or venue coordination, it belongs in a service. If it only translates a venue payload, it belongs in an adapter. If it only presents data, it belongs above the service layer.
