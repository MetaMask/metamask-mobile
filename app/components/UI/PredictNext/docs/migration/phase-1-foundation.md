# Phase 1: Remaining Foundation for Polymarket Migration

> **Track status:** this phase belongs primarily to the post-Kalshi Polymarket strangler track. Kalshi implements only the minimum shared foundation required by its active vertical slices. See [kalshi-first.md](./kalshi-first.md).

## Goal

Complete the canonical and compatibility foundation needed to move legacy Polymarket capabilities into PredictNext after the Kalshi-first interfaces have production evidence.

Do not block Kalshi on:

- a full bidirectional legacy mapper,
- every legacy Polymarket field,
- editable zero-amount transaction templates,
- every target hook/view/barrel,
- a complete Polymarket adapter contract.

## Preconditions

- the shared Kalshi-first identity, capability, account-scope, error, funding, and Order contracts have shipped and been reviewed,
- Stage 0 has no open P0 identity, security, or product-topology decision,
- one first Polymarket capability is identified and bounded,
- its current behavior has characterization coverage and a rollback point.

## Shared Foundation Implemented by the Kalshi Track

The active track should already establish:

- domain vocabulary distinguishing Predict User, Funding Wallet, and Venue Account,
- `PredictUserId`, `PredictUserContext`, and Venue-qualified `PredictAccountScope`,
- canonical Event, Market, Outcome, Position, Fill/Activity, Balance, Order Preview/Receipt, Funding Plan/Receipt, Account Readiness, and Account Setup types required by Kalshi,
- capability-grouped `VenueAdapter` contracts,
- public market data separated from account-scoped `PredictClient`,
- remote adapter/mobile-backend contract and runtime schemas,
- canonical errors,
- Venue-qualified query descriptor conventions,
- prepare/confirm/commit and durable Venue Operation semantics,
- module public-boundary convention.

Do not redefine those interfaces in this phase. Amend them only with evidence from the first Polymarket capability.

## Deliverables

- the additional canonical fields required for current Polymarket behavior,
- temporary `compat/` types and mappers created just before first legacy delegation,
- Polymarket-specific optional capability contracts proven by real behavior,
- query descriptors for the first Polymarket capability,
- characterization and mapper tests,
- explicit migration-only adapters for legacy transaction templates where required,
- public exports only for stable caller-facing types/modules.

## Tasks

### 1. Inventory the first capability

Choose one bounded Polymarket capability, preferably public Event reads.

Record:

- legacy method and consumers,
- required canonical fields,
- Venue-specific DTOs and transformations,
- cache/query behavior,
- existing tests that characterize behavior,
- rollback point.

Do not inventory the whole feature as a prerequisite.

### 2. Extend canonical types only as required

Canonical entities remain Venue-neutral and Venue-qualified.

Rules:

- use decimal strings for financial values,
- preserve `venueId`,
- do not put Safe/deposit-wallet mechanics into product account types,
- keep sports/series/crypto fields optional and owned by the capability that needs them,
- prefer typed extension metadata over turning every Polymarket field into a mandatory cross-Venue field,
- update `CONTEXT.md` only for product language, not implementation details.

### 3. Create the temporary compatibility seam

Create `PredictNext/compat/` only now:

```text
compat/
├── types.ts
├── mappers.ts
├── mappers.test.ts
└── index.ts
```

Initial mappers are capability-specific, for example:

```typescript
toLegacyMarket(event: PredictEvent): LegacyPredictMarket;
toCanonicalEvent(market: LegacyPredictMarket): PredictEvent;
```

Rules:

- legacy imports are isolated to `compat/`,
- no PredictNext implementation imports legacy helpers/providers,
- mappings are tested against current fixtures,
- no synthetic data is invented silently,
- migration-only mapping is not exported from the public feature entrypoint,
- remove each mapper when its last legacy consumer moves.

### 4. Add Polymarket capability contracts from evidence

The top-level adapter capability groups are stable. Add optional methods only when the chosen Polymarket capability needs them, such as:

- carousel Events,
- Event search/series,
- crypto reference prices,
- Resting Order/live channels,
- manual Claim funding.

Do not restore one non-optional ~30-method adapter interface.

### 5. Handle legacy transaction templates outside the canonical plan

Legacy confirmation/Transaction Pay may need editable zero-amount EVM templates. That is migration behavior, not a cross-Venue Funding Plan mode.

Keep it in a Polymarket migration adapter or compatibility helper until the transaction flow moves. Canonical `FundingPlan` remains a prepared, amount-specific, side-effect-free plan with a durable operation reference.

### 6. Add descriptors for the selected capability

- public descriptors include `venueId`,
- account descriptors include `PredictAccountScope`,
- descriptor modules own key, family, stale time, and scope,
- no hook/service hand-authors an alternate key.

### 7. Characterize and test

Before delegation:

- lock existing legacy behavior,
- test Venue DTO → canonical mapping,
- test canonical → legacy compatibility mapping,
- test Venue-qualified descriptors,
- verify no cross-Venue cache collisions,
- verify decimal conversion and optional-field behavior.

### 8. Freeze only the reviewed slice

Review and freeze the interface needed by the selected capability. Do not freeze speculative contracts for later Polymarket writes or UI.

## Files Created as Needed

```text
PredictNext/
├── compat/                       # temporary, created at first delegation
├── adapters/polymarket/          # capability implementation grows incrementally
├── query-descriptors/            # descriptors for migrated reads
└── types/                        # evidence-based additions
```

## Acceptance Criteria

- shared Kalshi-first identity/capability/write contracts remain intact,
- the chosen Polymarket capability can be represented without Venue branches above its adapter,
- all identifiers/cache keys are Venue-qualified,
- legacy imports exist only in `compat/`,
- financial values remain decimal strings in canonical modules,
- migration-only editable templates do not pollute canonical Funding Plans,
- characterization/replacement tests pass,
- the capability can be delegated and rolled back independently,
- no unrelated capability or full UI work is required.

## Estimated PR Shape

Prefer one reviewable capability foundation/delegation pair over a fixed phase-wide PR count:

1. canonical/adapter/mapper tests for one capability,
2. guarded legacy delegation and parity evidence,
3. cleanup after production confidence.
