# PredictNext Architecture

This document is the entry point for the PredictNext redesign. It describes the target architecture for prediction markets in MetaMask Mobile, the responsibilities of each layer, and the boundaries that keep the system small at the surface and deep underneath.

PredictNext is designed around a canonical prediction-market model:

- `PredictEvent`
- `PredictMarket[]`
- `PredictOutcome[]`

Venue-specific complexity lives below that model. Views, hooks, and most service APIs should speak only in Predict terminology, not in Polymarket or future venue terminology.

Related documents:

- [services.md](./services.md)
- [adapters.md](./adapters.md)
- [hooks.md](./hooks.md)
- [components.md](./components.md)
- [state-management.md](./state-management.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [../CONTEXT.md](../CONTEXT.md)

## 1. Design Principles

### Deep modules, slim interfaces

PredictNext follows the core idea from John Ousterhout's _A Philosophy of Software Design_: modules should be deep, not wide. A good module hides a large amount of complexity behind a small, stable public API.

In the current implementation, the opposite happened:

- the controller owns too many responsibilities
- venue logic leaks upward
- UI hooks duplicate orchestration logic
- complexity is spread across many files instead of buried in a few strong modules

The redesign reverses that.

- `VenueAdapter` is the single canonical venue contract. `PredictClient` is the session-bound view of it that product services hold.
- Venue adapters are narrow stateless translation boundaries.
- Services are deep modules that own orchestration.
- Hooks are mostly thin integration seams.
- Components focus on rendering and user interaction.

The result should be fewer public methods, fewer cross-layer dependencies, and fewer states that UI code must understand.

### Pull complexity downward

PredictNext explicitly pushes operational complexity into the service layer.

Services absorb:

- retry policies
- cache invalidation
- concurrency control
- request deduplication
- optimistic cache patches
- subscription lifecycle
- order state machines
- venue-specific fallbacks
- transaction orchestration

That means higher layers do not coordinate retries, reconcile partial state, or interpret low-level failures. They ask for intent-level operations and receive intent-level results.

### Define errors out of existence

The preferred design is not to expose more errors with better naming. It is to make many errors impossible for callers to experience.

Examples:

- transient HTTP failures are retried inside data services
- repeated WebSocket disconnects are handled by reconnection policy in `LiveDataService`
- deposit-before-order sequencing is hidden inside `TradingService`
- venue-specific transaction failures are normalized into a single Predict error model

The UI should rarely need to reason about raw transport failures. It should primarily render user-meaningful states:

- empty state
- unavailable
- action failed
- degraded

### Different layer, different abstraction

Each layer owns a distinct abstraction and should not borrow another layer's language.

| Layer          | Primary abstraction                        | Should not expose                                             |
| -------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Venue Adapters | Stateless venue translation (one contract) | UI concepts, caching, orchestration, sessions stored as state |
| Services       | Product capabilities and workflows         | Venue DTOs, raw transport details, sessions                   |
| Hooks          | React integration                          | Business workflows duplicated from services                   |
| Components     | Presentation and interaction               | Venue protocols, transaction plumbing                         |

If a component or hook needs to know too much about venue formats, order transitions, cache policy, or transaction building, complexity has leaked upward and the boundary is wrong.

### Domain context

PredictNext uses a shared domain vocabulary documented in [../CONTEXT.md](../CONTEXT.md). All public APIs should prefer Predict terminology over venue terminology.

Core terms include:

- Event
- Market
- Outcome
- Position
- Activity
- Order Preview
- Order Result
- Account Readiness
- Predict Client
- Venue Session
- Price History

This keeps interfaces stable even as venues change. Polymarket and Kalshi may model their APIs differently, but the active `VenueAdapter` translates those differences into the same domain language before the rest of the stack sees them. The session-bound `PredictClient` view services hold is the same shape regardless of which adapter is active.

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
│ Layer 2: Services                                        │
│  • State-owning (BaseController / BaseDataService):      │
│    PredictSessionService, TradingService,                │
│    MarketDataService, PortfolioService                   │
│  • Stateless: TransactionService, LiveDataService,       │
│    AnalyticsService                                      │
│  • Composition root (no state, off hot paths):           │
│    PredictController (initialize/destroy only)           │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ Layer 1: Venue Adapters (single canonical contract)        │
│ PolymarketAdapter, future KalshiAdapter implement          │
│ VenueAdapter. PredictSessionService produces the           │
│ session-bound PredictClient view services hold.            │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│ External APIs (Polymarket APIs, Kalshi APIs)             │
└──────────────────────────────────────────────────────────┘
```

Hooks address services directly through the Engine messenger and Redux selectors. The composition root sits beside the services, not above them — it builds the graph and then steps out of the hot path.

### Layer 1 — Venue Adapters

The venue boundary is defined by a single canonical contract: `VenueAdapter`. Each venue implementation (Polymarket, future Kalshi) implements it as a stateless protocol translator. `PredictSessionService` is the only thing that constructs sessions and binds them; it produces a session-bound view (`PredictClient`) that product services hold. `PredictClient` is a type alias derived from `VenueAdapter` — it is not a separately maintained interface.

Responsibilities (of `VenueAdapter` implementations):

- expose canonical venue capabilities through a stateless contract
- fetch venue data
- transform venue DTOs into canonical domain entities
- build venue-specific transactions or order payloads
- submit venue-specific orders
- open venue-specific live data connections

Non-responsibilities:

- product workflow orchestration
- rate limiting
- optimistic cache patching
- active-order state transitions
- UI state
- analytics
- session caching (sessions are passed in per method; the session service owns lifecycle)

Target shape:

- a single capability-oriented `VenueAdapter` interface grouped by reads, order boundary operations, transaction builders, and live subscriptions
- product services use `PredictSessionService.getClient(ownerAddress, venueId?)` to obtain a `PredictClient` (the session-bound view) and never see `PredictVenueSession`
- venue adapter implementations are stateless; the session is a method parameter, not an instance field

Primary implementations:

- `PolymarketAdapter` — first active `VenueAdapter` implementation
- future `KalshiAdapter` — second `VenueAdapter` implementation
- `PredictSessionService` — owns session lifecycle and produces the session-bound `PredictClient` view

The venue contract is described in [adapters.md](./adapters.md).

### Layer 2 — Services + Controller

The service layer is the center of the redesign.

PredictNext uses seven deep services:

1. `PredictSessionService`
2. `MarketDataService`
3. `PortfolioService`
4. `TradingService`
5. `TransactionService`
6. `LiveDataService`
7. `AnalyticsService`

#### BaseDataService-backed read services

`MarketDataService` and `PortfolioService` extend `@metamask/base-data-service`.

These services are built on TanStack Query at the service level and provide:

- shared cache
- request deduplication
- retry via Cockatiel policy
- circuit breaker behavior
- messenger-based access from React hooks

These services register directly with Engine via messenger. Reads do not flow through a controller intermediary.

#### Plain services for orchestration and writes

`PredictSessionService`, `TradingService`, `TransactionService`, `LiveDataService`, and `AnalyticsService` are plain services with deliberately small public APIs and deep internals. They are still first-class Engine messenger clients: each service registers its own actions and publishes/subscribes to typed Service Events through a scoped messenger.

They own:

- venue auth/session caching
- write workflows
- transaction orchestration
- order state transitions
- cache-relevant Service Events for workflow milestones
- realtime subscription multiplexing
- analytics event formatting and batching

#### PredictController as composition root

`PredictController` is a stateless composition root with exactly two public methods (`initialize`, `destroy`). Its only job is to instantiate and wire the service graph during feature bootstrap. It does not expose write operations, does not own Redux state, and is not on any hot path.

Its role is to:

- instantiate state-owning services (`PredictSessionService`, `TradingService`, `MarketDataService`, `PortfolioService`) and stateless services (`TransactionService`, `LiveDataService`, `AnalyticsService`) in the correct order
- pass each service a scoped messenger and any persisted state slice it needs
- coordinate feature lifecycle for enable/disable, account switch, sign-out, and teardown

Its role is not to:

- expose `placeOrder`, `deposit`, `withdraw`, `claim`, `subscribe`, or any other write proxy
- own a Redux state slice of its own
- serve as the read path for queries
- mediate Service Events between specialized services
- know venue-specific rules

Hooks call services directly — `messenger.call('TradingService:placeOrder', ...)` for writes, `useSelector(selectActiveOrder)` reading `state.engine.backgroundState.TradingService` for state subscriptions, and `useQuery` for reads. `PredictController` does not appear in any of these paths.

See [services.md](./services.md) for detail.

### Layer 3 — Hooks

Hooks provide React-friendly access to the service layer while preserving service ownership of business complexity.

Hooks are organized by domain in co-located folders with barrel exports:

- `hooks/events/` — `useFeaturedEvents`, `useEventList`, `useEventSearch`, `useEventDetail`, `usePriceHistory`, `usePrices`
- `hooks/portfolio/` — `usePositions`, `useBalance`, `useActivity`, `usePnL`
- `hooks/trading/` — `useTrading`
- `hooks/transactions/` — `useTransactions`
- `hooks/live-data/` — `useLiveData`
- `hooks/navigation/` — `usePredictNavigation`
- `hooks/guard/` — `usePredictGuard`

#### Granular query hooks

Event and portfolio hooks are granular — each hook triggers exactly one `useQuery` or `useInfiniteQuery` call from `@metamask/react-data-query`. This means a component that only needs the balance does not trigger position, activity, or P&L queries. The actual read logic lives in BaseDataService-backed services via messenger.

#### Deep imperative hooks

`useTrading`, `useTransactions`, and `useLiveData` remain deep because they wrap imperative service operations and lifecycle concerns (order state machines, transaction orchestration, WebSocket subscriptions).

#### Navigation and guard hooks

`usePredictNavigation` and `usePredictGuard` isolate routing and eligibility concerns from views.

#### View-local hooks

Any view-specific derived state should live in thin local hooks colocated with the view. These hooks may combine service data with presentation needs, but they must not recreate service orchestration.

See [hooks.md](./hooks.md) for detail.

### Layer 4 — Product UI modules

Product UI modules are organized into three tiers with one top-level folder per tier: `components/` for primitives, `widgets/` for composed product sections, and `views/` for route-level surfaces. Top-level does not mean public; exports still flow through the package public API.

#### Tier 1: Predict design system primitives

Roughly seven reusable, compound primitives form the UI vocabulary of PredictNext:

- `EventCard`
- `OutcomeButton`
- `PositionCard`
- `PriceDisplay`
- `Scoreboard`
- `Chart`
- `Skeleton`

These should feel like product-specific design system building blocks: composable, visually consistent, and free of venue logic.

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
PredictHome → useEventList(params) → useInfiniteQuery({ queryKey: ['PredictMarketData:getEvents', params] })
                                    ↕ (messenger bridge)
                          MarketDataService.getEvents() → this.fetchQuery() → PredictSessionService.getClient(ownerAddress) → PredictClient.fetchEvents() → PolymarketAdapter → Polymarket Gamma API
```

Key properties of this flow:

- the UI does not know which venue is serving data
- query keys are stable, explicit contracts
- caching and retries happen below React
- read operations never route through `PredictController`

### Writing data: place order

```text
OrderScreen → useTrading.placeOrder(params)
                → messenger.call('TradingService:placeOrder', params)
                    → TradingService.placeOrder(params)
                        → this.update() → [state machine: PREVIEW → DEPOSITING → PLACING → SUCCESS]
                        → messenger.call('PredictSessionService:getClient', ownerAddress)
                        → PredictClient.getOrderPreview()
                        → messenger.call('TransactionService:deposit', ...) (if needed)
                        → PredictClient.submitOrder()
```

Key properties of this flow:

- the view expresses intent, not protocol steps
- the hook addresses `TradingService` directly through the Engine messenger; `PredictController` is not on the path
- the state machine is implemented through `this.update()` on the `BaseController` state slice, so subscribers re-render reactively from Redux
- order sequencing is buried in `TradingService`
- funding requirements are hidden from the caller
- order preview is a venue quote/read, not a product workflow
- venue-specific order submission payloads are hidden in `PredictClient`
- `PredictClient.submitOrder()` is raw venue submission, not a deposit-then-order workflow
- cache-relevant order lifecycle milestones are emitted as Service Events so read services can patch or invalidate their own caches

### Real-time data: live prices and game updates

```text
Venue stream → PredictClient.createSubscription()
              → LiveDataService normalizes + fans out update
                ├─ MarketDataService patches matching query caches
                ├─ PortfolioService patches or invalidates matching query caches
                └─ optional direct subscribers receive the same canonical update
                      → UI re-renders from updated query cache
```

Key properties of this flow:

- channel subscription is product-level and typed at the hook/service boundary
- socket ownership lives entirely in `LiveDataService`
- reconnection, multiplexing, and channel fan-out are internal service concerns
- read services own cache mutation; live updates are write-through updates into the BaseDataService/TanStack Query caches
- UI should not combine stale query results with separate overlay state
- workflow services communicate cache-relevant changes through typed Service Events rather than mutating each other's caches directly

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

### Service-owned Redux state via BaseController

State-owning services extend `BaseController` and own their own slices of `state.engine.backgroundState`. There is no shared `PredictController` Redux slice; each service is the only writer for its own slice, declared with field-level `StateMetadata` so persistence, debug-snapshot inclusion, and UI sync are tuned per concern.

Use this for:

- active order workflow state (TradingService): status, active preview, last result, last error, selected payment token
- venue session-derived UI state (PredictSessionService): account readiness summary, current account context

Why it belongs here:

- needs cross-component reactivity (multiple views observe order status, multiple hooks observe readiness)
- the owning service is the only writer; the rest of the system reads through selectors
- field-level metadata lets each service mark workflow state `persist: false` while keeping durable identifiers `persist: true`
- debug snapshots automatically include the state, which is valuable for diagnosing stuck orders

Most workflow state is `persist: false`. If the app crashes mid-order, the user starts again at preview; that is acceptable product behavior and avoids storing volatile in-flight state.

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

Services should be tested by mocking only their immediate venue seam (`PredictSessionService` returning a mock `PredictClient`) and verifying behavior of the deep module:

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

By concentrating complexity in deep modules and shrinking API surface area, the test suite should need far less scaffolding than the current system. The target is roughly an 85% to 90% reduction from the current 87K lines of test code while keeping or improving confidence.

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
│                               │ • Venue DTOs                │
└───────────────────────────────┴────────────────────────────────┘
```

### Public API

The package-level `index.ts` should export only the stable product surface:

- views
- selected primitives
- public hooks
- public types
- selectors

Illustrative boundary:

```typescript
export type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
  OrderPreview,
  OrderResult,
} from './types';

export {
  PredictHome,
  EventDetails,
  OrderScreen,
  TransactionsView,
} from './views';
export { EventCard, PositionCard, OutcomeButton } from './components';
// Event query hooks
export {
  useFeaturedEvents,
  useEventList,
  useEventSearch,
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
// Imperative hooks
export { useTrading } from './hooks/trading';
export { useTransactions } from './hooks/transactions';
export { useLiveData } from './hooks/live-data';
export { usePredictNavigation } from './hooks/navigation';
export { usePredictGuard } from './hooks/guard';
export {
  selectPredictActiveOrder,
  selectPredictSelectedPaymentToken,
} from './selectors';
```

### Internal modules

The following stay internal and are not exported from the feature root:

- services
- clients
- adapters
- widgets
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
- [services.md](./services.md) — service layer design, controller surface, and service interaction patterns.
- [adapters.md](./adapters.md) — PredictClient contract, venue adapter responsibilities, and extension model.
- [hooks.md](./hooks.md) — React integration layer, query hooks, imperative hooks, and local derived-state guidance.
- [components.md](./components.md) — UI composition model, primitive/component tiers, and rendering boundaries.
- [state-management.md](./state-management.md) — where each category of state lives and why.
- [error-handling.md](./error-handling.md) — Predict error model, recovery behavior, and UI error states.
- [testing.md](./testing.md) — recommended testing pyramid and scope boundaries for adapters, services, and views.
- [../CONTEXT.md](../CONTEXT.md) — domain vocabulary for Events, Markets, Outcomes, Positions, Orders, and account readiness.
