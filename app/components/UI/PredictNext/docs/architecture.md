# PredictNext Architecture

This document is the entry point for the PredictNext redesign. It describes the target architecture for prediction markets in MetaMask Mobile, the responsibilities of each layer, and the boundaries that keep the system small at the surface and deep underneath.

PredictNext is designed around a canonical prediction-market model and explicit account scope:

- `PredictEvent`
- `PredictMarket[]`
- `PredictOutcome[]`
- `PredictUserContext`
- `PredictAccountScope`

Venue-specific complexity lives below that model. Views, hooks, and most service interfaces speak Predict terminology, not Polymarket or Kalshi protocol language. The architecture distinguishes the Predict User, Funding Wallet, and Venue Account; a wallet address is not treated as person identity.

Governing decisions: the contested topology, security, identity, KYC, funding, and recovery decisions are recorded in the Kalshi ADR set (see [README — Governing ADRs](../README.md#governing-adrs)). These docs are non-normative relative to those ADRs and must not contradict them.

Related documents:

- [interface-ledger.md](./interface-ledger.md) — stable interface facts; if another doc disagrees on code-level interface shapes, the ledger wins (within the bounds set by the ADRs)
- [services.md](./services.md)
- [adapters.md](./adapters.md)
- [hooks.md](./hooks.md)
- [components.md](./components.md)
- [state-management.md](./state-management.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [migration/README.md](./migration/README.md)
- [migration/kalshi-first.md](./migration/kalshi-first.md)
- [../CONTEXT.md](../CONTEXT.md)

## 0. Delivery Architecture

The target architecture is implemented through two tracks:

1. **Kalshi-first vertical delivery (active):** build only the modules needed by Setup → Deposit → Balance, then trading/portfolio/withdraw. Kalshi account operations are remote through the owned backend. Legacy Polymarket remains unchanged. Venue selection defaults from geolocation (US → Kalshi, rest-of-world → Polymarket); an ineligible venue is read-only (browse works, actions blocked), with action eligibility enforced server-side.
2. **Polymarket strangling (later):** move public reads, portfolio, trading, funding/Claim, live data, and UI capability by capability through the proven seams.

The six-service inventory and three-tier UI are a destination, not a Kalshi launch checklist. Generic remote signing intents, live data, multi-Venue aggregation, full legacy compat, and full UI replacement are deferred until concrete product requirements need them.

## 1. Design Principles

### Deep modules, slim interfaces

PredictNext follows the core idea from John Ousterhout's _A Philosophy of Software Design_: modules should be deep, not wide. A good module hides a large amount of complexity behind a small, stable public API.

In the current implementation, the opposite happened:

- the controller owns too many responsibilities
- venue logic leaks upward
- UI hooks duplicate orchestration logic
- complexity is spread across many files instead of buried in a few strong modules

The redesign reverses that.

- `VenueAdapter` registers one Venue and exposes focused capability modules for market data, account, portfolio, trading, funding, and live data.
- `PredictClient` is the session-bound view of account-scoped capabilities; public market data does not require a fake session.
- Venue adapters are narrow translation boundaries.
- Services are deep modules that own orchestration.
- Query descriptors are the single read seam for Venue-qualified keys, stale time, account scope, and invalidation families.
- Read-model writer interfaces are the only cache-mutation seam exposed to write/live services.
- Hooks are mostly thin integration seams.
- Components focus on rendering and user interaction.

The result should be fewer public methods, fewer cross-layer dependencies, and fewer states that UI code must understand.

### Pull complexity downward

PredictNext explicitly pushes operational complexity into the service layer.

Services absorb:

- bounded read retry policies
- Venue-verified safe-retry/reconciliation policy
- cache invalidation
- concurrency control
- request deduplication
- optimistic cache patches
- subscription lifecycle
- account readiness policy
- order state machines
- venue-specific fallbacks
- transaction orchestration
- transaction executor lifecycle and teardown

That means higher layers do not coordinate retries, reconcile partial state, or interpret low-level failures. They ask for intent-level operations and receive intent-level results. Reads may retry automatically; a write retries only when the Venue exposes verified idempotency or reconciliation semantics. A backend operation key alone does not make the external side effect idempotent.

### Define errors out of existence

The preferred design is not to expose more errors with better naming. It is to make many errors impossible for callers to experience.

Examples:

- transient read failures are retried inside data services
- repeated WebSocket disconnects are handled by reconnection policy in `LiveDataService`
- optional Deposit-before-Order sequencing is hidden inside `TradingService` when enabled by product policy
- funding and Order commits carry stable backend operation identities and durable Venue Operation references; external retry still requires verified Venue semantics
- venue-specific transaction failures are normalized into a single Predict error model

The UI should rarely need to reason about raw transport failures. It should primarily render user-meaningful states:

- empty state
- unavailable
- action failed
- degraded

### Different layer, different abstraction

Each layer owns a distinct abstraction and should not borrow another layer's language.

| Layer          | Primary abstraction                  | Should not expose                                                  |
| -------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Venue Adapters | Capability-grouped Venue translation | UI concepts, caching, product orchestration, persisted credentials |
| Services       | Product capabilities and workflows   | Venue DTOs, raw transport details, Venue Sessions                  |
| Hooks          | React integration                    | Business workflows duplicated from services                        |
| Components     | Presentation and interaction         | Venue protocols, identity/auth, transaction plumbing               |

If a component or hook needs to know too much about venue formats, order transitions, cache policy, or transaction building, complexity has leaked upward and the boundary is wrong.

### Domain context

PredictNext uses a shared domain vocabulary documented in [../CONTEXT.md](../CONTEXT.md). All public APIs should prefer Predict terminology over venue terminology.

Core terms include:

- Predict User
- Funding Wallet
- Venue Account
- Event
- Market
- Outcome
- Position
- Fill
- Order Preview
- Order Receipt
- Venue Operation
- Account Readiness
- Predict Client
- Venue Session

This keeps interfaces stable even as Venues change. Polymarket and Kalshi may model identity, funding, and Orders differently, but capability adapters translate those differences before higher layers see them. A Predict Client exposes only the account-scoped capabilities supported by its Venue; public market data is resolved by `venueId` through the market-data capability.

## 2. Architecture Layers

PredictNext is organized into four layers, bottom-up.

4-Layer Architecture Overview:

```text
                                 (Responses)
       (Requests)                     ▲
            │                         │
            ▼                         │
┌──────────────────────────────────────────────────────────┐
│ Layer 4: Components (Views → Widgets → Primitives)       │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 3: Hooks (events/, portfolio/, trading/, etc.)     │
└───────────┬───────────────────────────┬──────────────────┘
            │                           │
            │ (Write Path)  (Read Path) │
            ▼                           ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 2: Services + Composition Root                     │
│   (three service shapes; see services.md §1.5)            │
│  • Stateful services (BaseController, own a Redux slice): │
│    PredictSessionService, TradingService, TransactionSvc  │
│  • Read services (BaseDataService, own a query cache):    │
│    MarketDataService, PortfolioService                    │
│  • Runtime services (plain class, transient lifecycle):   │
│    LiveDataService                                        │
│  • Composition root (no state, off hot paths):            │
│    PredictController (initialize/destroy only)            │
│  • Feature primitives & helpers (not services):           │
│    FundingExecutor, predictAnalytics                      │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 1: Venue Adapters                                  │
│  • public marketData by venueId                          │
│  • session-bound account / portfolio / trading           │
│  • optional funding / liveData                           │
│  • local Venue API or remote MetaMask Predict backend    │
└──────────────────────────────────────────────────────────┘
```

Hooks address services directly through the Engine messenger and Redux selectors. The composition root sits beside the services, not above them — it builds the graph and then steps out of the hot path.

### Layer 1 — Venue Adapters

`VenueAdapter` registers one Venue and composes focused capability modules:

- `marketData` for public Venue-scoped Event, Market, Outcome, and price reads,
- `account` for Account Readiness and optional Account Setup,
- `portfolio` for Balance, Position, Fill/Activity, and optional open Order reads,
- `trading` for Order Preview/submission and optional Resting Order operations,
- optional `funding`,
- optional `liveData`.

This shape is based on two concrete Venues. Kalshi does not implement Polymarket-only series, crypto-reference, Claim, or stream methods merely to throw an unsupported error.

`PredictSessionService` constructs account-scoped Venue Sessions from `PredictAccountScope` and returns a session-bound `PredictClient`. Product modules never receive the session. `MarketDataService` resolves the public `marketData` capability directly by `venueId`; it does not require a selected wallet.

Adapter responsibilities:

- call local Venue APIs or the MetaMask Predict backend,
- transform DTOs into canonical domain entities,
- prepare short-lived Order and Funding artifacts,
- commit account-scoped operations through the Venue protocol,
- expose supported live channels.

Adapter non-responsibilities:

- product workflow orchestration,
- cache policy or cross-module cache mutation,
- active-order state transitions,
- UI state or analytics,
- treating wallet addresses as person identity,
- storing credentials or KYC values in mobile state,
- blind retry of writes.

Transitional implementations:

- Kalshi uses `KalshiRemoteAdapter` through the authenticated MetaMask Predict backend.
- Polymarket remains on the legacy production path during Kalshi delivery and later migrates one capability at a time.
- A generic `MetaMaskPredictApiAdapter` is extracted only after a second remote Venue proves shared transport behavior.

The capability contracts are described in [adapters.md](./adapters.md). Remote trust, credential, and operation rules are described in [remote-adapters.md](./remote-adapters.md).

### Layer 2 — Services + Controller

The service layer is the center of the redesign.

The long-term target uses up to six deep services plus an injected analytics helper. The composition root registers only modules required by the enabled vertical surface:

1. `PredictSessionService`
2. `MarketDataService`
3. `PortfolioService`
4. `TradingService`
5. `TransactionService`
6. `LiveDataService`

Plus a `predictAnalytics` helper module constructed by the composition root and injected into services that emit analytics. The helper is **not** a first-class service (no Engine.context entry, no messenger namespace).

#### BaseDataService-backed read services

`MarketDataService` and `PortfolioService` extend `@metamask/base-data-service`.

These services are built on TanStack Query at the service level and provide:

- shared cache
- request deduplication
- retry via Cockatiel policy
- circuit breaker behavior
- messenger-based access from React hooks
- query descriptor consumption for keys, stale time, account scoping, and invalidation families
- narrow read-model writer interfaces for cache patches from write/live services

These services register directly with Engine via messenger. Reads do not flow through a controller intermediary.

#### Stateful and Runtime services for orchestration and writes

`PredictSessionService`, `TradingService`, and `TransactionService` are **Stateful services** (`BaseController`). `TransactionService` stores only safe funding-operation projections so money movement can survive navigation/app restart; the backend remains authoritative. `LiveDataService` is a **Runtime service** with transient connection lifecycle in private fields. Each has a small public interface and registers through a scoped messenger. See [services.md §1.5](./services.md#15-service-shapes).

They own:

- account-scoped Venue Session caching,
- Account Setup projection delegated through the account adapter capability,
- Account Readiness policy,
- prepare/confirm/commit/reconcile write workflows,
- funding orchestration through `TransactionService` and `FundingExecutor`,
- optional future Order funding without routing through the public Deposit action,
- Order state transitions and idempotency,
- direct cache coordination through read-model writers,
- optional realtime subscription multiplexing.

The `predictAnalytics` helper handles analytics event formatting and batching. It is injected into services through constructor references, not reached via messenger actions.

#### PredictController as composition root

`PredictController` is a stateless composition root with exactly two public methods (`initialize`, `destroy`). Its only job is to instantiate and wire the service graph during feature bootstrap. It does not expose write operations, does not own Redux state, and is not on any hot path.

Its role is to:

- instantiate the required subset of Stateful, Read, and Runtime services in dependency order, plus `FundingExecutor` only when funding is enabled
- construct the `predictAnalytics` helper module and inject it into services that emit analytics
- pass each service a scoped messenger and any persisted state slice it needs
- coordinate feature lifecycle for enable/disable, account switch, sign-out, and teardown
- own **transactional, fail-closed bootstrap semantics**: either every required service initialises cleanly or every partially-initialised service is torn down before reporting the feature unavailable (see `services.md` for the full rule)

Its role is not to:

- expose `placeOrder`, `deposit`, `withdraw`, `claim`, `subscribe`, or any other write proxy
- own a Redux state slice of its own
- serve as the read path for queries
- mediate Service Events between specialized services
- know venue-specific rules

Hooks call services directly — `messenger.call('PredictTradingService:placeOrder', ...)` for writes, `useSelector(selectPredictActiveOrder)` reading `state.engine.backgroundState.PredictTradingService` for state subscriptions, and `useQuery` for reads. `PredictController` does not appear in any of these paths.

See [services.md](./services.md) for detail.

### Layer 3 — Hooks

Hooks provide React-friendly access to the service layer while preserving service ownership of business complexity.

Hooks are organized by domain in co-located folders with barrel exports:

- `hooks/events/` — `useEventList`, `useEventDetail`, `usePriceHistory`, `usePrices`; optional featured/search/crypto hooks follow their capabilities
- `hooks/portfolio/` — `usePositions`, `useBalance`, `useActivity`, `usePnL`
- `hooks/trading/` — `useTrading`
- `hooks/transactions/` — `useTransactions`
- optional `hooks/live-data/` — `useLiveData` when a live product capability ships
- `hooks/navigation/` — `usePredictNavigation`
- `hooks/guard/` — `usePredictGuard`

#### Granular query hooks

Event and portfolio hooks are granular — each hook triggers exactly one `useQuery` or `useInfiniteQuery` call from `@metamask/react-data-query`. This means a component that only needs the balance does not trigger position, activity, or P&L queries. The actual read logic lives in BaseDataService-backed services via messenger.

#### Imperative integration hooks

`useTrading`, `useTransactions`, and optional `useLiveData` expose small React-friendly interfaces over deep service workflows. State machines, idempotency, reconciliation, and subscription lifecycle remain in services rather than hooks.

#### Navigation and guard hooks

`usePredictNavigation` and `usePredictGuard` isolate routing and eligibility concerns from views.

#### View-local hooks

Any view-specific derived state should live in thin local hooks colocated with the view. These hooks may combine service data with presentation needs, but they must not recreate service orchestration.

See [hooks.md](./hooks.md) for detail.

### Layer 4 — Product UI modules

Product UI modules may use three tiers: `components/` for proven reusable primitives, `widgets/` for composed sections, and `views/` for routes. This is a long-term organization, not a Kalshi launch file checklist. Vertical slices reuse app design-system and existing venue-neutral presentation where safe. Top-level does not mean public; exports flow through the package entrypoint.

#### Tier 1: Predict design system primitives

Candidate reusable primitives include:

- `EventCard`
- `OutcomeButton`
- `PositionCard`
- `PriceDisplay`
- `Scoreboard`
- `Chart`
- `Skeleton`

Create/extract one when real callers prove reuse. Primitives remain composable, visually consistent, and free of Venue protocol, identity, and workflow logic.

#### Tier 2: Composed widgets

Widgets assemble primitives into reusable product blocks:

- `EventFeed`
- `PortfolioSection`
- `FeaturedCarousel`
- `OrderForm`
- `ActivityList`

#### Tier 3: Views and screens

Views compose widgets and hooks into complete product surfaces:

- `PredictHome`
- `EventDetails`
- `OrderScreen`
- `TransactionsView`

See [components.md](./components.md) for detail.

## 3. Data Flow Diagrams

### Reading data: events list

```text
PredictHome → useEventList(venueId, params)
            → marketDataQueries.getEvents(venueId, params)
            → useInfiniteQuery({ queryKey: descriptor.queryKey })
                                    ↕ (messenger bridge)
                          MarketDataService.getEvents(venueId, params)
                            → this.fetchQuery(descriptor)
                            → VenueAdapterRegistry.get(venueId).marketData.fetchEvents(params)
                            → local Venue API or MetaMask Predict backend
```

Key properties of this flow:

- `venueId` is explicit and part of every market-data cache key,
- public browsing does not require a selected wallet or Venue Session,
- the UI does not know whether the adapter is local or remote,
- query descriptors own keys, stale time, scope, and invalidation families,
- bounded read retry and caching happen below React,
- reads never route through `PredictController`.

### Writing data: place order

```text
OrderScreen → useTrading.placeOrder({ scope, previewId })
                → messenger.call('PredictTradingService:placeOrder', {
                     scope, previewId, idempotencyKey
                   })
                    → TradingService.placeOrder(...)
                        → this.update() → [PREVIEWING → PLACING → SUCCESS | ERROR]
                        → PredictSessionService.getClient(scope)
                        → PredictClient.trading.submitOrder({
                             previewId, idempotencyKey
                           })
                        → adapter/backend revalidates preview + account + limits
                        → portfolioWriter.onOrderConfirmed(...)
```

Key properties of this flow:

- the view expresses intent, not protocol steps,
- `scope` includes Venue and authenticated Predict User context,
- the hook addresses `TradingService` directly; `PredictController` is not on the path,
- the backend/adapter treats `previewId`, not a mutable echoed preview, as authority,
- for Orders, the stable key/client-order semantics make lost-response reconciliation safe where the Venue contract verifies them,
- explicit Deposit-before-Order is the Kalshi v1 policy; optional automatic funding can be added inside `TradingService` later,
- cache-relevant milestones use direct semantic writer calls; Service Events remain observation-only.

### Real-time data: live prices and game updates

```text
VenueAdapter.liveData?.subscribe(...)
  → LiveDataService normalizes incoming update
    ├─ MarketDataReadModelWriter.applyPriceUpdates(updates)
    ├─ PortfolioReadModelWriter.applyPortfolioUpdate(update)
    └─ optional direct subscribers receive the same canonical update
          → UI re-renders from updated query cache
```

Key properties of this flow:

- live data is an optional capability; bounded polling is valid for Kalshi v1,
- channel subscription is product-level and typed,
- socket ownership, reconnection, multiplexing, and fan-out live in `LiveDataService`,
- read services own cache mutation through named writer methods,
- UI does not combine stale query results with a separate overlay,
- Service Events remain for analytics, diagnostics, and optional listeners.

## 4. State Management Overview

PredictNext intentionally uses different state containers for different lifetimes and concerns.

### BaseDataService shared cache

`MarketDataService` and `PortfolioService` hold server-state reads using BaseDataService and TanStack Query semantics.

Use this for:

- events
- event details
- prices
- positions
- account balances
- activity history

Why it belongs here:

- shared across views
- benefits from cache and stale-time control
- naturally query-shaped
- should be deduplicated across consumers
- descriptor-owned key and invalidation policy keeps hooks and services from drifting

### Service-owned Redux state via BaseController

Stateful services (per [services.md §1.5](./services.md#15-service-shapes)) extend `BaseController` and own their own slices of `state.engine.backgroundState`. There is no shared `PredictController` Redux slice; each Stateful service is the only writer for its own slice, declared with field-level `StateMetadata` so persistence, debug-snapshot inclusion, and UI sync are tuned per concern. Read services own a TanStack query cache via `BaseDataService` (no Redux slice); Runtime services own only transient lifecycle state in private fields.

Use this for:

- active Order workflow projection (TradingService): status, preview reference, last result/error, selected payment token,
- Account Readiness and Account Setup projection keyed by `PredictAccountScope` (PredictSessionService),
- safe funding-operation projections/references keyed by account scope (TransactionService).

Why it belongs here:

- multiple views may observe Order, setup, or readiness state,
- the owning service is the only writer; the rest of the system reads through selectors,
- field-level metadata keeps sensitive and volatile fields non-persistent,
- safe operation references may persist when app-restart recovery requires them.

Form inputs, raw Venue Sessions, credentials, OTPs, and KYC values are never persisted. An uncommitted Order Preview may be discarded after a crash. A committed Order, Deposit, or Withdraw is different: its durable backend Venue Operation survives the app, and mobile resumes/reconciles it by operation reference.

### Durable remote operation state

For a remote Venue, durable Account Setup and financial operation state lives on the owned backend. This includes idempotency records, external Venue references, commit outcomes, and reconciliation status. Mobile stores only non-secret references required to resume observation.

App teardown may cancel local listeners; it must not erase or duplicate a committed operation.

### Service internals

Services own transient operational state that should not leak outward.

Examples:

- rate limit windows
- optimistic cache patch bookkeeping
- request in-flight maps
- circuit breaker status
- socket connection lifecycle
- subscription registry

Why it belongs here:

- callers should not coordinate it
- it is implementation detail
- exposing it would widen the public surface unnecessarily

### React local state

Views own purely local presentation state.

Examples:

- keypad input
- scroll position
- tab selection
- search text
- inline form focus

Why it belongs here:

- no other layer benefits from owning it
- it should be destroyed with the view

Reference [state-management.md](./state-management.md).

## 5. Error Handling Overview

The architecture is designed so that most low-level failures are never directly rendered.

### Internal absorption

Services absorb transient failures through:

- retries
- circuit breakers
- reconnection loops
- fallback fetches
- normalized venue errors

### UI-visible categories

Only four categories should commonly surface to the UI:

1. `empty state` — there is simply no relevant content yet
2. `unavailable` — the feature or data source is currently inaccessible
3. `action failed` — a user-initiated operation did not complete
4. `degraded` — partial functionality is still available

### Unified error model

All service-facing failures should normalize to a single `PredictError` model with:

- `code`
- `message`
- `recoverable`
- optional structured metadata

This keeps hooks and components from branching on venue exceptions or transport-specific failures.

Reference [error-handling.md](./error-handling.md).

## 6. Testing Strategy Overview

The redesign reduces test volume by moving complexity into fewer, deeper modules.

### Primary test surfaces

#### Component view tests

Component view tests are the primary surface because they validate meaningful user behavior with real Redux and minimal mocking.

#### Service integration tests

Services should be tested through their immediate seams—a fake public market-data capability or a `PredictSessionService` returning a fake `PredictClient`—and verify behavior of the deep module:

- retries
- state machine transitions
- cache invalidation
- transaction sequencing
- subscription fan-out

#### Adapter integration tests

Adapters should be tested with HTTP interception such as `nock`, validating transformation from venue payloads into canonical Predict entities.

#### Minimal unit tests

Standalone unit tests should be limited to pure utilities with real branching value.

### Outcome target

Concentrating complexity in deep modules should reduce brittle scaffolding, but test-code reduction is not a success metric. Delete legacy tests only after a replacement test at the new interface proves the same behavior. Identity, Account Setup, credentials, Orders, funding, idempotency, app-restart recovery, and PII/secret redaction require explicit risk-based coverage.

Reference [testing.md](./testing.md).

## 7. Module Boundaries

PredictNext should present a deliberate public surface.

Module Boundary:

```text
┌────────────────────────────────────────────────────────────────┐
│ PredictNext Module Boundary                                    │
├───────────────────────────────┬────────────────────────────────┤
│ PUBLIC (index.ts)             │ INTERNAL                       │
├───────────────────────────────┼────────────────────────────────┤
│ • Views                       │ • Services                     │
│ • Selected primitives         │ • Clients / adapters           │
│ • Hooks                       │ • Widgets                      │
│ • Types                       │ • Utils                        │
│ • Selectors                   │ • Constants                    │
│                               │ • Query descriptors            │
│                               │ • Venue DTOs                   │
└───────────────────────────────┴────────────────────────────────┘
```

### Public entrypoint

The package-level `index.ts` exports only the stable product surface defined in [interface-ledger.md](./interface-ledger.md):

- views
- selected primitives
- public hooks
- public types and errors
- public selectors

Illustrative entrypoint:

```typescript
export type {
  PredictUserId,
  PredictWalletAccountId,
  PredictUserContext,
  PredictAccountScope,
  PredictVenueId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
  PredictOrder,
  OrderPreview,
  OrderReceipt,
  TradingWorkflowState,
  SelectedPaymentToken,
  PredictFees,
  PredictBalance,
  PredictPnL,
  PredictEligibility,
  PredictAccountReadinessBlockerCode,
  PredictAccountReadinessBlocker,
  PredictAccountReadiness,
  AccountSetupState,
  FundingPlan,
  FundingReceipt,
  FundingReceiptStatus,
  FundingOperationProjection,
} from './types';
export { PredictError, PredictErrorCode } from './errors';
export type { PredictErrorCategory } from './errors';

export {
  PredictHome,
  EventDetails,
  OrderScreen,
  TransactionsView,
} from './views';
export {
  EventCard,
  createEventDisplayModel,
  PositionCard,
  OutcomeButton,
  PriceDisplay,
} from './components';
// Event query hooks
export {
  useEventList,
  useEventDetail,
  usePriceHistory,
  usePrices,
} from './hooks/events';
// Portfolio query hooks
export {
  usePositions,
  useBalance,
  useActivity,
  usePnL,
} from './hooks/portfolio';
// Imperative and lifecycle hooks
export { useTrading } from './hooks/trading';
export { useTransactions } from './hooks/transactions';
export { usePredictNavigation } from './hooks/navigation';
export { usePredictGuard } from './hooks/guard';
export {
  selectPredictEligibility,
  selectPredictReadiness,
  selectPredictAccountSetup,
  selectPredictFundingOperations,
  selectPredictActiveOrder,
  selectPredictSelectedPaymentToken,
} from './selectors';
// Optional featured/search/crypto, Resting Order, and live-data hooks are exported only when
// their product capability is implemented.
```

### Internal modules

The following stay internal and are not exported from the feature root:

- services
- adapters
- temporary migration `compat/`
- widgets
- query descriptors
- utils
- constants
- venue DTOs
- adapter factories

### Enforcement model

Boundary enforcement is convention-based first:

- only import from explicitly public entrypoints
- avoid relative imports into service internals from UI layers
- keep venue types local to adapters

An ESLint rule can later formalize the boundary, but the architecture should not rely on tooling to make the design understandable.

Terminology should remain aligned with [../CONTEXT.md](../CONTEXT.md).

## 8. Documentation Index

This directory is intended to describe the whole PredictNext feature architecture in layers.

- [architecture.md](./architecture.md) — master architecture overview, layering, state, errors, and boundaries.
- [interface-ledger.md](./interface-ledger.md) — canonical query descriptors, runtime namespaces, Service Events, hooks, selectors, errors, and public entrypoint exports.
- [services.md](./services.md) — service layer design, controller surface, and service interaction patterns.
- [adapters.md](./adapters.md) — capability-grouped Venue adapter and session-bound Predict Client contracts.
- [hooks.md](./hooks.md) — React integration layer, query hooks, imperative hooks, and local derived-state guidance.
- [components.md](./components.md) — UI composition model, primitive/component tiers, and rendering boundaries.
- [state-management.md](./state-management.md) — where each category of state lives and why.
- [error-handling.md](./error-handling.md) — Predict error model, recovery behavior, and UI error states.
- [testing.md](./testing.md) — risk-based test surfaces for contracts, adapters, services, views, security, and recovery.
- [migration/README.md](./migration/README.md) — two-track migration overview.
- [migration/kalshi-first.md](./migration/kalshi-first.md) — active Kalshi vertical-delivery track.
- [../CONTEXT.md](../CONTEXT.md) — canonical product vocabulary.
