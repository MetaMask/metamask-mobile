# Phase 5: Hooks

## Goal

Replace the current fragmented hook layer with seven deep hooks that expose stable, feature-oriented APIs over the new controller and services.

## Prerequisites

- Phase 4 complete.

## Deliverables

- Seven consolidated hooks in `app/components/UI/PredictNext/hooks/`
- PredictNext hook barrel exports
- Legacy hook-to-new-hook mapping for view migration work

## Step-by-Step Tasks

1. Create the new hook directory structure.
   - Add files:
     - `app/components/UI/PredictNext/hooks/useEvents.ts`
     - `app/components/UI/PredictNext/hooks/usePortfolio.ts`
     - `app/components/UI/PredictNext/hooks/useTrading.ts`
     - `app/components/UI/PredictNext/hooks/useTransactions.ts`
     - `app/components/UI/PredictNext/hooks/useLiveData.ts`
     - `app/components/UI/PredictNext/hooks/usePredictNavigation.ts`
     - `app/components/UI/PredictNext/hooks/usePredictGuard.ts`
     - `app/components/UI/PredictNext/hooks/index.ts`

2. Build `useEvents` on top of `@metamask/react-data-query`.
   - Use `useQuery` or `useInfiniteQuery` for:
     - featured events,
     - event feed,
     - search,
     - event details,
     - price history.
   - Consolidate functionality currently scattered across:
     - `app/components/UI/Predict/hooks/usePredictMarket.tsx`
     - `app/components/UI/Predict/hooks/usePredictMarketData.tsx`
     - `app/components/UI/Predict/hooks/usePredictPriceHistory.tsx`
     - `app/components/UI/Predict/hooks/useFeaturedCarouselData.ts`
     - `app/components/UI/Predict/hooks/usePredictSeries.ts`
     - `app/components/UI/Predict/hooks/usePredictSearch.ts`

3. Build `usePortfolio` on top of `@metamask/react-data-query`.
   - Consolidate:
     - `usePredictBalance`
     - `usePredictPositions`
     - `usePredictActivity`
     - `useUnrealizedPnL`
     - `usePredictRewards`
     - `usePredictAccountState`
     - `usePredictBalanceTokenFilter`
   - Return a normalized object centered on balances, positions, activity, and account status.

4. Build `useTrading` as the write hook for order lifecycle.
   - Wrap `TradingService` or controller calls for:
     - order preview,
     - place order,
     - retry order,
     - active-order status,
     - selected payment token.
   - Fold in current concerns from:
     - `usePredictTrading`
     - `usePredictPlaceOrder`
     - `usePredictOrderPreview`
     - `usePredictActiveOrder`
     - `usePredictOrderRetry`
     - `views/PredictBuyWithAnyToken/hooks/*`

5. Build `useTransactions`.
   - Consolidate:
     - `usePredictDeposit`
     - `usePredictWithdraw`
     - `usePredictClaim`
     - transaction status watching currently done through controller selectors and side effects.
   - Return a narrow API for deposit, withdraw, claim, and pending states.

6. Build `useLiveData`.
   - Wrap `LiveDataService` and expose one subscription-oriented hook instead of three parallel hooks.
   - Cover use cases from:
     - `useLiveGameUpdates`
     - `useLiveMarketPrices`
     - `usePredictLivePositions`
     - `useLiveCryptoPrices`

7. Build `usePredictNavigation` and `usePredictGuard`.
   - `usePredictNavigation` should absorb navigation helpers from:
     - `app/components/UI/Predict/hooks/usePredictNavigation.ts`
     - tab helpers like `usePredictTabs.ts`
   - `usePredictGuard` should centralize eligibility and action gating from:
     - `usePredictEligibility.ts`
     - `usePredictActionGuard.ts`
     - `usePredictNetworkManagement.ts`
   - Keep these hooks thin and feature-specific; they should not contain controller business logic.

8. Remove the requirement for standalone hook tests.
   - Do not add bespoke hook test suites unless a hook has substantial pure logic.
   - The main verification path should be component view tests in Phase 7.

9. Document the mapping from old hooks to new ones for migration work.
   - Include this mapping in review notes or code comments so every migrated view knows which old hook cluster it replaces.
   - Example mapping:
     - `usePredictMarketData`, `useFeaturedCarouselData`, `usePredictSearch` -> `useEvents`
     - `usePredictBalance`, `usePredictPositions`, `usePredictActivity` -> `usePortfolio`
     - `usePredictTrading`, `usePredictOrderPreview`, `usePredictPlaceOrder` -> `useTrading`

## Files Created

| File path                                                     | Description                                       | Estimated lines |
| ------------------------------------------------------------- | ------------------------------------------------- | --------------: |
| `app/components/UI/PredictNext/hooks/useEvents.ts`            | Event feed/details/history/search hook            |         120-180 |
| `app/components/UI/PredictNext/hooks/usePortfolio.ts`         | Portfolio, balances, activity, account state hook |         120-180 |
| `app/components/UI/PredictNext/hooks/useTrading.ts`           | Order preview and placement hook                  |         120-180 |
| `app/components/UI/PredictNext/hooks/useTransactions.ts`      | Deposit, withdraw, claim hook                     |          80-140 |
| `app/components/UI/PredictNext/hooks/useLiveData.ts`          | Live subscription hook                            |          80-140 |
| `app/components/UI/PredictNext/hooks/usePredictNavigation.ts` | Predict navigation helper hook                    |          60-100 |
| `app/components/UI/PredictNext/hooks/usePredictGuard.ts`      | Eligibility and action guard hook                 |          60-100 |
| `app/components/UI/PredictNext/hooks/index.ts`                | Hook barrel exports                               |           20-30 |

## Files Affected in Old Code

| File path                                                        | Expected change                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `app/components/UI/Predict/hooks/*`                              | None in this phase; old hooks remain until each view switches |
| `app/components/UI/Predict/views/PredictBuyWithAnyToken/hooks/*` | None in this phase                                            |
| `app/components/UI/Predict/hooks/index.ts`                       | None in this phase                                            |

## Acceptance Criteria

- Seven hooks cover the full public React API needed by Predict views.
- `useEvents` and `usePortfolio` use `@metamask/react-data-query` instead of bespoke async state handling.
- `useTrading`, `useTransactions`, and `useLiveData` are thin wrappers over the controller/services, not independent business-logic centers.
- Navigation and eligibility logic are centralized behind `usePredictNavigation` and `usePredictGuard`.
- New hooks are ready for screen migration without requiring the old hook layer.

## Estimated PRs

- 3-4 PRs total.
  1. Read hooks: `useEvents` and `usePortfolio`.
  2. Write hooks: `useTrading` and `useTransactions`.
  3. `useLiveData`, `usePredictNavigation`, and `usePredictGuard`.
  4. Optional adoption prep PR if cross-hook API alignment needs its own review.
