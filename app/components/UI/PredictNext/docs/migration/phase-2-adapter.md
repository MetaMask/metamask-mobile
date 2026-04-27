# Phase 2: Adapter and Provider Migration

## Goal

Build the new PolymarketAdapter implementing the PredictAdapter interface. Incrementally redirect old PolymarketProvider API call sites to delegate to the new adapter. The old provider progressively becomes a thin shell that calls the adapter and translates results back to legacy types via compat mappers.

## Prerequisites

- Phase 1 complete (Canonical types, PredictAdapter interface, and compat mappers established).

## Deliverables

- `PolymarketAdapter.ts` fully implementing the `PredictAdapter` interface.
- Refactored `PolymarketProvider.ts` that delegates all core logic to the new adapter.
- Comprehensive unit tests for `PolymarketAdapter` using mocked API responses.

## Step-by-Step Tasks

### 1. Implement Read Methods in PolymarketAdapter

Create `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`. Move the data fetching logic from `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts` into the adapter.

- Implement `getEvents`, `getFeaturedEvents`, `getEvent`, `search`, and `getPriceHistory`.
- Ensure these methods return canonical types (`PredictEvent`, `PredictMarket`, `PredictOutcome`).
- Move any private helper methods for URL construction or response parsing from the old provider to the adapter.

### 2. Wire Read Methods in PolymarketProvider

Update `PolymarketProvider.ts` to use the new adapter for read operations.

- Inject `PolymarketAdapter` into the provider.
- Replace the internal logic of `getEvents`, `getEvent`, etc., with calls to the adapter.
- Use `toLegacyEvent` and `toLegacyMarket` from `app/components/UI/PredictNext/compat/mappers.ts` to convert canonical results back to legacy shapes.
- This ensures existing consumers in the old controller and hooks remain functional.

### 3. Implement Write and Transaction Methods

Move stateful write operations and transaction preparation logic to the adapter.

- Implement `getOrderPreview` and `placeOrder` in `PolymarketAdapter`.
- Move `prepareDeposit`, `prepareWithdrawal`, and `prepareClaim` logic.
- Update `PolymarketProvider` to delegate these calls, mapping legacy inputs to canonical types before calling the adapter.

### 4. Implement Live Data Subscriptions

Integrate the existing WebSocket logic into the adapter interface.

- Implement `subscribe` and `unsubscribe` in `PolymarketAdapter`.
- These methods should delegate to `app/components/UI/Predict/providers/polymarket/WebSocketManager.ts`.
- Ensure the adapter handles the mapping of incoming WebSocket messages to canonical types.

## Files Created

| File Path                                                                     | Description                                         | Estimated Lines |
| ----------------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`      | Implementation of PredictAdapter for Polymarket API | 600-800         |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.test.ts` | Unit tests for the new adapter                      | 300-400         |
| `app/components/UI/PredictNext/adapters/polymarket/index.ts`                  | Polymarket adapter barrel export                    | 5-10            |

## Files Affected in Old Code

| File Path                                                              | Expected Change                                                      |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts` | Logic removed and replaced with adapter delegation and type mapping. |

## Acceptance Criteria

- `PolymarketAdapter` passes all unit tests with 100% coverage of migrated methods.
- `PolymarketProvider` methods return the exact same legacy data shapes as before.
- No changes are required in `PredictController.ts` or any files in `app/components/UI/Predict/hooks/`.
- The app remains fully functional with the Predict feature enabled.

## Estimated PRs

- **PR 1**: Read methods implementation and provider wiring.
- **PR 2**: Write and transaction methods implementation.
- **PR 3**: Live data integration and final provider cleanup.
