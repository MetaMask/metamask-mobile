# Permanent PredictNext public API with pass-through legacy Polymarket

Code outside Predict depends only on a thin PredictNext public API. During the dual-codebase period, that API decides between the Kalshi implementation and the unchanged legacy Polymarket code internally. Legacy Polymarket data is passed through in its existing form, not converted into canonical Predict types on the client. Canonical Polymarket mapping is built once, as a Venue adapter in the Predict API service, under PRED-1356.

Status: accepted for PRED-1374, 2026-10-20. Supersedes the earlier PRED-1374 draft that required private client-side conversion of legacy Polymarket data into canonical types.

## Context

Legacy Polymarket is a client-only integration: `PredictController` and `PolymarketProvider` call Polymarket APIs directly from the app, with no Predict API service involvement. The target architecture moves Venue adapters to the Predict API service and keeps the client thin. Kalshi already follows that architecture and is unreleased. Polymarket moves to it shortly after Kalshi launches and is validated.

About sixty files outside `UI/Predict/` import legacy internals: feature flags and analytics constants, navigation params and hooks, legacy types such as `PredictMarket` and `PredictPosition`, data hooks, components, Polymarket constants and proxy-address helpers, and Engine/transaction-pay wiring. Homepage and Trending also render Predict data themselves from legacy types.

Making those consumers read canonical data for both Venues would require a full client-side Polymarket-to-canonical adapter: activity identity, full-portfolio valuation, custom-outcome sides, quote validation, and history metadata. PRED-1356 must build that adapter in the API service anyway. Building it on the client first would duplicate the work, add financial-correctness risk to a production product, and weaken permanent canonical types to fit legacy data loss.

## Decision

1. **Consumer-shaped public surface.** During the dual-codebase period, PredictNext exposes availability, entry actions, Predict-owned components or slot widgets, and narrow projections typed in the consumer's own terms, such as a portfolio value or the shared `ActivityListItem`. Canonical domain types and data hooks become public only when a real consumer needs them and every supported Venue can supply them truthfully. For Polymarket, that is after PRED-1356.
2. **Move rendering into Predict, not data out of it.** Predict-specific rendering and logic that lives in shared surfaces, such as the Homepage Predictions section, moves behind a Predict-owned component. The Polymarket branch renders that existing code, moved as-is.
3. **Pass-through legacy path.** A public API's Polymarket branch calls existing legacy hooks, mappers, and components without behavior changes. With Kalshi disabled, every public API returns or renders exactly what production does today.
4. **One internal Venue decision.** Each public API resolves the user's Venue internally. External callers never select, branch on, or receive a Venue-specific object. The switch is temporary and is deleted with the legacy branch.
5. **Strict canonical types.** Canonical PredictNext types are not weakened to represent legacy mapper losses. Optionality reflects genuine source absence.
6. **Legacy execution is untouched.** The legacy controller, providers, confirmations and pay-with integration, transaction-pay callbacks, and Engine wiring are not wrapped or changed before PRED-1356. They are named composition wiring that PRED-1356 removes. The only change allowed in them is an availability gate, so that a user on Kalshi is never offered a Polymarket funding or trading entry point. Kalshi funding and trading use their own PredictNext flows.
7. **One curated entry point, fenced.** Code outside Predict imports only from `app/components/UI/PredictNext/index.ts`, which exports exactly the public surface. That file is not a catch-all barrel. Named composition wiring (Engine initialization and messengers, navigator registration) is the only allowlisted exception. An `import-x/no-restricted-paths` fence enforces this, and also blocks external imports of legacy `UI/Predict/`, no later than the end of PRED-1340.
8. **No compatibility versioning.** PredictNext is unreleased. Coordinated breaking client/API changes are allowed. Do not add API versions, negotiation, or dual parsers for older unreleased builds.

## Consequences

- External callers migrate once. PRED-1356 changes only PredictNext internals: the legacy branch disappears and the PredictNext implementation serves Polymarket through the API service.
- Each caller migration is a small, reviewable change: a file move plus an import change for the legacy branch, and new Kalshi code behind the Kalshi flag.
- Kalshi gains no client-side cache, identity, or valuation machinery to accommodate Polymarket.
- The Polymarket data issues found during PRED-1374 become PRED-1356 backend adapter requirements, not client work.
- While the legacy branch exists, Polymarket features keep their legacy semantics, including their known data-loss behavior. That is acceptable because it is today's production behavior.

## Deletion test

PRED-1356 is complete when the legacy branch of every public API, the moved legacy code, and the named composition wiring can be deleted without changing external imports, public types, supported interactions, or visible behavior.

## Alternatives rejected

- **Client-side canonical Polymarket adapter.** Rejected: it duplicates the PRED-1356 backend adapter, risks production Polymarket, and weakens canonical types.
- **Leave external callers on legacy imports until PRED-1356.** Rejected for surfaces that must show Kalshi at launch: those callers would branch on Venue and then migrate again. Acceptable for surfaces that stay Polymarket-only at launch.
- **A separate bridge module.** Rejected: it would create another public API to maintain alongside PredictNext.

See [the public API contract](../public-api-contract.md) for the surface map, migration rules, and PRED-1356 inputs.
