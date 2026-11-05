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

Wallet reset is named composition wiring. It calls
`PredictDeviceAuthService:reset` through the Engine messenger; Authentication
does not import PredictNext key or session internals.

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

## Entry actions (PRED-1379)

Code outside Predict opens Predict with an intent, never with a route, route params or `usePredictNavigation`. Components use `usePredictEntryActions()`, which returns `openPredict(intent)` and `canOpenPredict(intent)` bound to their own navigation. Code without a component (deep-link handlers, sagas) calls `openPredict(intent)` from the entry point, which resolves the Active Venue from the store at call time. Both return whether they navigated.

| Intent                     | Legacy branch (today's call, unchanged)                                                                                                                                                   | Next branch                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `home`                     | `Predict` → `PredictMarketList` with `entryPoint` and non-empty `transactionActiveAbTests`                                                                                                | `Predict` → `PredictNextHome`                                             |
| `feed` (`category`)        | `Predict` → `PredictMarketList` with `entryPoint` and `tab: category`                                                                                                                     | `Predict` → `PredictNextHome`                                             |
| `event` (`eventRef`)       | `usePredictNavigation().navigateToMarketDetails({ marketId, providerId, entryPoint, title, image }, { throughRoot: true })`, `title` and `image` from `titleSnapshot` and `imageSnapshot` | `Predict` → `PredictNextEvent` with `venueId`, `eventId`, `titleSnapshot` |
| `portfolio` (`tab`)        | `Predict` → `PredictPositions` with `entryPoint` and `initialTab` (`activity` → `history`)                                                                                                | `Predict` → `PredictNextPortfolio` with `venueId`, `initialTab`           |
| `addFunds` (`autoDeposit`) | `PredictModals` → `PredictAddFundsSheet` with `autoDeposit`                                                                                                                               | Unavailable: PredictNext has no funding yet                               |

Empty params are omitted, as callers did before. While the Active Venue is resolving, `home` and `feed` take the legacy navigation, which the root router hands to the Active Venue's stack; every other intent is unavailable until the Venue is known.

Entity IDs are `PredictEventRef<Venue>` values: opaque, Venue-qualified, and minted only by Predict. A Polymarket reference is not assignable where a Kalshi one is expected, and an intent naming an entity of another Venue than the Active Venue opens nothing. `createLegacyPredictEventRef` exists for callers that still receive legacy Polymarket data (Browser autocomplete) and goes with PRED-1356.

### Campaign entry points (PRED-1391)

A Rewards campaign runs on one Venue, and Predict owns which (`campaigns/campaignVenues.ts`; Predict The Pitch runs on Polymarket). Rewards names the campaign, never the Venue:

- A `home` intent with `campaign` opens only while the campaign's Venue is the Active Venue. On another Venue, or while the Active Venue is resolving, it is unavailable (`venueMismatch`, `resolving`), so the campaign's "Predict now" is hidden.
- `createPredictCampaignEventRef(campaign, eventId)` mints the reference for an Event the campaign's backend names. Its type is the campaign's Venue (`PredictEventRef<'polymarket'>`), and no public minter produces a Kalshi reference, so a campaign identifier cannot become a Kalshi Event in the types. At runtime the Kalshi branch refuses it as `venueMismatch`.
- `usePredictCampaignEligibility(campaign)` is the campaign Venue's region eligibility, which gates the campaign's opt-in. For Polymarket it is the legacy eligibility, whichever Venue is active.

Campaign data, statistics, leaderboards and the Rewards controller stay Rewards-owned. Only navigation and eligibility come from Predict.

A surface hides an action its intent cannot open: Money hides the Predictions-account transfer while `canOpenPredict({ type: 'addFunds' })` is false. `NavigationService` types take Predict's root-navigator routes from `PredictAppRouteParamList`. `MainNavigator` registers the `Predict` routes while `selectPredictAvailability` is true and keeps the legacy modal stack and preview-sheet provider as named composition wiring.

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
5. The boundary is fenced with `import-x/no-restricted-paths` (PRED-1399, `scripts/eslint-predict-boundary-zones.js`). Code outside Predict and PredictNext may import neither legacy `UI/Predict/` nor PredictNext internals. It may import only the PredictNext entry point. The named composition wiring stays on a permanent allowlist, `predictCompositionFiles`, until PRED-1356 removes the legacy parts. Every other existing importer is on the burn-down list, `predictImportBurndownFiles`.
6. **Each migration PR deletes the files it migrates from `predictImportBurndownFiles`.** The list only shrinks. `scripts/eslint-predict-boundary-zones.test.ts` fails if an entry is added, and also if a listed file no longer imports Predict internals, so a finished migration cannot leave its files exempt.

## Homepage Predictions section

The Homepage Predictions section becomes a Predict-owned component, `PredictHomeSection`, exported from the PredictNext entry point. Homepage renders it the way it already renders other feature sections. The case for this:

- **Predict already owns the code.** CODEOWNERS assigns `app/components/Views/Homepage/Sections/Predictions/` to `@MetaMask/predict`. `@MetaMask/mobile-core-ux` owns `Homepage.tsx`, the composition. Moving the section changes its location, not its ownership. Perps already owns its Homepage sections the same way.
- **The interface already exists.** Today's `PredictionsSection` takes `sectionIndex`, `totalSectionsLoaded`, and `mode`, and exposes a `SectionRefreshHandle` through its ref. `PredictHomeSection` keeps exactly that contract, so `Homepage.tsx` changes one import.
- **Every alternative is worse.** The section is 28 non-test files, about 2,600 lines, that import legacy types, hooks, queries, Polymarket endpoints, and account utilities. To show Kalshi there without moving it, Homepage would either branch on Venue, which PRED-1340 forbids, or need canonical data hooks for both Venues, which requires the client-side Polymarket adapter that ADR-0002 rejects.
- **The Homepage team gains.** Prediction-market changes, PRED-1356, and Predict regressions stop touching Homepage files, and Homepage keeps full control of placement, ordering, visibility, and refresh.

The BalanceBreakdown Predict slice stays Homepage code and calls `usePredictPortfolioValue()`.

## Explore (TrendingView) prediction sections

PRED-1385 moved Explore's Predict code to legacy `Predict/trending/` as-is: the feed hooks, the carousel section, the market rows, the skeleton and the Predictions Fuse options. PRED-1408 filled the next branch. Explore renders both through `trending/`:

- `usePredictTrendingFeed({ tab, query })` (sections and search) and `usePredictSportsMarketsFeed` (the Sports tab's All Sports list) are projection hooks. Both implementations' hooks always run, and only the active one is enabled, so a Venue change swaps the markets on the same render. While the Active Venue resolves they return nothing.
- A tab (`now`, `macro`, `rwas`, `crypto`, `sports`) names a Feed key through `PREDICT_SURFACE_FEED_KEYS.exploreTabs`. On the legacy lane that key is the legacy feed category, passed through unchanged. A next Venue reads the Feed its descriptor maps the key to, and nothing when the descriptor lacks it: the section is left out, never filled from another Feed or Venue. Kalshi V1 maps only `sports`, so only the Sports tab has a Predictions section.
- A query searches. A next Venue searches with `useSearchEvents` when its descriptor supports search. That search is unpaginated (no `fetchMore`, `total` is the result count); Polymarket's paginated search is unchanged.
- An Explore refresh refetches only the active read. The next branch invalidates through the data service, so it reads the backend, and records triggers while inactive, so a Venue change never replays one.
- `usePredictTrendingSupported(surface)` tells a caller to leave a surface out rather than render it empty. `search` (the search Predictions pill) follows the descriptor's search support. `allSports` (the Sports tab's All Sports list) is legacy-only: its sports are Polymarket tags, not Feed keys. Predict availability stays the caller's own gate, as before.
- `PredictTrendingCarousel`, `PredictTrendingMarketCard`, `PredictTrendingSearchRow` and `PredictTrendingSkeleton` render the markets those hooks return, and `getPredictTrendingMarketAnalyticsProperties` gives a market's search analytics identity. Markets are the opaque `PredictTrendingMarket`: callers read `id` and hand the rest back. These components render the market they are given rather than switching on the Active Venue, because only the hooks mint markets. A next Venue's market renders the PredictNext Event card in the Polymarket layout: a card press opens the `event` intent, and a buy press opens the PredictNext Order Flow, which the carousel or card hosts. Both are refused for a market whose Venue is no longer the Active Venue. Explore's analytics are unchanged; a next Event reports its id and title, as it has no slug or tags.

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
- Homepage: Homepage renders the Predict-owned `PredictHomeSection` from the entry point (PRED-1382). The UI Slots widget and contract registries are composition wiring. Engine init loads the contract registry and must not load the Predict UI. The section renders a UI Slot, so the widget registry loads while the entry point is still loading, and importing the entry point back from it would form a cycle.
- Venue descriptors: under PRED-1376, the Polymarket descriptor comes from client configuration and implemented behavior during staged delivery. The backend descriptor covers Kalshi until PRED-1356. Its wire shape is the [Venue catalog](./canonical-portfolio-activity-catalog-contract.md#venue-catalog).
