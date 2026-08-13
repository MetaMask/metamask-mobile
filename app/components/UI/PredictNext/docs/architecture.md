# PredictNext Architecture

PredictNext is a Kalshi-first replacement architecture developed beside, not inside, the legacy Polymarket implementation. This document records stable boundaries and invariants. It does not prescribe modules that no active vertical slice needs.

The Kalshi ADR set is currently proposed in [MetaMask/decisions PR #241](https://github.com/MetaMask/decisions/pull/241). Its topology and security recommendations are working direction until accepted. Jira owns delivery scope; [`../CONTEXT.md`](../CONTEXT.md) owns domain language.

## Scope and delivery

```text
Legacy lane
Existing Predict UI -> legacy PredictController -> PolymarketProvider -> Polymarket

New lane
Kalshi product surface
  -> PredictNext React integration
    -> PredictNext product services
      -> Kalshi remote Venue adapter
        -> MetaMask Predict backend
          -> Kalshi
```

The lanes remain independent during Kalshi delivery. A Kalshi rollback must not alter Polymarket. Polymarket migration begins only through explicit later work and uses seams proven in production by Kalshi.

Development proceeds in end-to-end vertical slices. A slice introduces only the types, adapter capability, service behavior, React integration, and UI it requires. The first read-only slice does not need account, portfolio, trading, funding, live-data, or compatibility modules.

## Principles

### Deep modules, small interfaces

Operational complexity belongs below the UI:

- adapters translate protocol and transport details,
- services own caching and workflows,
- hooks connect React to one service operation,
- UI renders canonical state and expresses intent.

Do not add a forwarding layer that only repeats another module's interface. Do not add a generic abstraction until at least two concrete consumers prove it.

### Canonical domain above Venue protocols

Product-facing modules use the language in [`../CONTEXT.md`](../CONTEXT.md): Event, Market, Outcome, Order, Position, Predict User, Funding Wallet, and Venue Account. Kalshi DTO names and protocol mechanics remain inside the adapter/backend boundary.

Every root Event, query, route, and operation is Venue-qualified. Nested Markets and Outcomes carry their own opaque identifiers and inherit Venue and parent scope through containment; raw Venue identifiers are not globally unique.

### Identity is not a wallet

PredictNext separates:

- **Predict User** — the authenticated person,
- **Funding Wallet** — the selected MetaMask account for wallet-side execution,
- **Venue Account** — the account holding Balance and Positions at a Venue.

A wallet can be an operation parameter but is not authorization. The backend derives the authoritative Predict User from authenticated MetaMask identity.

### Capabilities are structural

A Venue exposes only supported capability modules. Unsupported operations are absent rather than present as methods that throw. Product metadata may describe capabilities for rendering, but tests must keep it consistent with the adapter's actual structure.

## Layers

### 1. Venue adapters

A Venue adapter is the translation boundary for one Venue. Capabilities are grouped by independently varying product concerns:

- `marketData` — public Event, Market, Outcome, status, and price reads,
- `account` — Account Readiness and optional Account Setup,
- `portfolio` — Balance, Position, Fill/Activity, and optional open Order reads,
- `trading` — Order Preview and submission; optional Resting Order operations,
- optional `funding`,
- optional `liveData`.

Public market data is Venue-scoped. Account capabilities are bound to authenticated account context without exposing credentials or sessions to product modules.

Adapters call a Venue or the MetaMask Predict backend, validate and map responses, and prepare protocol-specific artifacts. They do not own UI state, product workflows, cache policy, analytics, or blind write retry.

See [`venue-adapters.md`](./venue-adapters.md).

### 2. Product services

A service exists when a vertical slice needs a deep module for shared behavior. The first Kalshi-only read slice receives its `marketData` capability directly from the composition root; add a Venue registry only when runtime resolution among multiple Venues is required. Depending on the concern, a service may own:

- server-read caching and request deduplication,
- bounded read retry,
- Account Readiness or workflow projections,
- prepare/confirm/commit/reconcile orchestration,
- direct, semantic cache updates after writes,
- lifecycle such as subscriptions.

Use repository controller and data-service primitives where they fit. Do not create the complete destination service inventory before concrete slices require it.

A composition root may build the enabled graph and own initialization/teardown. It must remain stateless, expose no same-name workflow proxies, and stay off read/write hot paths.

### 3. React integration

A query hook triggers one Venue-qualified query. A component needing only Balance must not also fetch Positions or Activity.

Imperative hooks wrap service-owned workflows but do not recreate state machines, retry rules, or reconciliation. View-local presentation state remains local to React.

### 4. Product UI

UI uses the MetaMask design system first and may reuse existing venue-neutral presentation. It consumes canonical models and user-meaningful states, not Venue DTOs, credentials, transport errors, or protocol steps.

Reusable primitives, widgets, and views are extracted when real callers prove reuse. The architecture does not require a complete three-tier UI scaffold before implementation.

## Data flows

### Public read

```text
View
  -> one query hook(venueId, params)
    -> market-data service
      -> injected Kalshi marketData capability
        -> MetaMask Predict backend
          -> Kalshi market API
```

Properties:

- `venueId` is explicit and part of every cache key,
- no selected wallet, bearer token, or account session is required,
- Event list and detail responses include the initial Outcome Bid Price and Ask Price snapshot,
- transport and DTO normalization stay below the service,
- responses are runtime-validated and unknown fields are discarded,
- the service alone owns response caching, deduplication, and bounded retry for safe reads.

### Account-scoped read

```text
View
  -> account query hook(scope)
    -> account/portfolio service
      -> session-bound Predict client
        -> Kalshi remote adapter
          -> authenticated backend route
```

The mobile scope selects local state and intent. The backend independently derives and authorizes the Predict User from authentication.

### Financial write

```text
View expresses intent
  -> workflow service prepares operation
    -> adapter/backend returns opaque plan or preview + expiry
      -> UI shows exact user confirmation
        -> service commits stable operation identity
          -> backend performs/reconciles Venue operation
            -> service refreshes canonical read models
```

Rules:

- preparation does not move funds or place an Order,
- the client validates prepared details against local intent before signing or confirmation,
- commit uses an opaque server-issued reference rather than a mutable client echo,
- writes retry only with Venue-verified idempotency or lookup semantics,
- ambiguous results remain observable and reconcile or block safely,
- durable remote operation state lives on the backend; mobile persists only safe references needed to resume observation.

## State ownership

Choose state by lifetime and authority:

| State                                               | Owner                                         |
| --------------------------------------------------- | --------------------------------------------- |
| Server read models                                  | Shared query/data-service cache               |
| Cross-screen workflow projection                    | The service/controller that owns the workflow |
| Durable remote setup/financial operation            | MetaMask Predict backend                      |
| Transport, retry, in-flight, subscription internals | Private service fields                        |
| Form input and visual interaction                   | React local state                             |

Credentials, bearer tokens, OTPs, raw Venue sessions, PII/KYC values, and transfer-authorization material are never Redux or persisted product state. Cache/query keys must contain no sensitive identity or payload data.

## Failure boundaries

- Invalid auth, account scope, response shape, amount, recipient, network, asset, or expiry fails closed.
- Reads may use bounded retry and circuit breaking.
- Writes must not be blindly retried.
- UI normally renders empty, unavailable, action-failed, or degraded states rather than raw transport errors.
- Required security/write modules fail feature bootstrap closed; optional reads may degrade only when policy explicitly permits it.
- Kalshi feature flags and kill switches do not replace backend authorization or eligibility enforcement.

## Testing boundary

Each vertical slice leaves the smallest meaningful coverage at its deep interfaces:

- runtime parser tests against synthetic canonical values,
- adapter transformation tests against sanitized Venue payloads,
- service tests for retry, state transitions, and reconciliation,
- component-view tests for user-visible behavior,
- explicit authorization, redaction, duplicate, lost-response, and restart tests for sensitive/write flows.

Follow the repository's canonical unit, component-view, and E2E testing guides. Add Predict-specific test documentation only when a repeated local convention emerges.

## Module boundary

The feature root eventually exports only stable product-facing views, selected reusable UI, hooks, selectors, domain types, and errors. Services, concrete adapters, backend DTOs, sessions, query descriptors, and future compatibility code remain internal.

Do not create a full entrypoint allowlist before implementations exist. Code and tests define the implemented public surface; documentation is updated as stable callers appear.
