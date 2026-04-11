# Phase 3: Imperative Services

## Goal

Extract stateful and write-heavy business logic from the old monolithic controller into focused PredictNext services for trading, transactions, live data, and analytics.

## Prerequisites

- Phase 1 complete.
- Phase 2 read services can exist in parallel but are not a hard blocker for all service extraction work.

## Deliverables

- `TradingService`
- `TransactionService`
- `LiveDataService`
- `AnalyticsService`
- Supporting types and tests

## Step-by-Step Tasks

1. Extract `TradingService` first because it defines the main active-order state machine.
   - Create `app/components/UI/PredictNext/services/trading/TradingService.ts`.
   - Migrate the buy/sell/order-preview flow out of:
     - `app/components/UI/Predict/controllers/PredictController.ts`
     - `app/components/UI/Predict/hooks/usePredictTrading.ts`
     - `app/components/UI/Predict/hooks/usePredictPlaceOrder.ts`
     - `app/components/UI/Predict/hooks/usePredictOrderPreview.ts`
     - `app/components/UI/Predict/hooks/usePredictActiveOrder.ts`
     - `app/components/UI/Predict/hooks/usePredictOrderRetry.ts`
     - `app/components/UI/Predict/views/PredictBuyWithAnyToken/hooks/*`
   - Define a slim public interface that covers:
     - preview order,
     - place buy order,
     - place sell order,
     - reset active order,
     - clear order error,
     - set selected payment token,
     - get active-order snapshot.
   - Move the active-order state machine out of hooks and into the service.

2. Extract `TransactionService`.
   - Create `app/components/UI/PredictNext/services/transactions/TransactionService.ts`.
   - Move deposit, withdraw, claim, Safe, Permit2, and transaction side-effect logic from:
     - `app/components/UI/Predict/controllers/PredictController.ts`
     - `app/components/UI/Predict/providers/polymarket/safe/*`
     - `app/components/UI/Predict/hooks/usePredictDeposit.ts`
     - `app/components/UI/Predict/hooks/usePredictWithdraw.ts`
     - `app/components/UI/Predict/hooks/usePredictClaim.ts`
   - Give this service responsibility for:
     - preparing deposit transactions,
     - handling deposit-and-order chaining,
     - preparing withdrawals,
     - preparing claims,
     - tracking pending transaction ids and statuses.
   - Normalize all service failures to `PredictError`.

3. Extract `LiveDataService`.
   - Create `app/components/UI/PredictNext/services/live-data/LiveDataService.ts`.
   - Consolidate the three nearly identical live hooks:
     - `app/components/UI/Predict/hooks/useLiveGameUpdates.ts`
     - `app/components/UI/Predict/hooks/useLiveMarketPrices.ts`
     - `app/components/UI/Predict/hooks/usePredictLivePositions.ts`
   - Back it initially with:
     - `app/components/UI/Predict/providers/polymarket/WebSocketManager.ts`
     - any provider subscription helpers already living in `PolymarketProvider.ts`
   - Public API should expose subscribe/unsubscribe methods keyed by event ids, market ids, or account addresses, not React-specific hooks.

4. Extract `AnalyticsService`.
   - Create `app/components/UI/PredictNext/services/analytics/AnalyticsService.ts`.
   - Fold analytics concerns from:
     - `app/components/UI/Predict/controllers/PredictAnalytics.ts`
     - analytics branches inside `app/components/UI/Predict/controllers/PredictController.ts`
     - screen-specific analytics currently embedded in `views/PredictBuyWithAnyToken/hooks/usePredictBuyActions.ts`
     - measurement helpers such as `app/components/UI/Predict/hooks/usePredictMeasurement.ts`
   - Standardize a small event API for:
     - feed impressions,
     - event detail opens,
     - preview generated,
     - order submitted,
     - order succeeded/failed,
     - deposit/withdraw/claim succeeded/failed.

5. Create service-local types and state modules.
   - Add:
     - `app/components/UI/PredictNext/services/trading/types.ts`
     - `app/components/UI/PredictNext/services/transactions/types.ts`
     - `app/components/UI/PredictNext/services/live-data/types.ts`
     - `app/components/UI/PredictNext/services/analytics/types.ts`
   - Keep ephemeral state owned by each service instead of a giant controller state object.

6. Write integration-style tests using a mock adapter and mock transaction dependencies.
   - `app/components/UI/PredictNext/services/trading/TradingService.test.ts`
   - `app/components/UI/PredictNext/services/transactions/TransactionService.test.ts`
   - `app/components/UI/PredictNext/services/live-data/LiveDataService.test.ts`
   - `app/components/UI/PredictNext/services/analytics/AnalyticsService.test.ts`
   - Verify the active order transitions, chained deposit-and-order flow, live subscription fan-out, and analytics event normalization.

7. Keep old controller active until Phase 4.
   - These services should be instantiable and tested, but not yet the production controller entry point.
   - Temporary imports from old `Predict/` utilities are acceptable where they are pure and stable.

## Files Created

| File path                                                                        | Description                                                  | Estimated lines |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------: |
| `app/components/UI/PredictNext/services/trading/TradingService.ts`               | Active-order state machine and order placement orchestration |         250-380 |
| `app/components/UI/PredictNext/services/trading/types.ts`                        | Trading state and command/result types                       |          60-100 |
| `app/components/UI/PredictNext/services/trading/TradingService.test.ts`          | Trading service integration-style tests                      |         220-320 |
| `app/components/UI/PredictNext/services/transactions/TransactionService.ts`      | Deposit, withdraw, claim, Safe, Permit2 orchestration        |         220-340 |
| `app/components/UI/PredictNext/services/transactions/types.ts`                   | Transaction state types                                      |           50-90 |
| `app/components/UI/PredictNext/services/transactions/TransactionService.test.ts` | Transaction service tests                                    |         220-320 |
| `app/components/UI/PredictNext/services/live-data/LiveDataService.ts`            | Unified real-time subscription service                       |         140-220 |
| `app/components/UI/PredictNext/services/live-data/types.ts`                      | Live subscription key and payload types                      |           30-60 |
| `app/components/UI/PredictNext/services/live-data/LiveDataService.test.ts`       | Live data service tests                                      |         140-220 |
| `app/components/UI/PredictNext/services/analytics/AnalyticsService.ts`           | Central Predict analytics API                                |         100-160 |
| `app/components/UI/PredictNext/services/analytics/types.ts`                      | Analytics payload definitions                                |           30-60 |
| `app/components/UI/PredictNext/services/analytics/AnalyticsService.test.ts`      | Analytics service tests                                      |          80-140 |

## Files Affected in Old Code

| File path                                                            | Expected change                                                                  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `app/components/UI/Predict/controllers/PredictController.ts`         | None in this phase except optional extraction-friendly helper visibility changes |
| `app/components/UI/Predict/controllers/PredictAnalytics.ts`          | None in this phase; reference source only                                        |
| `app/components/UI/Predict/providers/polymarket/WebSocketManager.ts` | Usually none; optional tiny export adjustments only                              |
| `app/components/UI/Predict/providers/polymarket/safe/*`              | Usually none; consumed by new transaction service where needed                   |
| `app/components/UI/Predict/views/PredictBuyWithAnyToken/hooks/*`     | None in this phase                                                               |

## Acceptance Criteria

- Each imperative concern is represented by one focused service with a slim public API.
- `TradingService` owns the active-order state machine; hooks no longer need to encode it conceptually.
- `TransactionService` owns deposit, withdraw, claim, and transaction-side-effect sequencing.
- `LiveDataService` replaces the three parallel live hooks with one reusable subscription layer.
- `AnalyticsService` is the single place for Predict tracking calls in new code.
- All four services are covered by tests using mocks rather than production network or websocket dependencies.

## Estimated PRs

- 4-5 PRs total.
  1. TradingService extraction.
  2. TransactionService extraction.
  3. LiveDataService extraction.
  4. AnalyticsService extraction.
  5. Optional stabilization PR for shared types and service composition.
