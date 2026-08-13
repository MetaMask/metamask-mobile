# PredictNext

PredictNext is the new prediction-markets module for MetaMask Mobile. Its first production implementation is Kalshi. It is developed separately from the legacy `Predict/` implementation, which continues to serve Polymarket until a later, explicit migration.

## Current direction

Build Kalshi in vertical slices, adding only the venue-neutral seams each slice needs:

```text
Product UI
  -> React integration
    -> product services
      -> Kalshi remote Venue adapter
        -> MetaMask Predict backend
          -> Kalshi
```

The first delivery track is defined by [PRED-1109](https://consensyssoftware.atlassian.net/browse/PRED-1109) and its active child epics, beginning with the read-only walking skeleton in [PRED-1158](https://consensyssoftware.atlassian.net/browse/PRED-1158).

### In scope now

- A new Kalshi-only implementation under `PredictNext/`.
- Canonical Predict domain models independent of Kalshi payloads.
- Capability-grouped Venue adapters.
- A remote adapter backed by the MetaMask Predict backend.
- Venue-qualified public reads and account-scoped workflows.
- Kalshi-specific feature flags, kill switches, and rollout controls.
- The minimum UI and services required by each Jira vertical slice.

### Not in scope now

- Rewriting or moving production Polymarket code.
- A Polymarket adapter or compatibility layer.
- Multi-Venue aggregation.
- A generic remote-adapter framework before a second remote Venue proves the need.
- Scaffolding every future service, hook, component tier, or optional capability.
- Rebuilding venue-neutral UI that can safely be reused.

## Load-bearing invariants

- A **Predict User**, **Funding Wallet**, and **Venue Account** are distinct concepts; a wallet address is not proof of person identity.
- Public market data is Venue-scoped and does not require a fake account session.
- Account readiness, portfolio, trading, and funding are scoped to the authenticated Predict User and Venue.
- Kalshi account-scoped operations and credentials remain behind the MetaMask Predict backend.
- The backend derives authorization from authenticated identity, never from client-supplied wallet, email, profile, user, or external Venue identifiers.
- Venue DTOs and protocol details do not escape the adapter boundary.
- Credentials, bearer tokens, OTPs, PII/KYC values, and transfer-authorization material never enter Redux, persisted mobile storage, logs, analytics, traces, or fixtures.
- Financial writes use prepare → user confirmation → commit → reconciliation. A local operation key does not make an external write safe to retry.
- Unsupported capabilities are absent, not stubbed with methods that throw.
- Every slice includes runtime contract validation and risk-appropriate tests.

## Sources of truth

Use this precedence order:

1. **Accepted ADRs** for durable, contested architecture, security, identity, KYC, funding, and recovery decisions.
2. **Jira** for current delivery scope and acceptance criteria.
3. [`CONTEXT.md`](./CONTEXT.md) for canonical domain vocabulary.
4. [`docs/architecture.md`](./docs/architecture.md) for current module boundaries and invariants.
5. **Code and tests** for implemented interface truth.

The Kalshi ADR set is under review in [MetaMask/decisions PR #241](https://github.com/MetaMask/decisions/pull/241). Until accepted, its recommendations are working direction rather than settled contracts. Implementation must call out dependencies on proposed or open decisions.

## Architecture at a glance

PredictNext has four conceptual layers:

1. **Product UI** renders canonical models and expresses user intent.
2. **React integration** connects UI to one query or workflow without owning business orchestration.
3. **Product services** own caching, workflow state, retry/reconciliation policy, and coordination.
4. **Venue adapters** translate canonical operations to a Venue or the MetaMask Predict backend.

These are boundaries, not a requirement to create every possible directory or module up front. See [docs/architecture.md](./docs/architecture.md).

## Documentation

- [`AGENTS.md`](./AGENTS.md) — instructions for coding agents and contributors.
- [`CONTEXT.md`](./CONTEXT.md) — canonical product language.
- [`docs/architecture.md`](./docs/architecture.md) — stable architecture boundaries and data flows.
- [`docs/venue-adapters.md`](./docs/venue-adapters.md) — capability adapter rules.
- [`docs/remote-adapters.md`](./docs/remote-adapters.md) — remote trust and transport rules.
- [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md) — Predict Jira conventions.

## Development rule

Start from the active Jira issue and create only the modules needed to make that slice work end to end. Extend these docs when implementation proves a reusable boundary; do not turn future examples into scaffolding requirements.
