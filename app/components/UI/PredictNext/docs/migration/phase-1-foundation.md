# Phase 1: Foundation

## Goal

Establish the canonical data model, domain context, `PredictClient` contract, session-service contract, shared error primitives, and bidirectional translation layer that every later PredictNext module depends on.

## Prerequisites

- None.

## Deliverables

- Canonical domain types in `app/components/UI/PredictNext/types/index.ts`
- PredictNext glossary in `app/components/UI/PredictNext/CONTEXT.md`
- PredictNext package overview in `app/components/UI/PredictNext/README.md`
- PredictClient contract in `app/components/UI/PredictNext/clients/types.ts`
- PredictSessionService contract in `app/components/UI/PredictNext/services/predict-session/types.ts`
- Shared error class in `app/components/UI/PredictNext/errors/PredictError.ts`
- Translation layer in `app/components/UI/PredictNext/compat/`
- PredictNext public barrel exports in `app/components/UI/PredictNext/index.ts` and related subdirectory barrels

## Step-by-Step Tasks

1. Create the canonical domain type module at `app/components/UI/PredictNext/types/index.ts`.
   - Define and document at minimum:
     - `PredictEvent` — legacy equivalent: `PredictMarket`
     - `PredictMarket` — legacy equivalent: `PredictOutcome`
     - `PredictOutcome` — legacy equivalent: `PredictOutcomeToken`
     - `PredictMarketGroup` — legacy equivalent: `PredictOutcomeGroup`
     - `PredictGame` — optional sports metadata on an Event
     - `PredictTeam` — team metadata used inside `PredictGame`
     - `PredictPosition`
     - `PredictOrder`
     - `ActivityItem`
     - `PredictBalance` — settlement-currency decimal string balance amount
     - `PredictVenueInfo` — active venue metadata, settlement currency metadata, and venue capabilities
     - `OrderPreview`
     - `OrderReceipt` / `OrderResult`
     - `TransactionBatch`
     - `TransactionState`
     - `LivePricePoint`
     - `PriceHistoryPoint`
     - `CryptoPricePoint`
     - `ReferencePrice`
     - `PredictAccountReadiness` — product-level venue/account readiness (`canTrade`, status, blockers), not venue account internals, feature flags, or app-wide network guard state
     - `PredictEligibility`
     - `VenueCapabilities`
   - Add JSDoc for every exported type explaining the canonical meaning and the old-code equivalent where relevant.
   - Explicitly encode the naming conversion from old `Market/Outcome/OutcomeToken` to new `Event/Market/Outcome` in comments so future migrations do not reintroduce old terminology.
   - Preserve all fields needed to map back to current legacy UI types during Phases 2-5. The compat layer should be mostly field renames, not data synthesis. If a field is intentionally dropped, document why and update the migration plan before implementation.

2. Split navigation and feature-flag types into dedicated modules under `PredictNext/types/`.
   - Create `app/components/UI/PredictNext/types/navigation.ts`.
   - Create `app/components/UI/PredictNext/types/flags.ts` if feature flags remain feature-owned.
   - Mirror the useful parts of:
     - `app/components/UI/Predict/types/navigation.ts`
     - `app/components/UI/Predict/types/flags.ts`
   - Rename route params to canonical nouns where that improves clarity, for example `eventId`, `marketId`, `outcomeId`.

3. Define the `PredictClient` seam in `app/components/UI/PredictNext/clients/types.ts` and the internal adapter seam in `app/components/UI/PredictNext/clients/adapters/types.ts`.
   - Export a product-facing `PredictClient` interface grouped by concern:
     - venue metadata: `getVenueInfo`,
     - event reads: `fetchEvents`, `fetchEvent`, `fetchEventsByIds`, `fetchCarouselEvents`, `searchEvents`, `fetchEventSeries`,
     - market data reads: `fetchPriceHistory`, `fetchCryptoPriceHistory`, `fetchCryptoReferencePrice`, `fetchPrices`,
     - quote reads: `getOrderPreview`,
     - account-scoped operations bound to the client's `ownerAddress`: `fetchPositions`, `fetchActivity`, `fetchBalance`, `fetchUnrealizedPnL`, `fetchAccountReadiness`, `submitOrder`, `buildDepositTx`, `buildWithdrawTx`, `buildClaimTx`,
     - typed live subscriptions: `createSubscription` with a discriminated channel request.
   - Define deposit and withdraw transaction builder params as discriminated unions with explicit `editable-template` and `fixed-amount` modes. `editable-template` is required for legacy `prepareDeposit` and `prepareWithdraw` parity because the current confirmation / Transaction Pay flow edits zero-amount transfer templates after transaction creation. `fixed-amount` requires an `amount` so forgetting an amount cannot silently create an editable template.
   - Include explicit method return types using the new canonical domain types.
   - Use explicit venue terms: `venueId` for the external prediction market identifier and `PredictVenueId` for its union type.
   - Use `ownerAddress` for the MetaMask account at public PredictNext boundaries. Client instances are bound to one `ownerAddress`, so account-scoped client methods should not require callers to pass it again.
   - Do not expose venue account addresses, proxy wallet addresses, wallet types, or deployment flags in canonical account readiness. Those are session/client context details; temporary Polymarket migration helpers may expose them only to preserve legacy shapes until Phase 7.
   - Define a small `PredictSignerProvider` dependency for `PredictSessionService`. Product services never pass legacy `Signer` objects, signing callbacks, API keys, headers, or session objects to client methods.
   - Add `VenueCapabilities` so later clients can describe support for deposits, live prices, crypto reference prices, claims, withdrawals, orderbook, and proxy-wallet semantics.
   - Use decimal strings for canonical product financial values, including balances, prices, volumes, fees, PnL, and order preview amounts. Raw token integers stay inside the generic client, adapter internals, and transaction builders; JavaScript numbers are allowed only for non-financial counts, timestamps, and display-only chart coordinates that are never used for order sizing or settlement.
   - Keep the interface complete and non-optional. Every client implements every method; services branch on `client.capabilities`, not method existence.
   - Unsupported capability methods must throw `PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY` if called. Reserve `VENUE_UNAVAILABLE` for venue outages or unreachable venue APIs.
   - Keep the interface venue-agnostic so the same generic `PredictClient` can wrap `PolymarketAdapter`, later `KalshiAdapter`, or another venue adapter.
   - Define an adapter registry/resolver used by `PredictSessionService`. PredictNext may have multiple venue implementations registered, but only one active venue is expected at a time; services ask `PredictSessionService` for a client instead of resolving venues directly.
   - Do not include analytics metadata helpers in the client or internal adapter. Analytics belongs to `AnalyticsService`.

4. Define the session service contract in `app/components/UI/PredictNext/services/predict-session/types.ts`.
   - Export `PredictSessionService` with `getClient(ownerAddress, venueId?)` and `invalidate(ownerAddress, venueId?)`.
   - `PredictSessionService` owns signer resolution, session caching keyed by active `venueId` and `ownerAddress`, eligibility/readiness session state, refresh, invalidation, and construction of `PredictClient` with the active adapter/session.
   - Do not define public session purposes/scopes. A session represents whatever authenticated context the active venue needs for that MetaMask account.
   - Internal adapters remain stateless. The generic client uses the active adapter but does not expose it to product services.
   - Session data is private to `PredictSessionService` and the returned generic client; services must not inspect API keys, headers, venue account addresses, wallet types, deployment flags, or session objects.

5. Create the shared error model in `app/components/UI/PredictNext/errors/PredictError.ts`.
   - Export one canonical `PredictErrorCode` enum. Start with:
     - `GEO_BLOCKED`
     - `FEATURE_DISABLED`
     - `NETWORK_MISMATCH`
     - `VENUE_UNAVAILABLE`
     - `UNSUPPORTED_VENUE_CAPABILITY`
     - `SERVICE_DEGRADED`
     - `RATE_LIMITED`
     - `INSUFFICIENT_FUNDS`
     - `ORDER_PREVIEW_EXPIRED`
     - `ORDER_REJECTED`
     - `ORDER_PLACEMENT_FAILED`
     - `DEPOSIT_FAILED`
     - `WITHDRAWAL_FAILED`
     - `CLAIM_FAILED`
     - `TRANSACTION_REJECTED`
     - `TRANSACTION_FAILED`
     - `LIVE_DATA_DISCONNECTED`
     - `UNKNOWN`
   - Export `PredictError` class with fields such as `code`, `cause`, `recoverable`, `context`, and `displayMessage`.
   - Add constructors/helpers that make downstream code prefer typed errors over string matching.
   - Keep this enum consistent across architecture, services, hooks, and testing docs.

6. Create the translation layer in `app/components/UI/PredictNext/compat/`.
   - Create `app/components/UI/PredictNext/compat/mappers.ts` with bidirectional mapping functions:
     - **Canonical to legacy** (used when old controller or legacy `PolymarketProvider` needs to return old-shaped data to old consumers):
       - `toOldMarket(event: PredictEvent): LegacyMarket`
       - `toOldOutcome(market: PredictMarket): LegacyOutcome`
       - `toOldOutcomeToken(outcome: PredictOutcome): LegacyOutcomeToken`
       - Additional mappers for positions, orders, activity items as needed.
     - **Legacy to canonical** (used when old code passes commands to new services):
       - `toCanonicalEvent(market: LegacyMarket): PredictEvent`
       - `toCanonicalMarket(outcome: LegacyOutcome): PredictMarket`
       - `toCanonicalOutcome(token: LegacyOutcomeToken): PredictOutcome`
       - Additional mappers for order params, navigation params as needed.
   - Create `app/components/UI/PredictNext/compat/types.ts` to re-export or alias the legacy types that the mappers depend on. Import these from the old `Predict/types/` module rather than redefining them.
   - Keep all old `Predict/` imports isolated to `compat/`. Other PredictNext modules must not import old `Predict/` types, helpers, clients, or provider code.
   - The data shapes should remain structurally close during migration — the mappers are primarily field renames, including legacy `providerId` ↔ canonical `venueId`. Where the new canonical model intentionally differs, document the difference in the mapper and test it with legacy fixtures.
   - This module is intentionally temporary. It will be deleted in Phase 7.

7. Create barrel exports so later phases import from a stable surface.
   - Update or create:
     - `app/components/UI/PredictNext/index.ts`
     - `app/components/UI/PredictNext/types/index.ts` if split into multiple files
     - `app/components/UI/PredictNext/clients/index.ts`
     - `app/components/UI/PredictNext/errors/index.ts`
     - `app/components/UI/PredictNext/compat/index.ts`
   - Export only contracts and safe primitives; do not expose service internals yet.

8. Cross-check the glossary against the old codebase.
   - Read `app/components/UI/Predict/README.md` and `app/components/UI/Predict/types/index.ts`.
   - Confirm every ambiguous term used there has one canonical replacement in `CONTEXT.md`.
   - Ensure the same term is used in type names, comments, and folder names.

9. Add foundational tests.
   - Write `app/components/UI/PredictNext/errors/PredictError.test.ts` if the error class has logic.
   - Write `app/components/UI/PredictNext/compat/mappers.test.ts` to verify bidirectional translation correctness. These mappers are pure functions and benefit from thorough unit tests since every later phase depends on them.
   - Write `app/components/UI/PredictNext/clients/types.test-d.ts` only if the repo already uses type assertion tests; otherwise keep contract verification through compile-time usage in later service tests.

10. Freeze the contract before delegation work starts.

- Review this phase with owners of controller, hooks, and UI migration work.
- Do not begin Phase 2 until the canonical names, client methods, session-service contract, and translation mappers are agreed.

## Files Created

| File path                                                         | Description                                             | Estimated lines |
| ----------------------------------------------------------------- | ------------------------------------------------------- | --------------: |
| `app/components/UI/PredictNext/types/index.ts`                    | Canonical domain types and shared value objects         |         220-320 |
| `app/components/UI/PredictNext/types/navigation.ts`               | PredictNext route param types                           |          60-120 |
| `app/components/UI/PredictNext/types/flags.ts`                    | Feature-flag types if feature-owned                     |           20-40 |
| `app/components/UI/PredictNext/clients/types.ts`                  | `PredictClient` and capability types                    |          90-150 |
| `app/components/UI/PredictNext/clients/adapters/types.ts`         | Internal `VenueAdapter` and `PredictVenueSession` types |          80-140 |
| `app/components/UI/PredictNext/clients/index.ts`                  | Client barrel exports                                   |            5-15 |
| `app/components/UI/PredictNext/services/predict-session/types.ts` | `PredictSessionService` and signer provider contracts   |           30-70 |
| `app/components/UI/PredictNext/errors/PredictError.ts`            | Shared error enum and class                             |          80-140 |
| `app/components/UI/PredictNext/errors/index.ts`                   | Error barrel exports                                    |            5-10 |
| `app/components/UI/PredictNext/compat/mappers.ts`                 | Bidirectional canonical-to-legacy type mappers          |          80-140 |
| `app/components/UI/PredictNext/compat/types.ts`                   | Legacy type aliases imported from old Predict           |           20-40 |
| `app/components/UI/PredictNext/compat/index.ts`                   | Compat barrel exports                                   |            5-10 |
| `app/components/UI/PredictNext/compat/mappers.test.ts`            | Translation mapper unit tests                           |         100-180 |
| `app/components/UI/PredictNext/index.ts`                          | Public package entry point for foundational exports     |           20-40 |

## Files Affected in Old Code

| File path                                       | Expected change                                                 |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `app/components/UI/Predict/types/index.ts`      | None; reference only while mapping old names to canonical names |
| `app/components/UI/Predict/types/navigation.ts` | None; reference only while defining new params                  |
| `app/components/UI/Predict/README.md`           | None; reference only                                            |
| `app/components/UI/Predict/providers/types.ts`  | None during Phase 1                                             |

## Acceptance Criteria

- Every core domain concept has exactly one canonical exported type in `PredictNext/types/`.
- `PredictClient` can describe the full venue seam needed by later read, write, and live-data services without absorbing service-owned workflows.
- `PredictClient` methods are non-optional; venue differences are expressed through `VenueCapabilities` and typed unsupported-capability errors.
- `PredictSessionService` is the only planned owner of venue session caches; internal adapters are stateless.
- `PredictError` eliminates stringly typed error handling for new code.
- Translation mappers in `PredictNext/compat/` correctly convert between canonical and legacy types in both directions, verified by unit tests.
- `PredictNext/index.ts` exposes a stable foundational API without leaking implementation internals.
- `CONTEXT.md` and the exported types use the same terminology.
- No production files outside `PredictNext/` are switched yet.

## Estimated PRs

- 2-3 PRs total.
  1. Types, navigation contracts, and translation layer with tests.
  2. PredictClient interface and error model.
  3. Optional cleanup PR for barrels and doc alignment if review scope needs to stay small.
