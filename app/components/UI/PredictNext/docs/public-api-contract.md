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

Names are proposals. The implementing ticket finalizes each name and creates its export only when it migrates a real caller. Do not create empty modules.

| Proposed API                                                           | Polymarket branch (transition)                         | Kalshi branch                                | After PRED-1356                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | ---------------------------------------- |
| `selectPredictAvailability` / `usePredictAvailability()`               | Existing legacy flag and eligibility logic             | Kalshi flags, eligibility, kill switch       | Venue availability from the API service  |
| `openPredict(intent)`, `usePredictEntryActions()`                      | Legacy `usePredictNavigation` and routes               | PredictNext routes                           | PredictNext routes                       |
| `PredictHomeSection`, `PredictTrendingFeed`, slot widgets              | Existing Homepage/Trending Predict code, moved as-is   | New Kalshi UI                                | PredictNext UI                           |
| `usePredictPortfolioValue()`                                           | `usePredictPortfolio().portfolioValue`                 | Kalshi portfolio read                        | PredictNext portfolio read               |
| `usePredictActivityItems()` returning `ActivityListItem`, plus details | Existing `usePredictActivity` and `mapPredictActivity` | Kalshi Activity mapped to `ActivityListItem` | PredictNext Activity mapped the same way |
| Analytics constants and entry-point attribution                        | Existing values, re-exported unchanged                 | Same values                                  | Same values                              |

Public inputs are intents, consumer-owned types, and callbacks with Venue-neutral arguments. Public outputs never include legacy objects (`PredictMarket`, `PredictPosition`, `PredictActivity`), Venue DTOs, proxy-wallet data, or provider IDs. Canonical PredictNext domain types and data hooks are not public yet. Expose them only when a consumer needs domain data and every supported Venue can supply it truthfully.

## Rules for the Venue switch

- Each public API resolves the user's Venue internally. Callers do not pass, read, or branch on a Venue.
- Prefer switching at component level: render the legacy component or the Kalshi component, and mount only the active one.
- Hooks follow the Rules of Hooks. If both implementations' hooks must be called, the inactive branch must be disabled and side-effect free. Some legacy hooks have mount side effects; `usePredictActivity`, for example, ensures the Polygon network. Prefer a small internal provider or component boundary that mounts only the active implementation.
- With Kalshi disabled, every public API is behaviorally identical to today's production path. Test that explicitly for each migrated surface.
- The switch lives under the owning PredictNext module, for example `portfolio/internal/legacy/`. Legacy code never imports PredictNext public wrappers, so dependencies stay one-way.

## Protecting production Polymarket

1. The legacy branch is existing code, moved and not edited: `git mv`, move colocated tests, change only import paths. Keep behavior changes in separate PRs.
2. Do not change the legacy controller, providers, confirmations, pay-with integration, transaction-pay callbacks, or Engine wiring before PRED-1356.
3. Do not add Kalshi branches to legacy code.
4. Fence the boundary with an `import-x/no-restricted-paths` rule. Block new imports of `UI/Predict/` from outside Predict and PredictNext, and allowlist the current importers. Each migrated surface shrinks the allowlist; the named composition wiring stays allowlisted until PRED-1356.
5. Migrate one surface per PR, cheapest first: availability and analytics constants, entry points, narrow projections, then Predict-owned Homepage and Trending components.

Surfaces that stay Polymarket-only at Kalshi launch may keep their legacy imports, on the allowlist, until they are needed.

## Canonical decisions that remain

These apply to PredictNext's own contract and to the eventual Polymarket backend mapping. They do not require client-side Polymarket conversion now.

- **Displayed Probability is not a quote.** A Venue-provided probability or mark is distinct from the executable Ask and Bid Prices. An absent quote stays absent and never becomes zero.
- **Decimal share quantities.** Positions and the sell intent use decimal-string shares. Kalshi's whole-contract sell restriction is Kalshi-specific and stays in its implementation (see ADR-0001). Never round holdings at the public boundary.
- **Neutral Fill copy for Kalshi.** Kalshi's reported `outcomeSide` and matching-leg price do not establish bought or sold direction.
- **Process-local Order observation.** Order completion observation survives screen closure but not process death. No mobile Order persistence is introduced.
- **Person-scoped account cache.** Kalshi account query keys must not be Venue-only once real per-person Venue Accounts exist (PRED-1162). PRED-1381 owns the key shape and teardown. PredictNext does not cache legacy Polymarket account data, so no wallet-scoped Polymarket keys are needed.

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

## Open questions

- Which external surfaces must show Kalshi at launch? Those surfaces migrate first. The rest can wait for PRED-1356.
- Will the Homepage owners accept a Predict-owned Predictions section component?
- Is each user on exactly one Venue, for example by region? If yes, Venue resolution is an availability answer, and no in-app Venue switching rules are needed.
