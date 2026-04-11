# PredictNext Architecture

This document is the entry point for the PredictNext redesign. It describes the target architecture for prediction markets in MetaMask Mobile, the responsibilities of each layer, and the boundaries that keep the system small at the surface and deep underneath.

PredictNext is designed around a canonical prediction-market model:

- `PredictEvent`
- `PredictMarket[]`
- `PredictOutcome[]`

Provider-specific complexity lives below that model. Views, hooks, and most service APIs should speak only in Predict terminology, not in Polymarket or future provider terminology.

Related documents:

- [services.md](./services.md)
- [adapters.md](./adapters.md)
- [hooks.md](./hooks.md)
- [components.md](./components.md)
- [state-management.md](./state-management.md)
- [error-handling.md](./error-handling.md)
- [testing.md](./testing.md)
- [../UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)

## 1. Design Principles

### Deep modules, slim interfaces

PredictNext follows the core idea from John Ousterhout's _A Philosophy of Software Design_: modules should be deep, not wide. A good module hides a large amount of complexity behind a small, stable public API.

In the current implementation, the opposite happened:

- the controller owns too many responsibilities
- provider logic leaks upward
- UI hooks duplicate orchestration logic
- complexity is spread across many files instead of buried in a few strong modules

The redesign reverses that.

- Adapters are narrow translation boundaries.
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
- optimistic overlays
- subscription lifecycle
- order state machines
- provider-specific fallbacks
- transaction orchestration

That means higher layers do not coordinate retries, reconcile partial state, or interpret low-level failures. They ask for intent-level operations and receive intent-level results.

### Define errors out of existence

The preferred design is not to expose more errors with better naming. It is to make many errors impossible for callers to experience.

Examples:

- transient HTTP failures are retried inside data services
- repeated WebSocket disconnects are handled by reconnection policy in `LiveDataService`
- deposit-before-order sequencing is hidden inside `TradingService`
- provider-specific transaction failures are normalized into a single Predict error model

The UI should rarely need to reason about raw transport failures. It should primarily render user-meaningful states:

- empty state
- unavailable
- action failed
- degraded

### Different layer, different abstraction

Each layer owns a distinct abstraction and should not borrow another layer's language.

| Layer      | Primary abstraction                | Should not expose                           |
| ---------- | ---------------------------------- | ------------------------------------------- |
| Adapters   | Provider translation               | UI concepts, caching, orchestration         |
| Services   | Product capabilities and workflows | Provider DTOs, raw transport details        |
| Hooks      | React integration                  | Business workflows duplicated from services |
| Components | Presentation and interaction       | Provider protocols, transaction plumbing    |

If a component or hook needs to know too much about provider formats, order transitions, cache policy, or transaction building, complexity has leaked upward and the boundary is wrong.

### DDD ubiquitous language

PredictNext uses a shared domain vocabulary documented in [../UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md). All public APIs should prefer Predict terminology over provider terminology.

Core terms include:

- Event
- Market
- Outcome
- Position
- Activity
- Order Preview
- Order Result
- Account State
- Price History

This keeps interfaces stable even as providers change. Polymarket and Kalshi may model their APIs differently, but adapters translate those differences into the same domain language before the rest of the stack sees them.

## 2. Architecture Layers

PredictNext is organized into four layers, bottom-up.

### Layer 1 — Adapters

Adapters are thin protocol boundaries that translate provider APIs into the canonical Predict model.

Responsibilities:

- fetch provider data
- transform provider DTOs into canonical domain entities
- build provider-specific transactions or order payloads
- open provider-specific live data connections

Non-responsibilities:

- caching
- retries
- rate limiting
- orchestration across multiple operations
- UI state
- analytics

Target shape:

- around 15 methods per adapter
- fetch-and-transform only
- stateless except for lightweight auth/session primitives required by the provider SDK

Primary implementations:

- `PolymarketAdapter`
- future `KalshiAdapter`

The adapter contract is defined in `adapters/types.ts`. See [adapters.md](./adapters.md) for detail.

### Layer 2 — Services + Controller

The service layer is the center of the redesign.

PredictNext uses six deep services:

1. `MarketDataService`
2. `PortfolioService`
3. `TradingService`
4. `TransactionService`
5. `LiveDataService`
6. `AnalyticsService`

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

`TradingService`, `TransactionService`, `LiveDataService`, and `AnalyticsService` are plain services with deliberately small public APIs and deep internals.

They own:

- write workflows
- transaction orchestration
- order state transitions
- realtime subscription multiplexing
- analytics event formatting and batching

#### PredictController as thin orchestrator

`PredictController` becomes a narrow facade with roughly ten public methods, down from the current 60+ method surface.

Its role is to:

- expose write operations into Engine context
- coordinate lifecycle setup and teardown
- delegate immediately to services

Its role is not to:

- implement business logic directly
- serve as the read path for queries
- manage custom caches
- know provider-specific rules in detail

See [services.md](./services.md) for detail.

### Layer 3 — Hooks

Hooks provide React-friendly access to the service layer while preserving service ownership of business complexity.

Target hooks:

- `useEvents`
- `usePortfolio`
- `useTrading`
- `useTransactions`
- `useLiveData`
- `usePredictNavigation`
- `usePredictGuard`

#### Thin query hooks

`useEvents` and `usePortfolio` should be thin wrappers around `useQuery` from `@metamask/react-data-query`. They provide query keys and parameters; the actual read logic lives in BaseDataService-backed services via messenger.

#### Deep imperative hooks

`useTrading`, `useTransactions`, and `useLiveData` remain somewhat deeper because they wrap imperative service operations and lifecycle concerns.

#### Navigation and guard hooks

`usePredictNavigation` and `usePredictGuard` isolate routing and eligibility concerns from views.

#### View-local hooks

Any view-specific derived state should live in thin local hooks colocated with the view. These hooks may combine service data with presentation needs, but they must not recreate service orchestration.

See [hooks.md](./hooks.md) for detail.

### Layer 4 — Components

Components are organized into three tiers.

#### Tier 1: Predict design system primitives

Roughly seven reusable, compound primitives form the UI vocabulary of PredictNext:

- `EventCard`
- `OutcomeButton`
- `PositionCard`
- `PriceDisplay`
- `Scoreboard`
- `Chart`
- `Skeleton`

These should feel like product-specific design system building blocks: composable, visually consistent, and free of provider logic.

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
PredictHome → useEvents → useQuery({ queryKey: ['PredictMarketData:getEvents', params] })
                                    ↕ (messenger bridge)
                          MarketDataService.getEvents() → this.fetchQuery() → PolymarketAdapter.fetchEvents() → Polymarket Gamma API
```

Key properties of this flow:

- the UI does not know which provider is serving data
- query keys are stable, explicit contracts
- caching and retries happen below React
- read operations never route through `PredictController`

### Writing data: place order

```text
OrderScreen → useTrading.placeOrder(params)
                → Engine.context.PredictController.placeOrder(params)
                    → TradingService.placeOrder(params)
                        → [state machine: PREVIEW → DEPOSITING → PLACING → SUCCESS]
                        → TransactionService.deposit() (if needed)
                        → PolymarketAdapter.submitOrder()
```

Key properties of this flow:

- the view expresses intent, not protocol steps
- order sequencing is buried in `TradingService`
- funding requirements are hidden from the caller
- provider-specific order payloads are hidden in the adapter

### Real-time data: live prices

```text
EventDetails → useLiveData.subscribe('marketPrices', { marketId })
                → LiveDataService.subscribe()
                    → PolymarketAdapter.createSubscription()
                        → WebSocket connection
                            → callback → React state update
```

Key properties of this flow:

- channel subscription is generic at the hook boundary
- socket ownership lives entirely in `LiveDataService`
- reconnection, multiplexing, and channel fan-out are internal service concerns

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

### Redux via PredictController state

Controller-managed Redux state is reserved for session state that is not just remote read data.

Use this for:

- active orders in progress
- selected payment tokens
- pending deposits
- session-scoped trading context

Why it belongs here:

- needs to survive navigation
- may combine user intent with service progress
- is not a straightforward cache of remote data

### Service internals

Services own transient operational state that should not leak outward.

Examples:

- rate limit windows
- optimistic overlays
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
- normalized provider errors

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

This keeps hooks and components from branching on provider exceptions or transport-specific failures.

Reference [error-handling.md](./error-handling.md).

## 6. Testing Strategy Overview

The redesign reduces test volume by moving complexity into fewer, deeper modules.

### Primary test surfaces

#### Component view tests

Component view tests are the primary surface because they validate meaningful user behavior with real Redux and minimal mocking.

#### Service integration tests

Services should be tested by mocking only the adapter boundary and verifying behavior of the deep module:

- retries
- state machine transitions
- cache invalidation
- transaction sequencing
- subscription fan-out

#### Adapter integration tests

Adapters should be tested with HTTP interception such as `nock`, validating transformation from provider payloads into canonical Predict entities.

#### Minimal unit tests

Standalone unit tests should be limited to pure utilities with real branching value.

### Outcome target

By concentrating complexity in deep modules and shrinking API surface area, the test suite should need far less scaffolding than the current system. The target is roughly an 85% to 90% reduction from the current 87K lines of test code while keeping or improving confidence.

Reference [testing.md](./testing.md).

## 7. Module Boundaries

PredictNext should present a deliberate public surface.

### Public API

The package-level `index.ts` should export only the stable product surface:

- views
- key components
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
export {
  useEvents,
  usePortfolio,
  useTrading,
  useTransactions,
  useLiveData,
  usePredictNavigation,
  usePredictGuard,
} from './hooks';
export {
  selectPredictActiveOrder,
  selectPredictSelectedPaymentToken,
} from './selectors';
```

### Internal modules

The following stay internal and are not exported from the feature root:

- services
- adapters
- widgets
- utils
- constants
- provider DTOs
- adapter factories

### Enforcement model

Boundary enforcement is convention-based first:

- only import from explicitly public entrypoints
- avoid relative imports into service internals from UI layers
- keep provider types local to adapters

An ESLint rule can later formalize the boundary, but the architecture should not rely on tooling to make the design understandable.

Terminology should remain aligned with [../UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## 8. Documentation Index

This directory is intended to describe the whole PredictNext feature architecture in layers.

- [architecture.md](./architecture.md) — master architecture overview, layering, state, errors, and boundaries.
- [services.md](./services.md) — service layer design, controller surface, and service interaction patterns.
- [adapters.md](./adapters.md) — provider adapter contract, provider implementations, and extension model.
- [hooks.md](./hooks.md) — React integration layer, query hooks, imperative hooks, and local derived-state guidance.
- [components.md](./components.md) — UI composition model, primitive/component tiers, and rendering boundaries.
- [state-management.md](./state-management.md) — where each category of state lives and why.
- [error-handling.md](./error-handling.md) — Predict error model, recovery behavior, and UI error states.
- [testing.md](./testing.md) — recommended testing pyramid and scope boundaries for adapters, services, and views.
- [../UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) — domain vocabulary for Events, Markets, Outcomes, Positions, Orders, and account state.
