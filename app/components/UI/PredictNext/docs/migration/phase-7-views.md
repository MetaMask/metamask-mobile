# Phase 7: Views

## Goal

Migrate the routed Predict screens and external embed points to PredictNext hooks and components, and add component view coverage for the new surfaces.

## Prerequisites

- Phase 5 complete.
- Phase 6 complete.

## Deliverables

- PredictNext views under `app/components/UI/PredictNext/views/`
- Route registration switched to PredictNext views
- Component view presets/renderers/tests updated for PredictNext
- External consumer imports switched with a clean cut

## Step-by-Step Tasks

1. Create the new routed view set.
   - Add these directories under `app/components/UI/PredictNext/views/`:
     - `PredictHome/`
     - `EventDetails/`
     - `OrderScreen/`
     - `TransactionsView/`
     - `AddFundsModal/`
     - `UnavailableModal/`
   - If route parity demands old names temporarily, keep the folder names canonical but export route-compatible screen components.

2. Migrate the feed/home screen first.
   - Source from:
     - `app/components/UI/Predict/views/PredictFeed/`
     - `app/components/UI/Predict/views/PredictTabView/`
     - `app/components/UI/Predict/components/PredictHome/*`
     - `app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx`
   - Rebuild it using `useEvents`, `usePortfolio`, `EventFeed`, and `FeaturedCarousel`.
   - Add a component view test path matching the framework:
     - preset update: `tests/component-view/presets/predict.ts`
     - renderer update or replacement: `tests/component-view/renderers/predict.tsx`
     - screen test: `app/components/UI/PredictNext/views/PredictHome/PredictHome.view.test.tsx`

3. Migrate the event details screen.
   - Source from:
     - `app/components/UI/Predict/views/PredictMarketDetails/`
     - `app/components/UI/Predict/views/PredictMarketDetails/components/*`
     - `app/components/UI/Predict/views/PredictMarketDetails/hooks/*`
   - Rebuild with `useEvents`, `usePortfolio`, `useLiveData`, `EventCard`, `Scoreboard`, `Chart`, and `OrderForm` entry points.
   - Add:
     - renderer update or replacement: `tests/component-view/renderers/predictMarketDetails.tsx`
     - test file: `app/components/UI/PredictNext/views/EventDetails/EventDetails.view.test.tsx`

4. Migrate the order flow screen.
   - Source from:
     - `app/components/UI/Predict/views/PredictBuyWithAnyToken/`
     - `app/components/UI/Predict/views/PredictBuyPreview/`
     - `app/components/UI/Predict/views/PredictSellPreview/`
     - `app/components/UI/Predict/components/PredictOrderRetrySheet/`
     - `app/components/UI/Predict/components/PredictFeeBreakdownSheet/`
   - Collapse the existing screen variants into a single `OrderScreen` that uses `useTrading`, `useTransactions`, and `OrderForm`.
   - Add a component view test for key states:
     - preview,
     - pay-with-balance,
     - pay-with-any-token,
     - deposit in progress,
     - order error,
     - order success.

5. Migrate the transactions/activity surface.
   - Source from:
     - `app/components/UI/Predict/views/PredictTransactionsView/`
     - `app/components/UI/Predict/components/PredictActivity/`
     - `app/components/UI/Predict/components/PredictActivityDetail/`
   - Rebuild using `usePortfolio`, `useTransactions`, and `ActivityList`.
   - Add a component view test for empty, populated, and pending transaction states.

6. Migrate modal screens.
   - Rebuild:
     - `PredictAddFundsModal` -> `AddFundsModal`
     - `PredictUnavailableModal` -> `UnavailableModal`
     - `PredictGTMModal` only if still required after redesign; otherwise remove during view migration.
   - Source from:
     - `app/components/UI/Predict/views/PredictAddFundsModal/`
     - `app/components/UI/Predict/views/PredictUnavailableModal/`
     - `app/components/UI/Predict/components/PredictGTMModal/`

7. Switch navigation routes to the new views.
   - Update `app/components/UI/Predict/routes/index.tsx` to import from `PredictNext/views/*` during the transition, or create `app/components/UI/PredictNext/routes/index.tsx` and switch the navigator import at the feature entry point.
   - Keep route names in `app/constants/navigation/Routes.ts` unchanged to avoid cross-app churn.
   - Update `app/core/NavigationService/types.ts` if route param types move from old `Predict/types/navigation.ts` to `PredictNext/types/navigation.ts`.

8. Switch external consumers with a clean cut.
   - Update direct imports in external files to `PredictNext/` once the target view or widget is ready, including likely consumers such as:
     - `app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx`
     - `app/components/Views/Homepage/Sections/Predictions/components/PredictMarketCard.tsx`
     - `app/components/Views/TrendingView/sections.config.tsx`
     - `app/components/Views/Wallet/index.tsx`
     - `app/components/Views/WalletActions/WalletActions.tsx`
     - `app/components/Views/TradeWalletActions/TradeWalletActions.tsx`
     - `app/components/Views/BrowserTab/BrowserTab.tsx`
     - `app/core/DeeplinkManager/handlers/legacy/handlePredictUrl.ts`

9. Add component view tests instead of hook tests.
   - For every migrated view, create or update:
     - a preset in `tests/component-view/presets/predict.ts`,
     - a renderer in `tests/component-view/renderers/`,
     - one `*.view.test.tsx` file under the migrated view directory.
   - Test state-driven behavior through Redux/controller state and supported mocks only.

10. Leave old screens in place until all routes and consumers switch.
    - Do not delete `app/components/UI/Predict/views/*` in this phase.
    - Deletion belongs to Phase 8.

## Files Created

| File path                                                | Description                              | Estimated lines |
| -------------------------------------------------------- | ---------------------------------------- | --------------: |
| `app/components/UI/PredictNext/views/PredictHome/*`      | Migrated home/feed screen                |         160-260 |
| `app/components/UI/PredictNext/views/EventDetails/*`     | Migrated event details screen            |         180-280 |
| `app/components/UI/PredictNext/views/OrderScreen/*`      | Unified buy/sell/order screen            |         220-340 |
| `app/components/UI/PredictNext/views/TransactionsView/*` | Migrated activity/transactions screen    |         120-200 |
| `app/components/UI/PredictNext/views/AddFundsModal/*`    | Migrated add-funds modal                 |          80-140 |
| `app/components/UI/PredictNext/views/UnavailableModal/*` | Migrated unavailable modal               |          60-100 |
| `app/components/UI/PredictNext/views/*/*.view.test.tsx`  | Component view tests per migrated screen |     80-180 each |

## Files Affected in Old Code

| File path                                                                             | Expected change                                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `app/components/UI/Predict/routes/index.tsx`                                          | Switch routed components to PredictNext views                            |
| `app/core/NavigationService/types.ts`                                                 | Update import source for Predict route params if moved                   |
| `tests/component-view/presets/predict.ts`                                             | Update baseline state for PredictNext controller/view usage              |
| `tests/component-view/renderers/predict.tsx`                                          | Point renderer at PredictNext home/feed view                             |
| `tests/component-view/renderers/predictMarketDetails.tsx`                             | Point renderer at PredictNext details view                               |
| `app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx`           | Switch external embed to PredictNext component/view export               |
| `app/components/Views/Homepage/Sections/Predictions/components/PredictMarketCard.tsx` | Switch external embed to PredictNext primitive or widget                 |
| `app/core/DeeplinkManager/handlers/legacy/handlePredictUrl.ts`                        | Switch target imports if deeplink handler references old Predict modules |

## Acceptance Criteria

- All routed Predict screens have working PredictNext equivalents.
- The route stack uses PredictNext screens for migrated flows.
- Component view tests cover the major states of each migrated screen.
- External consumers import from PredictNext explicitly; no shim layer is introduced.
- Old views still exist only as fallback until the final cleanup begins.

## Estimated PRs

- 4-6 PRs total.
  1. Home/feed screen plus component view coverage.
  2. Event details screen plus component view coverage.
  3. Order screen plus component view coverage.
  4. Transactions/activity screen plus component view coverage.
  5. Modal and route-switch PR.
  6. External consumer import-switch PR if cross-team review scope needs isolation.
