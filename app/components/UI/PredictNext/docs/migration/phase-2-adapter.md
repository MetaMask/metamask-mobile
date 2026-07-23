# Phase 2: Polymarket Capability Adapters and Legacy Delegation

> **Track status:** post-Kalshi Polymarket strangler work. This phase is not a Kalshi launch dependency.

## Goal

Move Polymarket protocol behavior behind the capability-grouped `VenueAdapter` one capability at a time, while the legacy provider/controller/UI remain stable.

The target is not one new monolithic `PolymarketAdapter.ts`. Use focused capability modules behind one registered top-level adapter:

```text
adapters/polymarket/
├── PolymarketAdapter.ts          # composes capabilities
├── market-data/
├── account/
├── portfolio/
├── trading/
├── funding/
├── live-data/
├── dto/
└── mappers/
```

## Preconditions

- the relevant shared interface has production evidence from Kalshi or a reviewed Polymarket need,
- temporary compat for the selected capability exists and is tested,
- current behavior has characterization coverage,
- delegation has a feature flag/rollback point.

## Responsibility Rules

### Polymarket capability adapters own

- Gamma/CLOB/data/account protocol calls,
- CLOB/session/signing details,
- Safe/deposit-wallet protocol context below the account seam,
- Venue DTO normalization,
- amount/raw-unit conversion,
- prepared Order/Funding artifacts,
- typed live transport normalization.

### PredictSessionService owns

- `PredictAccountScope`,
- wallet-scoped Venue Session cache/invalidation,
- session-bound Predict Client creation,
- Account Readiness and Account Setup projection,
- signer lookup through app infrastructure.

### Product services own

- read cache policy,
- Order workflow and idempotency,
- optional automatic funding policy,
- funding confirmation/commit/reconciliation,
- optimistic read-model coordination,
- live subscription lifecycle,
- analytics.

### Compatibility owns temporarily

- canonical ↔ legacy names/shapes,
- legacy editable transaction-template behavior,
- old method names and return types.

## Recommended Capability Order

### 1. Public market data

Implement/delegate:

- Event list/detail,
- prices and history,
- then optional search/carousel/series/crypto reads as product surfaces need them.

Properties:

- explicit `venueId`,
- no account session for public reads,
- canonical Event/Market/Outcome mapping,
- legacy mapping only at the old seam,
- shadow/parity comparison where useful.

### 2. Portfolio

Implement/delegate:

- Balance,
- Positions,
- Activity,
- optional unrealized PnL/open Orders.

Use `PredictAccountScope`. Keep wallet/Safe/deposit-wallet internals in session/adapter context. Activity maps executions/Claims/Settlements accurately rather than inferring them from wrong source records.

### 3. Trading

Implement:

- short-lived preview with `previewId` and expiry,
- idempotent submit,
- Resting Order operations only if the product exposes them,
- stable canonical receipts.

The legacy provider may keep workflow/rate-limit/optimistic behavior until `TradingService` takes ownership.

### 4. Funding and Claim

Implement prepared, amount-specific canonical Funding Plans:

- Deposit,
- Withdraw,
- manual Claim.

Preparing never moves funds. Legacy editable templates remain in a migration adapter until confirmation flows migrate. Transaction lifecycle hooks stay outside the Venue protocol mapper.

### 5. Live data

Implement only the channels still required:

- market prices,
- order book,
- sports/game,
- crypto reference feeds,
- account/Fills when applicable.

The adapter normalizes messages; `LiveDataService` owns connection lifecycle and read-model writers own cache mutation.

## Delegation Pattern

```text
legacy method
  -> legacy params mapped to canonical params/scope
  -> new capability service/adapter
  -> canonical result
  -> compat mapper
  -> unchanged legacy result
```

Rules:

- delegate one behavior at a time,
- preserve existing state/events/return shape at the legacy seam,
- no PredictNext module imports legacy implementation helpers,
- use characterization tests rather than copying old structure,
- keep each delegation independently revertible,
- remove legacy code only after parity evidence.

## Kalshi Contract Protection

Polymarket migration must not regress the interfaces proven by Kalshi:

- person identity remains distinct from Funding Wallet,
- public reads remain separate from account sessions,
- Account Setup remains an explicit capability,
- Funding remains prepare/confirm/commit with durable operation references,
- automatic Settlement and manual Claim remain distinct,
- Venue-qualified query/account scope remains mandatory,
- no local credential assumption leaks into remote adapters.

## Acceptance Criteria per Capability

- concrete adapter capability passes protocol/contract tests,
- old callers see unchanged behavior,
- canonical values are Venue-qualified decimal strings,
- Venue Sessions/DTOs do not escape,
- no new Venue-name branch appears in service/hook/UI code,
- account-scoped operations use `PredictAccountScope`,
- writes have idempotency/reconciliation semantics before workflow ownership moves,
- feature flag rollback is verified,
- obsolete legacy implementation/tests are removed only after replacement coverage and production confidence.

## Non-Goals

- no big-bang provider rewrite,
- no mandatory UI migration,
- no one-file adapter target,
- no reconstruction of every old helper before its capability moves,
- no weakening of Kalshi remote security/identity contracts.
