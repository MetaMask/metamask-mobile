# Phase 2: Data Services

## Goal

Build PredictNext read/data services around the canonical domain model, using BaseDataService patterns and Engine messenger registration while delegating to old provider code where necessary.

## Prerequisites

- Phase 1 complete.

## Deliverables

- `MarketDataService` under `app/components/UI/PredictNext/services/market-data/`
- `PortfolioService` under `app/components/UI/PredictNext/services/portfolio/`
- Messenger actions/events and registration points in Engine
- Initial `DATA_SERVICES` wiring for query invalidation and refresh orchestration
- Unit tests for both services

## Step-by-Step Tasks

1. Create the shared data-service base layer under `app/components/UI/PredictNext/services/shared/`.
   - Add `BaseDataService.ts` with the standard responsibilities:
     - query key construction,
     - in-flight request deduplication,
     - stale-time configuration,
     - cache invalidation hooks,
     - messenger event publishing for refreshes.
   - Add a small `types.ts` module for service config and query context types.
   - Keep this base class internal to `PredictNext/services/`.

2. Create `MarketDataService`.
   - File: `app/components/UI/PredictNext/services/market-data/MarketDataService.ts`.
   - Define read methods for:
     - featured events,
     - paginated event feed,
     - event details,
     - event search,
     - price history,
     - series/grouped events if still needed by sports or crypto verticals.
   - Initial implementation should adapt old provider reads from:
     - `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`
     - `app/components/UI/Predict/hooks/usePredictMarket.tsx`
     - `app/components/UI/Predict/hooks/usePredictMarketData.tsx`
     - `app/components/UI/Predict/hooks/usePredictPriceHistory.tsx`
     - `app/components/UI/Predict/hooks/useFeaturedCarouselData.ts`
     - `app/components/UI/Predict/hooks/usePredictSeries.ts`
   - Add a temporary delegate layer so each read method can call the old provider and map old DTOs into `PredictEvent`, `PredictMarket`, and `PredictOutcome`.

3. Create `PortfolioService`.
   - File: `app/components/UI/PredictNext/services/portfolio/PortfolioService.ts`.
   - Define read methods for:
     - balances,
     - open positions,
     - resolved positions,
     - claimable positions,
     - activity feed,
     - unrealized PnL,
     - rewards or account state if still displayed in the feature.
   - Seed behavior by extracting the read-only concerns from:
     - `app/components/UI/Predict/controllers/PredictController.ts`
     - `app/components/UI/Predict/hooks/usePredictBalance.ts`
     - `app/components/UI/Predict/hooks/usePredictPositions.ts`
     - `app/components/UI/Predict/hooks/usePredictActivity.ts`
     - `app/components/UI/Predict/hooks/useUnrealizedPnL.tsx`
     - `app/components/UI/Predict/hooks/usePredictRewards.ts`
     - `app/components/UI/Predict/hooks/usePredictAccountState.ts`

4. Add the first real adapter implementation for service consumption.
   - Create `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`.
   - Do not rewrite the entire provider yet.
   - Wrap old `PolymarketProvider` methods and map the results into canonical types.
   - Keep migration-safe comments on every delegated method indicating the exact source method in `PolymarketProvider.ts`.

5. Register messenger types and actions.
   - Add PredictNext-specific service messenger types under `app/components/UI/PredictNext/services/types.ts` or adjacent service folders.
   - Update Engine registration points as needed:
     - `app/core/Engine/messengers/predict-controller-messenger/index.ts`
     - `app/core/Engine/types.ts`
   - Delegate only the actions/events needed for read services, keeping the action surface narrow.

6. Add `DATA_SERVICES` population and query invalidation hooks.
   - Create `app/components/UI/PredictNext/services/index.ts` or `app/components/UI/PredictNext/services/registry.ts`.
   - Export a `DATA_SERVICES` map or registry used by the controller and hooks.
   - Make sure cache keys align with planned hooks such as `useEvents` and `usePortfolio`.

7. Write tests.
   - `app/components/UI/PredictNext/services/market-data/MarketDataService.test.ts`
   - `app/components/UI/PredictNext/services/portfolio/PortfolioService.test.ts`
   - Mock the adapter instead of the old provider in service tests.
   - Verify:
     - correct mapping into canonical types,
     - cache invalidation behavior,
     - error normalization into `PredictError`,
     - pagination and filter handling.

8. Leave old production consumers untouched.
   - No view or hook should switch to the new services in this phase.
   - The output of this phase is a tested read layer ready for controller and hook adoption.

## Files Created

| File path                                                                      | Description                                    | Estimated lines |
| ------------------------------------------------------------------------------ | ---------------------------------------------- | --------------: |
| `app/components/UI/PredictNext/services/shared/BaseDataService.ts`             | Shared read-service base class                 |         120-180 |
| `app/components/UI/PredictNext/services/shared/types.ts`                       | Base service configuration types               |           20-40 |
| `app/components/UI/PredictNext/services/market-data/MarketDataService.ts`      | Event/feed/details/price-history reads         |         180-280 |
| `app/components/UI/PredictNext/services/market-data/MarketDataService.test.ts` | Market data service tests                      |         180-260 |
| `app/components/UI/PredictNext/services/portfolio/PortfolioService.ts`         | Balance/positions/activity reads               |         180-280 |
| `app/components/UI/PredictNext/services/portfolio/PortfolioService.test.ts`    | Portfolio service tests                        |         180-260 |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`       | Canonical adapter backed by old provider calls |         200-320 |
| `app/components/UI/PredictNext/adapters/polymarket/index.ts`                   | Polymarket adapter barrel                      |            5-10 |
| `app/components/UI/PredictNext/services/index.ts`                              | Data service registry export                   |           20-40 |

## Files Affected in Old Code

| File path                                                              | Expected change                                                                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts` | Usually none; optional tiny visibility/export adjustments only if adapter delegation requires them |
| `app/core/Engine/messengers/predict-controller-messenger/index.ts`     | Add any messenger actions/events needed by the new data services                                   |
| `app/core/Engine/types.ts`                                             | Add PredictNext service/controller types if required by Engine wiring                              |
| `app/components/UI/Predict/hooks/usePredictMarketData.tsx`             | None in this phase                                                                                 |
| `app/components/UI/Predict/hooks/usePredictPositions.ts`               | None in this phase                                                                                 |

## Acceptance Criteria

- `MarketDataService` and `PortfolioService` compile against the Phase 1 contracts.
- Both services are covered by tests that use mock adapters, not production network calls.
- The initial `PolymarketAdapter` maps old provider data into canonical `PredictNext` types.
- Messenger wiring is in place for the controller to consume these services in Phase 4.
- No routed UI has switched yet, so rollback remains trivial.

## Estimated PRs

- 3-4 PRs total.
  1. BaseDataService and shared service scaffolding.
  2. MarketDataService plus tests.
  3. PortfolioService plus tests.
  4. Engine messenger/registry follow-up if the wiring review should stay isolated.
