# PredictNext Service Architecture

This document describes the service layer for the PredictNext redesign. The service layer is where PredictNext becomes deep: reads, writes, orchestration, retries, state machines, transaction composition, and realtime coordination all live here rather than in components, hooks, or controllers.

Related documents:

- [interface-ledger.md](./interface-ledger.md) — canonical runtime namespaces, query keys, actions, Service Events, and errors
- [architecture.md](./architecture.md)
- [adapters.md](./adapters.md)
- [state-management.md](./state-management.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [migration/kalshi-first.md](./migration/kalshi-first.md)

## 1. Service Overview

The long-term target uses six services in three canonical shapes (see §1.5), plus a `PredictController` composition root and an injected `predictAnalytics` helper module. **Stateful services** extend `BaseController`; **Read services** extend `BaseDataService`; **Runtime services** are plain classes with transient lifecycle state in private fields.

The Kalshi-first track creates and registers a service only when an enabled vertical slice needs it. Setup → Deposit → Balance does not wait for `LiveDataService`, every Polymarket read, or the full target UI. The six-service inventory is a destination, not a launch checklist.

| Module                  | Base class               | Approximate public interface size              | What it owns / hides                                                                                                                                                                                                         |
| ----------------------- | ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PredictController`     | Plain (composition root) | 2 methods (`initialize`, `destroy`)            | service instantiation order, shared dependency wiring, feature lifecycle. **No Redux state.**                                                                                                                                |
| `PredictSessionService` | `BaseController`         | client, readiness, setup actions + state slice | Predict Client retrieval, authenticated user/account scope, Venue Session cache, Account Setup orchestration through the account adapter, `AccountReadinessPolicy`, invalidation                                             |
| `MarketDataService`     | `BaseDataService`        | 8 actions + read-model writer interface        | query descriptor consumption, cache strategy, retries, venue pagination normalization, market read-model patching                                                                                                            |
| `PortfolioService`      | `BaseDataService`        | 5 actions + read-model writer interface        | positions / activity / balance / PnL read aggregation, cache policy, pagination, background refresh, portfolio read-model patching                                                                                           |
| `TradingService`        | `BaseController`         | Order actions + state machine slice            | preview expiry, idempotent Order/reconciliation state machine, rate limiting, optional funding policy, read-model writer notifications                                                                                       |
| `TransactionService`    | `BaseController`         | funding actions + safe operation projection    | prepare/confirm/commit Deposit, Withdraw, optional Claim; persisted non-secret operation references, resume/reconciliation, analytics, user-facing errors                                                                    |
| `LiveDataService`       | Runtime service          | 2 actions + internal connection status         | socket lifecycle, reconnection, multiplexing, channel fan-out, narrow read-model writer notifications                                                                                                                        |
| `FundingExecutor`       | Runtime primitive        | `executePlan(plan, opts)`, `cancel`, `destroy` | Wallet confirmation/submission and funding commit coordination using durable operation/idempotency references. **Not a service.** Constructor-injected into `TransactionService` and optional TradingService funding policy. |
| `predictAnalytics`      | Injected helper module   | one `track(event, properties)` method          | analytics emission for product events. **Not a service.** Constructed in the composition root and injected into services.                                                                                                    |

The design intent is that each service exposes only the capabilities other modules must use. Internal helpers, transport concerns, and workflow state remain private. Read services expose narrow read-model writer interfaces; write and live services never receive full read-service instances. Stateful services declare `StateMetadata` per field. Sensitive values never persist; only safe operation references persist when resume/reconciliation needs them.

`PredictController` is not on a hot path. It organizes enabled modules, not calls. Hooks address services through messenger actions, query descriptors, and selectors.

Structural capability presence is executable truth. Product capability metadata controls affordances and must agree with adapter structure in contract tests. Services do not call methods that exist only to throw unsupported errors.

`MarketDataService` resolves the public `marketData` adapter by explicit `venueId`. Account-scoped services obtain a `PredictClient` from `PredictSessionService.getClient(scope)`, where `scope` is a Venue-qualified `PredictAccountScope`. Services never receive `PredictVenueSession`. No module assumes one global active Venue for mixed data.

## 1.5. Service Shapes

PredictNext services use three canonical shapes. The name describes what the service **owns**, not whether it has any internal data — a Read service still maintains a query cache, and a Runtime service still tracks lifecycle bookkeeping. The shape is fixed at class definition and never mixed.

| Shape                | Extends           | Owns                                                                                                                                        | Examples                                                        |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Stateful service** | `BaseController`  | A Redux slice on `state.engine.backgroundState.<Name>`                                                                                      | `PredictSessionService`, `TradingService`, `TransactionService` |
| **Read service**     | `BaseDataService` | A TanStack query cache; no Redux slice                                                                                                      | `MarketDataService`, `PortfolioService`                         |
| **Runtime service**  | plain class       | Transient lifecycle state (sockets, in-flight maps, rate-limit windows, batch handles) in private fields; no Redux slice and no query cache | `LiveDataService`                                               |

The term **Stateful service** is reserved for Redux-slice ownership. Read and Runtime services may carry internal data, but they are not "Stateful" in PredictNext docs. Use **stateless** only for things that truly hold no state between calls. Venue adapters do not own product state or session caches, though their transport clients may hold connection pools. `FundingExecutor` is a runtime primitive with private lifecycle bookkeeping.

Each shape determines how callers reach the service:

- Stateful service: `useSelector(...)` for reads, `messenger.call('<Name>:action', ...)` for mutations
- Read service: `useQuery(['<Name>:method', params])` via the messenger query bridge
- Runtime service: `messenger.call('<Name>:action', ...)` only

`PredictController` is none of the three. It is the composition root.

### Decision rule: helper vs service

A capability becomes a **service** (Engine.context entry + messenger namespace) only if at least one of:

1. It owns durable state (a Redux slice or a query cache).
2. It owns lifecycle that callers must observe (connection status, retry windows, init/destroy hooks).
3. It exposes more than one logically distinct operation that callers compose.
4. It is consumed from outside the feature boundary (other Engine.context features).

Otherwise it is a **helper** or **feature primitive**: a plain module constructed in the composition root and injected by constructor reference into the services that need it. `predictAnalytics` meets none of the four — see §9. The `FundingExecutor` primitive (see §7) owns private lifecycle bookkeeping but has no observable lifecycle for callers, one logical operation family, and no cross-feature consumers, so it is a runtime primitive rather than a service.

## 2. PredictController (Composition Root)

`PredictController` is a stateless composition root. Its only job is to instantiate the service graph, wire shared dependencies, and own feature lifecycle. It does not own Redux state, does not expose write methods, and does not appear on the read or write hot paths.

This is a deliberate departure from the legacy `PredictController` (60+ methods, 2,600+ lines, owner of all Predict state). The depth of PredictNext lives in services. The composition root just bootstraps them.

### Controller responsibilities

- instantiate the Stateful, Read, and Runtime services required by the enabled Venue surface with scoped messengers and safe persisted state,
- construct `FundingExecutor` when funding is enabled and inject it into the services that need it,
- defer optional modules such as `LiveDataService` when bounded polling implements the enabled surface
- construct the `predictAnalytics` helper module and inject it into every service that emits analytics
- coordinate initialization order so that services depending on `PredictSessionService` are constructed after it
- own feature lifecycle entrypoints (`initialize`, `destroy`) for bootstrap, teardown, and feature-flag-driven enable/disable

### Bootstrap and lifecycle failure semantics

`initialize()` is **transactional and fail-closed for the required module set**. Either every module required by the enabled surface constructs cleanly, or the composition root tears the partial graph down and reports that Venue surface unavailable. Optional live/read modules may degrade only when the product explicitly permits it.

Failure modes are explicitly categorised:

- **Boot-blocking failures** prevent the feature from starting. Examples: missing required config, Engine.context name collision, registry construction failure, signer provider missing. The composition root rolls back every service it constructed in this `initialize()` call, unregisters all messenger clients, and exposes the feature as unavailable. No partial state is left behind.
- **Boot-degrading failures** allow the feature to start with reduced surface. Examples: optional venue adapter fails to load, analytics helper fails to initialise. The affected capability surfaces an `unavailable` category error (`PredictErrorCode.FEATURE_DISABLED` or `PredictErrorCode.VENUE_UNAVAILABLE`); the rest of the feature works.

`destroy()` is idempotent. It unregisters all messenger clients, unsubscribes all live data channels, clears in-memory caches private to services, and releases the `predictAnalytics` helper. After `destroy()`, calling `initialize()` again starts from a clean slate. Service Events emitted between the start of teardown and the completion of `destroy()` are dropped silently to prevent post-teardown observer effects.

### Controller non-responsibilities

- exposing write operations such as `placeOrder`, `deposit`, `withdraw`, or `claim`
- serving read queries
- owning any Redux state slice
- transforming venue payloads
- managing caches
- implementing retry loops
- owning transaction details
- directly implementing order state transitions
- mediating cache coordination or Service Events between specialized services (services own their own collaboration directly)

### Hot path rule

Neither reads nor writes flow through `PredictController`. Stateful services register their own actions on the Engine messenger and own their own state slices via `BaseController`; Read services register on the messenger and own a query cache via `BaseDataService`. Hooks call Stateful actions through `messenger.call(...)` and subscribe to slices through Redux selectors reading `state.engine.backgroundState.{ServiceName}`; Read hooks use `useQuery` against the messenger query bridge. Runtime services are accessed through messenger actions only.

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

- `TradingService` already owns the Order workflow (state machine, idempotency/reconciliation, optional automatic funding policy, rate limiting, direct read-model writer calls, observer-only Service Events). A `PredictController.placeOrder` forward adds no logic.
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

                 ┌────────────────┐ ┌────────────────┐
                │ Transaction    │ │ LiveData       │
                │ Service        │ │ Service        │
                │ (BaseController)│ │ (Runtime)      │
                └────────────────┘ └────────────────┘

                 ┌──────────────────────────────────┐
                 │ predictAnalytics helper          │
                 │ (injected module, not a service) │
                 └──────────────────────────────────┘
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
    ├─── public read via VenueAdapterRegistry.get(venueId).marketData
    └─── account write via PredictSessionService.getClient(scope) ───▶ PredictClient

TradingService / TransactionService / LiveDataService ─▶ predictAnalytics.track(event, properties)   (direct call on injected helper)
```

`PredictController` does not appear on either hot path.

## 3. PredictSessionService (BaseController)

`PredictSessionService` owns account-scoped Venue Session lifecycle, Account Readiness, and Account Setup workflow projection. It separates the authenticated Predict User from the selected Funding Wallet and keeps raw Venue credentials/session data outside Redux.

Account Readiness is produced by an internal `AccountReadinessPolicy`. The policy combines Venue readiness, eligibility, Account Setup, wallet/network requirements, and blocker precedence into one projection. Callers do not compose or rank blockers.

### Public state

```typescript
export interface PredictSessionServiceState {
  readinessByAccount: Record<PredictAccountScopeKey, PredictAccountReadiness>;
  setupByAccount: Record<PredictAccountScopeKey, AccountSetupState>;
  eligibilityByVenue: Partial<Record<PredictVenueId, PredictEligibility>>;
}
```

Rules:

- scope keys are created only by `getPredictAccountScopeKey(scope)`,
- `PredictAccountScope` contains Venue, opaque Predict User ID, and optional Funding Wallet address,
- raw Venue Sessions, credentials, email, OTP, profile/KYC values, and wallet signatures never enter public state,
- safe backend operation references may persist only when resume needs them,
- setup form values remain view-local for the minimum time required to submit them.

### Responsibilities

- resolve a registered Venue adapter from `scope.venueId`,
- create/refresh an account-scoped Venue Session from `PredictUserContext`,
- construct an operation-scoped `PredictClient` bound to account capabilities,
- cache Venue Sessions privately by account scope and invalidate them on sign-out, auth failure, wallet/scope change, or explicit refresh,
- call `client.account.fetchReadiness()`, attach the local `accountScopeKey`, and own the readiness projection,
- own Account Setup workflow state while delegating Venue calls only through `client.account.setup`,
- enforce Account Readiness blocker precedence,
- derive backend auth from the app authentication module for remote adapters,
- keep Venue credentials and account internals below the seam.

### Non-responsibilities

- public Event/Market/price reads,
- portfolio caching,
- Deposit, Withdraw, Claim, or Order orchestration,
- direct Kalshi/backend route calls,
- persisting sensitive setup input,
- treating a wallet address or email as authoritative person identity,
- deciding UI layout or retry buttons.

### Public actions

```typescript
export type PredictSessionServiceActions =
  | {
      type: 'PredictSessionService:getClient';
      handler: (scope: PredictAccountScope) => Promise<PredictClient>;
    }
  | {
      type: 'PredictSessionService:invalidate';
      handler: (scope: PredictAccountScope) => void;
    }
  | {
      type: 'PredictSessionService:fetchAccountReadiness';
      handler: (
        scope: PredictAccountScope,
        opts?: { forceRefresh?: boolean },
      ) => Promise<PredictAccountReadiness>;
    }
  | {
      type: 'PredictSessionService:startAccountSetup';
      handler: (
        scope: PredictAccountScope,
        params: StartAccountSetupParams,
      ) => Promise<AccountSetupState>;
    }
  | {
      type: 'PredictSessionService:resumeAccountSetup';
      handler: (scope: PredictAccountScope) => Promise<AccountSetupState>;
    }
  | {
      type: 'PredictSessionService:submitAccountSetupStep';
      handler: (
        scope: PredictAccountScope,
        params: AccountSetupStepParams,
      ) => Promise<AccountSetupState>;
    };
```

Account Setup actions fail with `UNSUPPORTED_VENUE_CAPABILITY` only when a caller violates the structural capability contract. Normal product code checks `client.account.setup` or Venue capability metadata before rendering setup actions.

### Usage

```typescript
const client = await messenger.call('PredictSessionService:getClient', scope);
return client.portfolio.fetchBalance();
```

```typescript
const scopeKey = getPredictAccountScopeKey(scope);
const readiness = useSelector(
  (state: RootState) =>
    state.engine.backgroundState.PredictSessionService.readinessByAccount[
      scopeKey
    ],
);
```

Callers treat a `PredictClient` as operation-scoped. They request one when account work starts so the session can be validated/refreshed; they do not retain it in React state or pass it across account changes.

### Account Setup durability

For remote Kalshi, the backend owns durable setup state and lost-response recovery. Mobile stores only the canonical projection and safe operation reference. Resuming setup calls `client.account.setup.resume()`; it never guesses from stale local steps.

Kalshi-specific rules include:

- distinguish flat account-exists from duplicate external-user-ID errors,
- treat Venue status strings as opaque unless contractually stable,
- recover a successful link/verification response that was lost,
- handle one-time API-key response loss through list/revoke/remint policy,
- refresh readiness only after durable setup completion.

`AccountReadinessPolicy` consumes `scope`, Venue readiness, Venue eligibility, and wallet/network state. A geo restriction outranks setup; a Venue outage outranks stale ready state.

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
- query-descriptor-centric reads

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

Sports team metadata is not exposed through a public `TeamsService`. It is an enrichment detail behind public Event reads: the selected `VenueAdapter.marketData` capability normalizes Venue team payloads into canonical `PredictTeam` metadata, and the read service caches the resulting `PredictEvent` objects.

### Public interface

The snippets below show method shape. The implementation should import canonical entities from `PredictNext/types` rather than redefine thin local versions; those canonical types must preserve legacy UI fields during migration.

```typescript
export interface FetchEventsParams {
  cursor?: string;
  league?: string;
  status?: 'upcoming' | 'live' | 'open' | 'closed' | 'resolved';
  sort?: 'featured' | 'volume' | 'endingSoon';
  limit?: number;
}

export interface SearchEventsParams {
  query: string;
  limit?: number;
}

export type TimePeriod = '1H' | '1D' | '1W' | '1M' | 'ALL';

// PredictEvent, PredictMarket, and PredictOutcome are imported from
// PredictNext/types. Do not redefine them in service modules.

export interface PricePoint {
  timestamp: number;
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

export interface CryptoPriceHistoryParams {
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate?: string;
}

export interface CryptoReferencePriceParams extends CryptoPriceHistoryParams {
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
  getEvents(
    venueId: PredictVenueId,
    params: FetchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  getEvent(venueId: PredictVenueId, eventId: string): Promise<PredictEvent>;
  getPriceHistory(
    venueId: PredictVenueId,
    marketId: string,
    period: TimePeriod,
  ): Promise<PricePoint[]>;
  getPrices(
    venueId: PredictVenueId,
    queries: PriceQuery[],
  ): Promise<MarketPrices>;

  // Optional Venue capabilities are exposed only when product surfaces use them.
  getEventSeries?(
    venueId: PredictVenueId,
    params: FetchEventSeriesParams,
  ): Promise<PredictEvent[]>;
  getCarouselEvents?(venueId: PredictVenueId): Promise<PredictEvent[]>;
  searchEvents?(
    venueId: PredictVenueId,
    params: SearchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  getCryptoPriceHistory?(
    venueId: PredictVenueId,
    params: CryptoPriceHistoryParams,
  ): Promise<CryptoPricePoint[]>;
  getCryptoReferencePrice?(
    venueId: PredictVenueId,
    params: CryptoReferencePriceParams,
  ): Promise<ReferencePrice | null>;
}
```

### Query descriptor contract

Market-data query descriptors are owned by [interface-ledger.md](./interface-ledger.md). The hook and service layers should never invent alternate keys, stale times, account-scoping rules, or invalidation families for these reads.

## 5. PortfolioService (BaseDataService)

`PortfolioService` is the read model for Venue- and Predict-User-scoped prediction-market data. Every method takes `PredictAccountScope`; no portfolio cache is keyed by an unqualified wallet address.

### Responsibilities

- positions
- activity history
- balances
- unrealized profit and loss
- portfolio cache patches and rollbacks in response to **direct read-model writer calls** from `TradingService` and `LiveDataService` (e.g., `onOrderSubmitted`, `applyPortfolioUpdate`)

Account Readiness is **not** owned here. It is owned by `PredictSessionService` and read through Redux selectors against that service's state slice. Views that need both portfolio data and readiness simply consume both — proximity in the UI is not a reason to merge ownership.

### Cache strategy

- positions: `1 minute`
- activity: `5 minutes`
- balance: typically `1 minute`

Positions are relatively volatile during active trading, while activity is more append-only and tolerates a slightly longer stale window.

Canonical product financial values exposed by services use decimal strings. Services and UI do not use raw token integers or JavaScript floating-point numbers for balances, prices, PnL, fees, or order sizing. The account-scoped adapter capability owns conversion to and from raw Venue/token units.

### Optimistic portfolio updates (direct cache coordination)

`PortfolioService` owns portfolio read-model mutation. Write services call **direct semantic methods** on a narrow `PortfolioReadModelWriter` produced by `PortfolioService` for cache-relevant workflow milestones — no internal pub/sub for cache mutation and no dependency on the full read-service interface.

```text
TradingService places Order
  → PortfolioReadModelWriter.onOrderSubmitted({
      scope, marketId, outcomeId, side, quantity, price, optimisticId
    })
    → PortfolioService patches getPositions(scope) optimistically
      → UI re-renders from query cache
        → API/live update/refetch confirms Fills/Position
          → onOrderConfirmed(scope, optimisticId, receipt)
            → PortfolioService reconciles and removes optimistic marker
```

If the workflow fails, `TradingService` calls `PortfolioReadModelWriter.onOrderFailed(optimisticId, error)`. `PortfolioService` rolls back the optimistic cache patch by `optimisticId` and invalidates the affected query family when rollback cannot be proven safe.

`PortfolioService` exposes this writer as a small internal adapter. It is injected at composition time, not registered on the messenger and not exported from `PredictNext/index.ts`:

```typescript
export interface PortfolioReadModelWriter {
  onOrderSubmitted(params: {
    scope: PredictAccountScope;
    marketId: string;
    outcomeId: string;
    side: 'buy' | 'sell';
    quantity: DecimalString;
    price: DecimalString;
    optimisticId: string;
  }): void;
  onOrderConfirmed(
    scope: PredictAccountScope,
    optimisticId: string,
    receipt: OrderReceipt,
  ): void;
  onOrderFailed(
    scope: PredictAccountScope,
    optimisticId: string,
    error: PredictError,
  ): void;
  onClaimSucceeded(params: {
    scope: PredictAccountScope;
    marketId: string;
    outcomeId: string;
  }): void;
  applyPortfolioUpdate(update: PortfolioUpdate): void;
}

export class PortfolioService extends BaseDataService {
  getReadModelWriter(): PortfolioReadModelWriter {
    return {
      onOrderSubmitted: this.onOrderSubmitted.bind(this),
      onOrderConfirmed: this.onOrderConfirmed.bind(this),
      onOrderFailed: this.onOrderFailed.bind(this),
      onClaimSucceeded: this.onClaimSucceeded.bind(this),
      applyPortfolioUpdate: this.applyPortfolioUpdate.bind(this),
    };
  }
}
```

This keeps order workflow ownership in `TradingService` and portfolio read-model ownership in `PortfolioService`, but the **dependency is explicit and direct**: `TradingService` holds a reference to `PortfolioReadModelWriter` injected at composition and invokes named methods. This eliminates the loose Service-Event pub/sub for the **system of record** and removes a class of ordering and race-condition bugs without giving write services access to read methods like `getPositions`.

Service Events are reserved for **observers** (analytics, optional listeners) — see [Service Events: observation only](#service-events-observation-only) below.

`PortfolioService` obtains a `PredictClient` through `PredictSessionService.getClient(scope)` and calls `client.portfolio` for account-scoped refreshes.

### Public interface

```typescript
// Canonical types are imported from PredictNext/types.

export interface PortfolioService {
  getPositions(
    scope: PredictAccountScope,
    params?: FetchPositionsParams,
  ): Promise<PaginatedResult<PredictPosition>>;
  getActivity(
    scope: PredictAccountScope,
    cursor?: string,
  ): Promise<PaginatedResult<ActivityItem>>;
  getBalance(scope: PredictAccountScope): Promise<PredictBalance>;
  getUnrealizedPnL?(scope: PredictAccountScope): Promise<PredictPnL>;
}
```

Account readiness is intentionally absent. Hooks that need it read from `PredictSessionService`'s state slice (see § 3).

### Query descriptor contract

Portfolio query descriptors are owned by [interface-ledger.md](./interface-ledger.md).

## 6. TradingService (BaseController)

`TradingService` extends `BaseController` and owns the entire active-order workflow. This is one of the deepest modules in the system. It registers as a first-class `Engine.context` entry. Hooks call its actions through messenger and subscribe to its public `state.engine.backgroundState.PredictTradingService` slice through Redux selectors. There is no `PredictController.placeOrder` proxy — hooks talk to `TradingService` directly.

`TradingService` state is declared with `StateMetadata` per field. Uncommitted preview/input state is `persist: false`; an expired preview is safely discarded after interruption. Once submission commits, the backend Venue Operation is durable. Mobile may persist only its non-secret operation reference so it can resume/reconcile instead of submitting again.

### State machine ownership

The order lifecycle is modeled inside `TradingService`, not in hooks or screens. Transitions happen through `this.update((state) => { ... })` so the state machine state is observable via Redux subscriptions.

State is a **discriminated union by status**, not a product type of nullables. Each variant carries exactly the fields that exist at that step, so illegal combinations like `SUCCESS` without a receipt or `ERROR` without an error code are not representable. The `selectedPayment` token is a **peer slice** alongside the workflow union because payment selection persists across workflow transitions (including SUCCESS and ERROR) and is not tied to any single status.

Statuses (the discriminants):

- `IDLE`
- `PREVIEWING`
- `READY`
- `FUNDING` (only when automatic funding policy is enabled)
- `PLACING_ORDER`
- `SUCCESS`
- `ERROR`

The UI can render the current variant, but it should not be responsible for deciding transitions.

```text
IDLE -> PREVIEWING -> READY -> [optional FUNDING] -> PLACING_ORDER
  ^          |          |                              |
  |          +----------+---------------> ERROR <-----+
  |
  +---------------------- SUCCESS <-------------------+
```

`READY` carries the short-lived `OrderPreview`. `PLACING_ORDER` carries its `previewId`, idempotency key, and any safe backend operation reference.

### Internal responsibilities

`TradingService` hides substantial complexity:

- account-scope and Account Readiness guards,
- rate limiting,
- short-lived preview lifecycle and expiry,
- idempotency-key creation and lost-response reconciliation,
- backend/adapter revalidation at submit,
- optional automatic funding policy through `FundingExecutor`,
- direct semantic calls into `PortfolioReadModelWriter`,
- targeted invalidation after completion,
- Immediate versus Resting Order capability policy,
- analytics at preview, submit, success, and failure boundaries.

Kalshi v1 uses explicit Deposit before Order. Automatic Deposit-and-Order chaining is deferred; the long-term service may enable it without changing callers.

### Public interface

```typescript
export type TradingStateStatus =
  | 'IDLE'
  | 'PREVIEWING'
  | 'READY'
  | 'FUNDING'
  | 'PLACING_ORDER'
  | 'SUCCESS'
  | 'ERROR';

export interface SelectedPaymentToken {
  tokenAddress: string;
  symbol: string;
}

/**
 * Order workflow state as a discriminated union by status. Each variant carries
 * exactly the fields that exist at that step. Illegal combinations are not
 * representable.
 *
 * The ERROR variant carries `previousState` for recoverable errors so retry can
 * resume from the failed step (READY / FUNDING / PLACING_ORDER) instead
 * of forcing the user back to IDLE. For unrecoverable errors `previousState`
 * is omitted; callers transition back to IDLE.
 */
export type TradingWorkflowState =
  | { status: 'IDLE' }
  | { status: 'PREVIEWING'; scope: PredictAccountScope }
  | { status: 'READY'; scope: PredictAccountScope; preview: OrderPreview }
  | {
      status: 'FUNDING';
      scope: PredictAccountScope;
      preview: OrderPreview;
      fundingOperationId: string;
    }
  | {
      status: 'PLACING_ORDER';
      scope: PredictAccountScope;
      previewId: string;
      idempotencyKey: string;
      operationId?: string;
    }
  | { status: 'SUCCESS'; receipt: OrderReceipt }
  | {
      status: 'ERROR';
      errorCode: PredictErrorCode;
      recoverable: boolean;
      previousState?: Extract<
        TradingWorkflowState,
        { status: 'READY' | 'FUNDING' | 'PLACING_ORDER' }
      >;
    };

export interface TradingServiceState {
  /** Discriminated union by status; see TradingWorkflowState. */
  workflow: TradingWorkflowState;
  /** Peer slice: payment selection persists across workflow transitions. */
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
  // Registered only for a Resting-Order product surface.
  | {
      type: 'PredictTradingService:cancelOrder';
      handler: (params: {
        scope: PredictAccountScope;
        orderId: string;
        idempotencyKey: string;
      }) => Promise<OrderReceipt>;
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

Two earlier draft choices have been retired:

- A loose product type of nullables (`status` plus `activePreview | null`, `lastOrderReceipt | null`, `lastErrorCode | null`) — replaced by the discriminated union above, so illegal states are not representable and consumer hooks stop branching defensively on `status === 'ERROR' && Boolean(orderError)`-style combinations.
- Public `readonly orderState` / `readonly selectedPayment` properties — duplicate ownership against `BaseController`'s state slice. State now lives in one place and is read via Redux selectors.

Transitions use `this.update()` with an exhaustive switch. A retry never repeats a committed write with a fresh identity: `PLACING_ORDER` reconciliation reuses the same idempotency key/operation reference. An expired preview returns to `PREVIEWING`. Unrecoverable failures omit `previousState` and return to `IDLE` after acknowledgement.

### Hidden internals by design

The service may internally require many helpers:

- preview validator
- quote freshness checker
- funding evaluator
- rate limit gate
- order transition reducer
- post-write invalidation planner

Those helpers should remain private because callers do not benefit from depending on them. The public API stays small even if the implementation is sophisticated.

## 7. TransactionService (BaseController) and FundingExecutor (Primitive)

`TransactionService` exposes user-intent Deposit, Withdraw, and optional Claim actions and owns a small Redux projection of safe funding-operation references. `FundingExecutor` performs wallet/confirmation mechanics for a prepared `FundingPlan`. The backend—not Redux or executor memory—remains authoritative for remote operation state.

```
services/transactions/
├── TransactionService.ts
├── FundingExecutor.ts
└── TransactionService.test.ts
```

### Canonical workflow

```text
TransactionService intent(scope, amount, ...)
  -> PredictSessionService.getClient(scope)
  -> client.funding.prepareFunding({ operation, idempotencyKey, ... })
  -> FundingPlan with operationId
  -> user confirmation
  -> FundingExecutor executes wallet action when required
  -> client.funding.commitFunding({ operationId, idempotencyKey, execution })
  -> FundingReceipt
  -> PortfolioReadModelWriter invalidation/reconciliation
```

Preparing may reserve a one-time address or durable preflight record. It must not move funds. A Venue API Withdraw is committed only after explicit confirmation.

### FundingExecutor responsibilities

- validate plan Venue, operation, amount, supported network, canonical asset, recipient format, and expiry against the locally stated intent before wallet confirmation,
- fail closed on any plan/intent mismatch,
- hand typed EVM/Solana wallet requests to app transaction/confirmation infrastructure,
- capture submitted transaction hashes,
- call the account-scoped funding commit with the original operation/idempotency references,
- observe confirmations when product behavior needs them,
- stop local observation and unsubscribe listeners on cancellation/teardown,
- normalize wallet/transport failures into `PredictError`,
- never store backend credentials, KYC data, or authoritative operation state,
- never infer that local teardown cancelled an external operation.

`cancel(operationId)` cancels only local tracking unless the Venue funding capability explicitly exposes a cancellable external operation. It cannot erase an on-chain transfer or committed Venue withdrawal.

### TransactionService responsibilities

- expose only funding operations present in the active Venue capability,
- obtain `PredictClient` from `PredictAccountScope`,
- create/reuse stable backend operation/idempotency keys without treating them as proof of Venue idempotency,
- prepare the plan,
- request explicit user confirmation,
- invoke `FundingExecutor`,
- commit/reconcile through `client.funding`,
- emit user-intent analytics without sensitive values,
- apply operation-specific recovery and error policy,
- update portfolio read models after authoritative milestones.

Kalshi v1 exposes Deposit and Withdraw, not Claim. Polymarket may later expose Claim. Unsupported operations are absent from the product surface; they do not return fake unsupported plans.

### Durability and retry

- Reads and status checks may use bounded retry.
- Repeated local prepare/commit requests reuse the same backend operation/idempotency key; the external Venue call repeats only with verified idempotency or reconciliation semantics.
- The backend stores the operation before calling an irreversible Venue endpoint.
- A wallet transfer whose indication outcome is ambiguous remains visible by `operationId` and transaction hash but is not automatically resubmitted under the current Kalshi spec.
- A lost withdrawal response blocks pending reconciliation; it is not submitted again with either the same or a new key.
- Safe operation references may persist in a focused mobile state projection when cross-screen/app-restart resume requires it.
- Raw plan details, credentials, signatures, OTP, and KYC fields do not persist.
- A Kalshi withdrawal receipt remains `submitted`/`processing` until authoritative completion exists.

### Public state and interfaces

```typescript
export interface FundingOperationProjection {
  operationId: string;
  operation: FundingOperation;
  status: FundingReceiptStatus;
  updatedAt: number;
}

export interface TransactionServiceState {
  operationsByAccount: Record<
    PredictAccountScopeKey,
    FundingOperationProjection[]
  >;
}

export interface TransactionService {
  deposit(
    params: DepositParams & {
      scope: PredictAccountScope;
    },
  ): Promise<FundingReceipt>;
  withdraw(
    params: WithdrawParams & {
      scope: PredictAccountScope;
    },
  ): Promise<FundingReceipt>;
  claim?(
    params: ClaimParams & {
      scope: PredictAccountScope;
    },
  ): Promise<FundingReceipt>;
  resume(params: {
    scope: PredictAccountScope;
    operationId: string;
  }): Promise<FundingReceipt>;
}

export class TransactionService extends BaseController<
  'PredictTransactionService',
  TransactionServiceState,
  PredictTransactionServiceMessenger
> {}

export interface FundingExecutor {
  executePlan(
    plan: FundingPlan,
    opts: {
      idempotencyKey: string;
      reason: 'order_funding' | 'public_action';
      expectedIntent: ExpectedFundingIntent;
    },
  ): Promise<FundingReceipt>;
  cancel(operationId: string): void;
  destroy(): void;
}
```

Only the non-secret operation reference/type/status projection may persist. Its `StateMetadata` is UI-used but excluded from state logs and debug snapshots unless security review explicitly approves it. Amount, destination, transaction payload, signatures, and Venue details are fetched from the authenticated backend when rendering/resuming.

The `reason` is telemetry context only. It never changes safety or idempotency behavior.

### Optional Order funding

`TradingService` may use the same injected `FundingExecutor` for future automatic Order funding, without calling the public `TransactionService.deposit()` action. Kalshi v1 deliberately requires an explicit Deposit first, so this path is not a launch dependency.

`PredictError` shape and codes are owned by [interface-ledger.md](./interface-ledger.md). Lower-level exceptions do not escape the service interface.

## 8. LiveDataService (Runtime Service)

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

export interface LiveSubscriptionObserver<TData> {
  onData(data: TData): void;
  onStatus(status: LiveDataConnectionStatus): void;
}

export interface SubscriptionHandle {
  unsubscribe(): void;
}

export interface LiveDataService {
  subscribe<TData = unknown>(params: {
    channel: SubscriptionChannel;
    params: SubscriptionParams;
    observer: LiveSubscriptionObserver<TData>;
  }): Promise<SubscriptionHandle>;

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

Live updates should refresh the read-model caches rather than being overlaid in UI code. `LiveDataService` normalizes canonical updates and calls the narrow read-model writer interfaces produced by `MarketDataService` and `PortfolioService`; those writers either patch matching query caches or invalidate/refetch when safe patching is not possible.

Patch directly when the update contains a stable identifier and complete enough data to preserve cache correctness. Invalidate and refetch when matching is uncertain, the update is too partial to merge safely, or the affected query set cannot be identified cheaply.

Examples:

- sports `GameUpdate` with `game.id` patches cached `PredictEvent` records whose `game.id` matches the update
- market price updates with canonical market or outcome IDs patch matching price and order-book query entries
- Fill/Order/Position updates patch matching portfolio queries only when `PredictAccountScope` and stable Position/Order identifiers are known
- broad venue status, league, or account updates invalidate the relevant query family instead of guessing

This replaces the legacy `GameCache` overlay pattern. Query cache data should represent the freshest known read model, not a stale venue response plus a separate overlay layer.

`LiveDataService` receives narrow writer interfaces rather than full read-service instances:

```typescript
export interface MarketDataReadModelWriter {
  applyPriceUpdates(updates: MarketPriceUpdate[]): void;
  applyGameUpdate(update: GameUpdate): void;
  invalidateEventFamily(params: { eventId?: string; league?: string }): void;
}

export type PortfolioLiveUpdateWriter = Pick<
  PortfolioReadModelWriter,
  'applyPortfolioUpdate'
>;
```

The read services create these writers and retain cache mutation locality. `LiveDataService` receives `MarketDataReadModelWriter` and the narrowed `PortfolioLiveUpdateWriter`; it does not gain access to read methods, query clients, or unrelated workflow writer methods.

## 9. predictAnalytics (Injected Helper Module)

`predictAnalytics` is **not** a first-class Engine.context service. It is a plain helper module constructed in the composition root and injected by constructor reference into every service that emits analytics. Its surface is one method.

### Why it is a helper, not a service

`predictAnalytics` scores 0/4 on the **helper-vs-service decision rule** in §1.5: it owns no durable state, no observable lifecycle, exposes one logical operation (`track`), and is consumed only inside the feature boundary. So it is a helper, not a service.

The earlier "PredictAnalyticsService" framing paid the full cost of a service (messenger namespace, Engine.context entry, lifecycle, tests) for a surface that is functionally one method. Demoting it to a helper:

- removes a messenger namespace
- removes an Engine.context entry
- removes a separate test surface
- keeps analytics emission as cheap direct calls
- keeps first-class services focused on deep workflow ownership

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
  | 'Predict Submitted Deposit'
  | 'Predict Deposit Prefunded'
  | 'Predict Submitted Withdrawal'
  | 'Predict Claimed Winnings'
  | 'Predict Recorded Settlement'
  | 'Predict Live Data Reconnected';

export interface PredictAnalytics {
  track(
    event: PredictAnalyticsEvent,
    properties: Record<string, unknown>,
  ): void;
}

// Constructed in PredictController.initialize() and injected into each service that emits.
export function createPredictAnalytics(
  deps: PredictAnalyticsDeps,
): PredictAnalytics;
```

Services receive a `PredictAnalytics` reference through constructor injection and call `track()` at meaningful workflow boundaries. Views should rarely emit analytics directly.

## 10. Service Interaction Patterns

Services cooperate, but dependency directions stay disciplined.

### Dependency graph

Typical direct dependencies:

- `PredictController` → instantiates only modules required by the enabled Venue surface
- `MarketDataService` → `VenueAdapterRegistry` for public `marketData` by `venueId`
- `PredictSessionService` → `VenueAdapterRegistry`, authenticated user context, and `AccountReadinessPolicy`
- `PredictSessionService` → account adapter capability for readiness/setup and session-bound `PredictClient`
- `TradingService` → `PredictSessionService`, optional `FundingExecutor`, `PortfolioReadModelWriter`, and `predictAnalytics`
- `PortfolioService` → `PredictSessionService` for account-scoped `client.portfolio`
- `TransactionService` → `PredictSessionService`, `FundingExecutor`, `PortfolioReadModelWriter`, and `predictAnalytics`
- `LiveDataService` → public or account-scoped live adapter capability plus `MarketDataReadModelWriter`, `PortfolioLiveUpdateWriter`, and `predictAnalytics`

`FundingExecutor` is a feature primitive (see §7), not a service: it is shared by `TransactionService` and `TradingService` and not registered on the messenger.

`PredictController` itself is not depended on by any service after construction. Services receive only the dependencies they need through scoped messengers and constructor injection; they do not call back into the composition root.

**Cache mutation is direct.** Cross-service read-model updates flow through **direct semantic method calls** on cache-owning writer interfaces, not loose Service Events or full read-service dependencies. Service Events exist for observation (analytics, optional listeners), not for the system of record.

```text
MarketDataService ──venueId──▶ VenueAdapterRegistry ──▶ adapter.marketData

PortfolioService ─┐
TradingService ───┼──scope──▶ PredictSessionService ──session──▶ PredictClient
TransactionService┤
LiveDataService ──┘

FundingExecutor ◀──────── TransactionService / optional TradingService
TradingService ──order milestones────────▶ PortfolioReadModelWriter
TransactionService ──funding milestones──▶ PortfolioReadModelWriter
LiveDataService ──canonical updates───────▶ MarketData/Portfolio writers
Workflow services ────────────────────────▶ predictAnalytics.track(...)
```

`predictAnalytics` does not depend back on feature services. Venue adapters do not depend upward on services and do not cache sessions that belong to `PredictSessionService`. Read services do not mutate each other's caches; live updates and write workflows call **named methods** on writer interfaces created by the cache owner.

### Constructor injection

Dependencies are provided explicitly during `PredictController.initialize()`. Only the required module set for the enabled surface is constructed. Stateful and Read services receive scoped messengers and safe persisted projections as required; Runtime services receive direct collaborators. `FundingExecutor` and `predictAnalytics` are constructor-injected. No service receives raw backend credentials or KYC payloads.

```typescript
// Direct constructor injection for cache coordination and helpers; messenger actions for cross-feature calls.
export interface TradingServiceDeps {
  messenger: TradingServiceMessenger;
  state?: Partial<TradingServiceState>;
  // Direct references injected at composition time:
  portfolioWriter: PortfolioReadModelWriter; // for onOrderSubmitted/Confirmed/Failed direct calls
  fundingExecutor: FundingExecutor; // shared feature primitive used for order funding
  analytics: PredictAnalytics; // injected helper, not a service
  // Other dependencies still flow through the messenger:
  // PredictSessionService reached via messenger.call('PredictSessionService:getClient', ...)
}
```

Direct constructor references are used for two cases:

1. **Cache coordination** between services in the same bounded context (e.g., `TradingService` → `PortfolioReadModelWriter`). Direct calls give explicit ordering and idempotency without an event bus, while the writer interface keeps the read-service implementation local.
2. **Helper modules and feature primitives** that are not services (e.g., `predictAnalytics`, `FundingExecutor`).

Messenger actions are still used for everything else, especially cross-feature interaction and any call where the receiver is not necessarily in the same bounded context.

Tests for `TradingService` pass stub implementations of `PortfolioReadModelWriter`, `FundingExecutor`, and `PredictAnalytics` instead of trying to stub messenger events. That keeps tests focused on workflow behaviour rather than wiring.

### Service Events: observation only

PredictNext services are first-class Engine messenger clients, but the role of Service Events has been narrowed. **Service Events are for observation, not for the system of record.**

Each service still receives a scoped messenger with an explicit namespace and allow-list:

- actions it registers for external callers, such as `PredictTradingService:placeOrder` or `PredictPortfolioService:getPositions`
- external actions it may call (e.g. transaction-controller actions)
- Service Events it may publish, such as `PredictTradingService:orderSucceeded` (for analytics and optional listeners)
- Service Events it may subscribe to

Service Events still exist for:

- analytics observers
- external feature observers (e.g., a future "you just placed an order" toast in another feature)
- diagnostic/debug subscribers

Service Events **no longer** carry cache mutation responsibility. Where the previous architecture had `PortfolioService` subscribe to `PredictTradingService:orderSubmitted` to patch its cache, the new architecture has `TradingService` call `PortfolioReadModelWriter.onOrderSubmitted(...)` directly. The previous Service Event is still emitted for observers, but it is not the system of record.

#### Service Event ordering and idempotency

Where Service Events do remain (for observers), the following rules apply:

- Events carry a monotonic sequence number per emitting service (`seq`) so subscribers can detect out-of-order delivery.
- Subscribers must be **idempotent** — receiving the same event twice must not cause double-counted analytics, duplicate UI toasts, or duplicated effects.
- During teardown (`PredictController.destroy()`), the composition root drops Service Events emitted between start of teardown and completion of `destroy()`. Subscribers that need to flush state must do so before `destroy()` returns.

The canonical Service Event names and minimum payloads are owned by [interface-ledger.md](./interface-ledger.md).

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
