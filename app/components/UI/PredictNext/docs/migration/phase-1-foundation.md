# Phase 1: Foundation

## Goal

Establish the canonical data model, ubiquitous language, adapter contract, and shared error primitives that every later PredictNext module depends on.

## Prerequisites

- None.

## Deliverables

- Canonical domain types in `app/components/UI/PredictNext/types/index.ts`
- PredictNext glossary in `app/components/UI/PredictNext/UBIQUITOUS_LANGUAGE.md`
- PredictNext package overview in `app/components/UI/PredictNext/README.md`
- Adapter contract in `app/components/UI/PredictNext/adapters/types.ts`
- Shared error class in `app/components/UI/PredictNext/errors/PredictError.ts`
- PredictNext public barrel exports in `app/components/UI/PredictNext/index.ts` and related subdirectory barrels

## Step-by-Step Tasks

1. Create the canonical domain type module at `app/components/UI/PredictNext/types/index.ts`.
   - Define and document at minimum:
     - `PredictEvent`
     - `PredictMarket`
     - `PredictOutcome`
     - `PredictPosition`
     - `PredictOrder`
     - `ActivityItem`
     - `Balance`
     - `OrderPreview`
     - `OrderResult`
     - `TransactionState`
     - `LivePricePoint`
     - `PriceHistoryPoint`
     - `PredictAccount`
     - `PredictEligibility`
   - Add JSDoc for every exported type explaining the canonical meaning and the old-code equivalent where relevant.
   - Explicitly encode the naming conversion from old `Market/Outcome/OutcomeToken` to new `Event/Market/Outcome` in comments so future migrations do not reintroduce old terminology.

2. Split navigation and feature-flag types into dedicated modules under `PredictNext/types/`.
   - Create `app/components/UI/PredictNext/types/navigation.ts`.
   - Create `app/components/UI/PredictNext/types/flags.ts` if feature flags remain feature-owned.
   - Mirror the useful parts of:
     - `app/components/UI/Predict/types/navigation.ts`
     - `app/components/UI/Predict/types/flags.ts`
   - Rename route params to canonical nouns where that improves clarity, for example `eventId`, `marketId`, `outcomeId`.

3. Define the adapter seam in `app/components/UI/PredictNext/adapters/types.ts`.
   - Export a `PredictAdapter` interface with roughly 15 methods grouped by concern:
     - event reads,
     - portfolio reads,
     - order preview and placement,
     - deposits and withdrawals,
     - live subscriptions,
     - analytics metadata helpers.
   - Include explicit method return types using the new canonical domain types.
   - Add a `ProviderCapabilities` or similar type so later adapters can describe support for deposits, live prices, claims, withdrawals, and proxy-wallet semantics.
   - Keep the interface provider-agnostic so `PolymarketAdapter` and later `KalshiAdapter` can both implement it.

4. Create the shared error model in `app/components/UI/PredictNext/errors/PredictError.ts`.
   - Export `PredictErrorCode` enum values for domain-safe failure categories such as:
     - `EligibilityBlocked`
     - `InsufficientBalance`
     - `OrderPreviewExpired`
     - `OrderPlacementFailed`
     - `DepositFailed`
     - `WithdrawalFailed`
     - `ClaimFailed`
     - `NetworkMismatch`
     - `ProviderUnavailable`
     - `LiveDataDisconnected`
   - Export `PredictError` class with fields such as `code`, `cause`, `recoverable`, `context`, and `displayMessage`.
   - Add constructors/helpers that make downstream code prefer typed errors over string matching.

5. Create barrel exports so later phases import from a stable surface.
   - Update or create:
     - `app/components/UI/PredictNext/index.ts`
     - `app/components/UI/PredictNext/types/index.ts` if split into multiple files
     - `app/components/UI/PredictNext/adapters/index.ts`
     - `app/components/UI/PredictNext/errors/index.ts`
   - Export only contracts and safe primitives; do not expose service internals yet.

6. Cross-check the glossary against the old codebase.
   - Read `app/components/UI/Predict/README.md` and `app/components/UI/Predict/types/index.ts`.
   - Confirm every ambiguous term used there has one canonical replacement in `UBIQUITOUS_LANGUAGE.md`.
   - Ensure the same term is used in type names, comments, and folder names.

7. Add foundational tests.
   - Write `app/components/UI/PredictNext/errors/PredictError.test.ts` if the error class has logic.
   - Write `app/components/UI/PredictNext/adapters/types.test-d.ts` only if the repo already uses type assertion tests; otherwise keep contract verification through compile-time usage in later service tests.
   - Validate barrel export usage from a small smoke test if needed.

8. Freeze the contract before service work starts.
   - Review this phase with owners of controller, hooks, and UI migration work.
   - Do not begin Phase 2 or Phase 6 until the canonical names and adapter methods are agreed.

## Files Created

| File path                                              | Description                                         | Estimated lines |
| ------------------------------------------------------ | --------------------------------------------------- | --------------: |
| `app/components/UI/PredictNext/types/index.ts`         | Canonical domain types and shared value objects     |         220-320 |
| `app/components/UI/PredictNext/types/navigation.ts`    | PredictNext route param types                       |          60-120 |
| `app/components/UI/PredictNext/types/flags.ts`         | Feature-flag types if feature-owned                 |           20-40 |
| `app/components/UI/PredictNext/adapters/types.ts`      | `PredictAdapter` interface and capability types     |         120-180 |
| `app/components/UI/PredictNext/adapters/index.ts`      | Adapter barrel exports                              |            5-15 |
| `app/components/UI/PredictNext/errors/PredictError.ts` | Shared error enum and class                         |          80-140 |
| `app/components/UI/PredictNext/errors/index.ts`        | Error barrel exports                                |            5-10 |
| `app/components/UI/PredictNext/index.ts`               | Public package entry point for foundational exports |           20-40 |

## Files Affected in Old Code

| File path                                       | Expected change                                                 |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `app/components/UI/Predict/types/index.ts`      | None; reference only while mapping old names to canonical names |
| `app/components/UI/Predict/types/navigation.ts` | None; reference only while defining new params                  |
| `app/components/UI/Predict/README.md`           | None; reference only                                            |
| `app/components/UI/Predict/providers/types.ts`  | None during Phase 1                                             |

## Acceptance Criteria

- Every core domain concept has exactly one canonical exported type in `PredictNext/types/`.
- `PredictAdapter` can describe the full scope needed by later read, write, and live-data services.
- `PredictError` eliminates stringly typed error handling for new code.
- `PredictNext/index.ts` exposes a stable foundational API without leaking implementation internals.
- `UBIQUITOUS_LANGUAGE.md` and the exported types use the same terminology.
- No production files outside `PredictNext/` are switched yet.

## Estimated PRs

- 2-3 PRs total.
  1. Types and navigation contracts.
  2. Adapter interface and error model.
  3. Optional cleanup PR for barrels and doc alignment if review scope needs to stay small.
