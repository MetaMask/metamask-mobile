# PredictNext public API during the dual-codebase period

PRED-1374 defines how code outside Predict moves to PredictNext while production Polymarket remains on the legacy `Predict/` codebase. [ADR-0002](./adr/0002-permanent-public-api-private-legacy.md) records the decision. Jira epic [PRED-1340](https://consensyssoftware.atlassian.net/browse/PRED-1340) owns delivery and sequencing.

Summary: external callers depend on a thin, Venue-neutral PredictNext API. Inside it, the Kalshi branch uses PredictNext and the Polymarket branch passes through today's legacy code unchanged. Canonical Polymarket mapping is built once, in the Predict API service, under PRED-1356.

## Target and transition

```text
Target (after PRED-1356)
External wallet code -> PredictNext public API -> PredictNext services -> Predict API service -> Kalshi / Polymarket

Transition
External wallet code -> PredictNext public API -> Kalshi:     PredictNext services -> Predict API service -> Kalshi
                                               -> Polymarket: legacy Predict code, unchanged -> Polymarket APIs
```

The public API is the same in both states. Only the Polymarket branch changes.

## External consumers today

| Group                                  | Examples                                                                                                                                                                                                 | Direction                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Availability and analytics constants   | `selectPredictEnabledFlag`, `PredictEventValues` across Wallet, Trending, Activity, and Homepage                                                                                                         | Venue-neutral availability and analytics exports                       |
| Entry points and navigation            | Wallet and TradeWallet actions, Homepage buttons and pills, deep links, Rewards campaign CTA, Activity empty state, `usePredictNavigation`, direct `Routes.PREDICT.*` navigation, navigation param types | Intent-based `openPredict`; callers never pass legacy routes or params |
| Shared surfaces rendering Predict data | Homepage Predictions section, Trending feeds and search rows, Browser URL autocomplete, UI slot widgets, built from `PredictMarket`/`PredictPosition`                                                    | Predict-owned components; existing code moves behind them              |
| Narrow projections                     | BalanceBreakdown `usePredictSlice` (portfolio value), ActivityList and ActivityDetails (`usePredictActivity`)                                                                                            | Hooks returning the consumer's own type                                |
| Execution and composition wiring       | Confirmations pay-with and withdraw hooks, proxy-address helpers, Polygon constants, Engine messengers, transaction-pay callbacks, toast registration                                                    | Unchanged until PRED-1356                                              |

Rewards campaign data comes from the Rewards backend (`PredictThePitchPositionsDto`), not from Predict, so only its navigation couples to Predict. Reverify this inventory when each surface migrates; import scans miss route-name coupling.

## Public surface

Every surface that shows Polymarket today also shows Kalshi at launch, so every caller group above is in launch scope.

Code outside PredictNext imports only from one curated entry point, `app/components/UI/PredictNext/index.ts`. That file exports only the public surface below. It is not a catch-all barrel that re-exports modules. Internal modules keep using their own module-root `index.ts` files with each other. The only exception is named composition wiring, such as Engine service initialization and messengers, and navigator registration, which stays on a small explicit allowlist.

The entry point's first export is `PredictRoot`, the root router that `MainNavigator` registers for the `Predict` route (PRED-1375). It is a permanent, Venue-neutral component: after PRED-1356 it renders only the PredictNext stack, so that import does not change. `MainNavigator`'s legacy imports (`PredictModalStack`, `PredictPreviewSheetProvider`) stay named composition wiring.

Names are proposals. The implementing ticket finalizes each name and adds its export only when it migrates a real caller. Do not create empty modules.

| Proposed API                                                                                                                         | Polymarket branch (transition)                                                     | Kalshi branch                                            | After PRED-1356                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| `selectPredictAvailability` / `usePredictAvailability()` (venue-aware since PRED-1377, see [Active Venue](./active-venue.md))        | Existing legacy flag and eligibility logic                                         | Kalshi flags, eligibility, kill switch                   | Venue availability from the API service    |
| `openPredict(intent)`, `usePredictEntryActions()`                                                                                    | Legacy `usePredictNavigation` and routes                                           | PredictNext routes                                       | PredictNext routes                         |
| `PredictHomeSection`, `PredictTrendingFeed`, slot widgets, autocomplete results                                                      | Existing Homepage/Trending/Browser Predict code, moved as-is                       | New Kalshi UI                                            | PredictNext UI                             |
| `usePredictPortfolioValue()`                                                                                                         | `usePredictPortfolio().portfolioValue`                                             | Kalshi Portfolio Summary `totalValue`                    | PredictNext Portfolio Summary `totalValue` |
| `usePredictActivityItems()` returning `ActivityListItem`, `usePredictActivityDetailsItem()` and `PredictActivityDetails` (PRED-1387) | Existing `usePredictActivity`, `mapPredictActivity` and `PredictDetails` templates | Kalshi Activity mapped to `ActivityListItem` (PRED-1410) | PredictNext Activity mapped the same way   |
| Analytics constants and entry-point attribution                                                                                      | Existing values, re-exported unchanged                                             | Same values                                              | Same values                                |

Public inputs are intents, consumer-owned types, and callbacks with Venue-neutral arguments. Public outputs never include legacy objects (`PredictMarket`, `PredictPosition`, `PredictActivity`), Venue DTOs, proxy-wallet data, or provider IDs. Canonical PredictNext domain types and data hooks are not public yet. Expose them only when a consumer needs domain data and every supported Venue can supply it truthfully.

## Rules for the Venue switch

- Each public API resolves the Active Venue internally. Callers do not pass, read, or branch on a Venue. Under PRED-1340, a known US location defaults to Kalshi, a known non-US location defaults to Polymarket, and a valid explicit Venue Selection Preference takes precedence. PRED-1377 implements that resolution as `selectActiveVenue`; see [Active Venue and availability](./active-venue.md). The Active Venue can change during a session, but only when the preference or the rollout config changes.
- On an Active Venue change, the public API remounts the newly active branch. Kalshi cancels its own unsubmitted previews. Legacy Polymarket keeps its existing behavior, including toast registration and observation of submitted operations, which stay mounted regardless of Active Venue.
- A surface whose action has no implementation for the Active Venue hides that action. For example, while Kalshi is active, Money and pay-with must not offer the Polymarket deposit or add-funds flow. That is an availability gate, not a wrapper around legacy execution.
- Every public API resolves its branch through `implementation/`. `usePredictImplementation()` returns `{ status: 'resolving' }`, `{ status: 'ready', implementation: 'legacy' }`, or `{ status: 'ready', implementation: 'next', venueId }`. One internal map sends each Venue to an implementation (`polymarket → legacy`, `kalshi → next`); PRED-1356 changes only that map.
- Prefer switching at component level with `<PredictImplementationSwitch legacy={…} next={…} resolving={…} />`. It mounts only the active branch, keyed by implementation and Venue, so an Active Venue change remounts it.
- Hooks follow the Rules of Hooks. A projection hook calls both implementations' hooks, passes `enabled: false` to the inactive one, and returns the active result. The inactive hook must run no side effects: legacy `usePredictActivity`, for example, calls `ensurePolygonNetworkExists` only while enabled. Prove it with `expectInactiveHookHasNoSideEffects` (`implementation/inactiveHook.testUtils.ts`). If a legacy hook cannot be disabled cleanly, use the component switch or a small provider that mounts only the active implementation instead.
- With Kalshi disabled, every public API is behaviorally identical to today's production path. Test that explicitly for each migrated surface.
- Each public API's legacy pass-through lives under its owning PredictNext module, for example `portfolio/internal/legacy/`. PredictNext may import legacy `UI/Predict/` to render the legacy branch. Legacy code never imports PredictNext public wrappers, so dependencies stay one-way.

## Protecting production Polymarket

1. The legacy branch is existing code, moved and not edited: `git mv`, move colocated tests, change only import paths. Keep behavior changes in separate PRs.
2. Do not change the legacy controller, providers, confirmations, pay-with integration, transaction-pay callbacks, or Engine wiring before PRED-1356.
3. Do not add Kalshi branches to legacy code.
4. Migrate one surface per PR, cheapest first: availability and analytics constants, entry points, narrow projections, then Predict-owned Homepage, Trending, and autocomplete components.
5. Fence the boundary with `import-x/no-restricted-paths` no later than the end of PRED-1340 (PRED-1394). Code outside Predict and PredictNext may import neither legacy `UI/Predict/` nor PredictNext internals. It may import only the PredictNext entry point. The named composition wiring stays on a small allowlist until PRED-1356 removes the legacy parts.

## Homepage Predictions section

The Homepage Predictions section becomes a Predict-owned component, `PredictHomeSection`, exported from the PredictNext entry point. Homepage renders it the way it already renders other feature sections. The case for this:

- **Predict already owns the code.** CODEOWNERS assigns `app/components/Views/Homepage/Sections/Predictions/` to `@MetaMask/predict`. `@MetaMask/mobile-core-ux` owns `Homepage.tsx`, the composition. Moving the section changes its location, not its ownership. Perps and Earn already own their Homepage sections the same way.
- **There is an established pattern.** `Sections/EarnSection/HomepageEarnSection.tsx` is a 50-line Homepage wrapper that renders the Earn-owned `UI/Earn/components/EarnSection`.
- **The interface already exists.** Today's `PredictionsSection` takes `sectionIndex`, `totalSectionsLoaded`, and `mode`, and exposes a `SectionRefreshHandle` through its ref. `PredictHomeSection` keeps exactly that contract, so `Homepage.tsx` changes one import.
- **Every alternative is worse.** The section is 28 non-test files, about 2,600 lines, that import legacy types, hooks, queries, Polymarket endpoints, and account utilities. To show Kalshi there without moving it, Homepage would either branch on Venue, which PRED-1340 forbids, or need canonical data hooks for both Venues, which requires the client-side Polymarket adapter that ADR-0002 rejects.
- **The Homepage team gains.** Prediction-market changes, PRED-1356, and Predict regressions stop touching Homepage files, and Homepage keeps full control of placement, ordering, visibility, and refresh.

The BalanceBreakdown Predict slice stays Homepage code and calls `usePredictPortfolioValue()`.

## Canonical decisions that remain

These apply to PredictNext's own contract and to the eventual Polymarket backend mapping. They do not require client-side Polymarket conversion now.

- **Displayed Probability is not a quote.** A Venue-provided probability or mark is distinct from the executable Ask and Bid Prices. An absent quote stays absent and never becomes zero.
- **Decimal share quantities.** Positions and the sell intent use decimal-string shares. Kalshi's whole-contract sell restriction is Kalshi-specific and stays in its implementation (see ADR-0001). Never round holdings at the public boundary.
- **Authoritative Trade direction.** Kalshi's reported `outcomeSide` and matching-leg price do not establish bought or sold direction. Canonical `trade` Activity entries take their buy or sell Action from the backend's own Order records instead. See [the portfolio, Activity, and catalog contract](./canonical-portfolio-activity-catalog-contract.md).
- **Process-local Order observation.** Order completion observation survives screen closure but not process death. No mobile Order persistence is introduced.
- **Account caches are purged by the platform reset.** Kalshi account query keys stay Venue-only. Only a wallet reset or a new wallet replaces the Predict User, and both run the platform reset, so `Engine.resetState` cancels in-flight account reads, removes the cached results, and abandons in-flight Order commits. The shared app query client that mirrors those reads is cleared on that reset and on no other event; lock/unlock, account switches, and sign-out/sign-in keep the cache. No raw identity, token, or PII enters a query key. PredictNext does not cache legacy Polymarket account data, so no wallet-scoped Polymarket keys are needed.

## Inputs for PRED-1356 (Polymarket backend adapter)

PRED-1374 found these legacy client-mapping issues. They belong to the backend adapter, not to client work during the transition:

- Gamma `outcomePrices` and `token.price` are displayed probability, not executable quotes. True Bid and Ask come from price or book data.
- Custom outcomes have no authoritative Yes/No mapping in the legacy code. Array position or label must not define the canonical side.
- Identifier meanings differ across mappers: Gamma Event ID, condition ID, CLOB token ID, and an outcome index that is sometimes named a token ID.
- The legacy Activity mapper drops transaction hashes and condition identity from claims, defaults missing time to now, and defaults missing money to zero. Read upstream records before that mapping.
- Legacy position traversal stops at a page cap without reporting completeness, so totals built from it are not complete for large portfolios.
- The legacy WebSocket price path turns missing or failed prices into zero.
- Activity row identity uses the `getPolymarketActivityId` composite. Decide whether to preserve it or replace it with an authoritative per-execution identifier.
- Redemption history can lack a resolution result. Decide whether the backend can join it authoritatively before relaxing the canonical Settlement contract.
- Existing filters, such as zero-payout redemption exclusion, are current product behavior.

The per-field sources and risks for the canonical Position, Portfolio Summary, and Activity fields are in [the Polymarket feasibility table](./canonical-portfolio-activity-catalog-contract.md#polymarket-feasibility-pred-1356).

## Resolved questions

- Launch scope: every surface that shows Polymarket today shows Kalshi at launch.
- Homepage: plan for a Predict-owned `PredictHomeSection`. Confirm with `@MetaMask/mobile-core-ux` when PRED-1382 starts.
- Venue descriptors: under PRED-1376, the Polymarket descriptor comes from client configuration and implemented behavior during staged delivery. The backend descriptor covers Kalshi until PRED-1356. Its wire shape is the [Venue catalog](./canonical-portfolio-activity-catalog-contract.md#venue-catalog).
