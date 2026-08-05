# PredictNext

PredictNext is the target prediction-markets module for MetaMask Mobile. It supports Venues with materially different identity, account, funding, order, and settlement models, including legacy Polymarket and remote-first Kalshi.

## Governing ADRs

The contested architecture and delivery decisions for the Kalshi integration are recorded in the Kalshi ADR set in [MetaMask/decisions](https://github.com/MetaMask/decisions) (`decisions/predict/kalshi-*.md`, [PR #241](https://github.com/MetaMask/decisions/pull/241)):

- `kalshi-integration-overview` — topology, Kalshi-first strangler, venue-selection policy
- `kalshi-security-trust-model` — the four binding security invariants
- `kalshi-identity` — Canonical Profile ID as the Kalshi `external_user_id`
- `kalshi-kyc-pii-flow` — Encrypted Passthrough KYC design
- `kalshi-funding-rails` — Base USDC rails and write-safety semantics
- `kalshi-account-recovery` — recovery when the identity chain breaks
- `kalshi-mobile-architecture` — the four contested mobile decisions

Identity platform references for the Canonical Profile ID (cited by the identity ADR): [Authentication API](https://docs.cx.metamask.io/docs/apis/user-services/authentication/) · [Profile Management](https://docs.cx.metamask.io/docs/apis/user-services/authentication/profile-management/) · [Canonical Profile ID](https://docs.cx.metamask.io/docs/apis/user-services/authentication/canonical-profile-id/) (profile pairing, aliasing, election rules).

**Precedence:** the ADRs govern topology, security, identity, KYC, funding, and recovery decisions; these living docs elaborate the detailed design and must not contradict them. The [interface ledger](docs/interface-ledger.md) wins only for code-level interface shapes consistent with the ADRs. The ADRs are currently `Proposed` (in review); where a decision below depends on an open ADR recommendation, it is a working target, not a settled outcome.

## Current Delivery Direction

Kalshi is the active first production slice of PredictNext (per the `kalshi-integration-overview` ADR recommendation, in review).

- Build the minimum venue-neutral modules required by each Kalshi vertical slice.
- Keep Polymarket on the legacy `Predict/` stack during Kalshi delivery.
- Require the MetaMask Predict backend for Kalshi account-scoped operations and credentials.
- Launch Kalshi behind a Venue-specific feature flag and kill switch.
- Port Polymarket through the proven seams capability by capability after Kalshi stabilizes.

The complete seven-phase Polymarket rewrite and full UI replacement are not Kalshi launch prerequisites. See [docs/migration/kalshi-first.md](docs/migration/kalshi-first.md).

### Venue selection and eligibility

Per the parent ADR's venue-selection policy: the client defaults the venue from geolocation (US → Kalshi, rest-of-world → Polymarket on the legacy stack); users may switch venues manually; an ineligible venue is **read-only** — browsing markets and prices works, and only actions (onboarding, trading, funding) are blocked. Eligibility enforcement for actions lives on the backend, independent of client-declared venue, geolocation, or feature flags.

## Architecture Overview

PredictNext uses four layers:

```text
Product UI modules
  -> React integration hooks
    -> deep product services
      -> capability-grouped Venue adapters
```

### Identity and Account Scope

PredictNext separates:

- **Predict User** — the person using Predict,
- **Funding Wallet** — the selected MetaMask wallet for wallet-side execution,
- **Venue Account** — the account holding Balance and Positions at a Venue.

Public market data is Venue-scoped. Account Readiness, portfolio, trading, and funding are scoped by Venue plus authenticated Predict User context. A wallet address is never treated as proof of person identity.

### Venue Adapters

A `VenueAdapter` registers one Venue and exposes focused capability modules:

- `marketData` — public Event/Market/price reads,
- `account` — readiness and optional resumable setup,
- `portfolio` — Balance, Position, Activity, and optional open Orders,
- `trading` — preview/submit and optional Resting Order operations,
- optional `funding`,
- optional `liveData`.

`PredictSessionService` produces a session-bound `PredictClient` for account-scoped capabilities. Public market data does not require a fake account session.

Kalshi uses a remote adapter backed by the MetaMask Predict backend. Polymarket stays on the legacy path until its post-Kalshi migration.

### Services

The long-term target has six deep services in three shapes:

- **Stateful services**: `PredictSessionService`, `TradingService`, `TransactionService`
- **Read services**: `MarketDataService`, `PortfolioService`
- **Runtime services**: `LiveDataService`

`FundingExecutor` and `predictAnalytics` are injected helpers, not first-class services.

The Kalshi-first track creates a service only when a vertical slice needs it. For example, Setup → Deposit → Balance needs session, funding, and minimal portfolio modules but does not need `LiveDataService` or the entire target UI.

### Composition Root

`PredictController` is the eventual stateless composition root. It exposes `initialize` and `destroy`, wires only the modules required by the enabled product surface, and steps off hot paths.

Bootstrap is fail-closed for required write/security modules and may degrade optional read/live capabilities according to documented policy.

### Hooks and Product UI

Hooks stay organized by domain. Query hooks trigger one Venue-qualified query. Imperative hooks wrap service-owned workflows without recreating idempotency, retry, or state transitions.

Product UI modules use primitives → widgets → views as a long-term organization. Kalshi delivery may reuse existing venue-neutral presentation and the app design system; rebuilding every Predict primitive and screen is not a launch prerequisite.

## State and Write Safety

- Server read models live in `BaseDataService` query caches.
- Cross-screen workflow projections live in focused `BaseController` slices.
- Sensitive Venue Sessions, credentials, and KYC inputs never enter Redux.
- Durable Account Setup and financial operation state lives on the owned backend for remote Venues.
- Funding and Orders use prepare → user confirmation → commit → reconciliation.
- Reads may retry with bounded policy; writes retry only with explicit idempotency semantics.

## Target Directory Structure

The structure grows incrementally as vertical slices need it:

```text
PredictNext/
├── README.md
├── CONTEXT.md
├── index.ts
├── docs/
│   ├── architecture.md
│   ├── interface-ledger.md
│   ├── adapters.md
│   ├── remote-adapters.md
│   ├── services.md
│   ├── components.md
│   ├── hooks.md
│   ├── testing.md
│   ├── state-management.md
│   ├── error-handling.md
│   └── migration/
│       ├── README.md
│       ├── kalshi-first.md
│       └── phase-1-*.md ... phase-7-*.md
├── types/
├── errors/
├── query-descriptors/
├── controller/
├── services/
│   ├── predict-session/
│   ├── market-data/
│   ├── portfolio/
│   ├── trading/
│   ├── transactions/
│   ├── live-data/
│   └── analytics/
├── adapters/
│   ├── types.ts
│   ├── kalshi/
│   └── polymarket/              # post-Kalshi migration
├── hooks/
├── components/
├── widgets/
├── views/
├── routes/
├── selectors/
├── constants/
└── utils/
```

`compat/` is created only when the first legacy Polymarket capability delegates into PredictNext. It is temporary and deleted after migration.

## Public Entrypoint

`index.ts` exports only stable views, selected primitives, hooks, selectors, domain types, and errors. Services, adapters, Venue Sessions, backend payloads, query descriptors, and compatibility internals remain private. The allowlist is owned by [docs/interface-ledger.md](docs/interface-ledger.md).

## Design Principles

- Deep modules with small interfaces
- Real seams shaped by concrete Venues
- Venue-qualified data and account state
- Person identity distinct from wallet execution
- Backend-held Venue credentials for remote Venues
- Explicit user confirmation and idempotent writes
- Runtime validation at remote boundaries
- No speculative capability completeness
- Replacement tests before legacy deletion

## Documentation Index

- [Architecture](docs/architecture.md)
- [Interface Ledger](docs/interface-ledger.md)
- [Venue Adapters](docs/adapters.md)
- [Remote Adapters](docs/remote-adapters.md)
- [Services](docs/services.md)
- [State Management](docs/state-management.md)
- [Error Handling](docs/error-handling.md)
- [Hooks](docs/hooks.md)
- [Components](docs/components.md)
- [Testing](docs/testing.md)
- [Migration Overview](docs/migration/README.md)
- [Active Kalshi Track](docs/migration/kalshi-first.md)

## Migration Status

This branch remains documentation/planning work. The active next implementation is Stage 0/1 of the Kalshi-first track: close P0 identity/product/security decisions, correct contracts, rotate POC credentials, and build an authenticated production walking skeleton.

The old phase documents remain useful for the later Polymarket strangler track. They do not block Kalshi.
