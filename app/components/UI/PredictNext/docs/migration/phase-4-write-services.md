# Phase 4: Write Services

## Goal

Extract stateful and write-heavy business logic from the old controller into focused PredictNext services: TradingService, TransactionService, LiveDataService, AnalyticsService. Hook old PredictController write methods to delegate to these new services.

## Prerequisites

- Phase 2 complete (PolymarketAdapter is functional).
- Phase 3 can run in parallel with this phase.

## Deliverables

- `TradingService.ts` managing the order lifecycle and trading state.
- `TransactionService.ts` handling on-chain operations and Safe orchestration.
- `LiveDataService.ts` providing a unified interface for real-time updates.
- `AnalyticsService.ts` centralizing all feature-specific tracking.
- Refactored `PredictController.ts` where write methods delegate to these services.

## Step-by-Step Tasks

### 1. Build TradingService

Create `app/components/UI/PredictNext/services/trading/TradingService.ts`. This service handles the complexity of placing and managing orders.

- Move the active-order state machine from `PredictController.ts`.
- Extract logic from trading hooks such as `usePredictTrading`, `usePredictPlaceOrder`, and `usePredictOrderPreview`.
- Implement `placeOrder`, `cancelOrder`, and `retryOrder` methods.
- Manage payment token selection and order validation logic.

### 2. Build TransactionService

Create `app/components/UI/PredictNext/services/transactions/TransactionService.ts`. This service orchestrates complex on-chain interactions.

- Move Safe and Permit2 logic from `app/components/UI/Predict/providers/polymarket/safe/*` and the old controller.
- Implement `deposit`, `withdraw`, and `claim` operations.
- Add a robust pending transaction tracking system to monitor the status of submitted transactions.
- Ensure proper error handling for gas estimation and execution failures.

### 3. Build LiveDataService

Create `app/components/UI/PredictNext/services/live-data/LiveDataService.ts`. This service unifies real-time data streams.

- Consolidate logic from parallel live hooks like `useLiveGameUpdates`, `useLiveMarketPrices`, and `usePredictLivePositions`.
- Use the adapter's `subscribe` and `unsubscribe` methods to manage WebSocket connections.
- Provide a single point of entry for components to listen for market and portfolio updates.

### 4. Build AnalyticsService

Create `app/components/UI/PredictNext/services/analytics/AnalyticsService.ts`. This service centralizes all tracking logic.

- Move the event API from `app/components/UI/Predict/controllers/PredictAnalytics.ts`.
- Extract embedded analytics calls from the old controller and buy flow hooks.
- Provide a clean interface for logging user actions, errors, and performance metrics.

### 5. Update PredictController Write Methods

Modify `app/components/UI/Predict/controllers/PredictController.ts` to delegate to the new write services.

- Identify methods like `placeOrder`, `depositFunds`, `withdrawFunds`, and `claimRewards`.
- Replace their internal logic with calls to the appropriate new service.
- Translate legacy command parameters to canonical types at the controller boundary.
- Map service responses back to legacy state shapes to keep old hooks and UI functional.

## Files Created

| File Path                                                                        | Description                                        | Estimated Lines |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | --------------- |
| `app/components/UI/PredictNext/services/trading/TradingService.ts`               | Service for order management and trading logic     | 400-700         |
| `app/components/UI/PredictNext/services/trading/TradingService.test.ts`          | Trading service tests                              | 250-400         |
| `app/components/UI/PredictNext/services/transactions/TransactionService.ts`      | Service for Safe/Permit2 and on-chain transactions | 500-800         |
| `app/components/UI/PredictNext/services/transactions/TransactionService.test.ts` | Transaction service tests                          | 300-450         |
| `app/components/UI/PredictNext/services/live-data/LiveDataService.ts`            | Service for unified real-time data subscriptions   | 200-400         |
| `app/components/UI/PredictNext/services/live-data/LiveDataService.test.ts`       | Live data service tests                            | 150-250         |
| `app/components/UI/PredictNext/services/analytics/AnalyticsService.ts`           | Service for centralized feature analytics          | 150-300         |
| `app/components/UI/PredictNext/services/analytics/AnalyticsService.test.ts`      | Analytics service tests                            | 100-180         |

## Files Affected in Old Code

| File Path                                                    | Expected Change                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `app/components/UI/Predict/controllers/PredictController.ts` | Write methods refactored to delegate to new services.        |
| `app/components/UI/Predict/controllers/PredictAnalytics.ts`  | Logic moved to AnalyticsService; file eventually deprecated. |

## Acceptance Criteria

- All new services pass unit tests with mocked dependencies.
- The trading flow remains functional from the user's perspective.
- Transactions (deposit, withdraw, claim) are processed correctly through the new service layer.
- Real-time updates continue to flow to the UI without interruption.
- Analytics events are still correctly reported to the backend.

## Estimated PRs

- **PR 1**: TradingService implementation and controller wiring.
- **PR 2**: TransactionService implementation and Safe logic migration.
- **PR 3**: LiveDataService and AnalyticsService implementation.
- **PR 4**: Final controller cleanup and write method delegation.
