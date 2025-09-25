# Perps Sentry Performance Monitoring Reference

Current performance measurements tracked in production Perps feature.

---

## Funding Flow

### Funding Screen Input Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Measurement:** `FUNDING_SCREEN_INPUT_LOADED`
**Location:** `deposit.tsx` + `usePerpsMeasurement`

### Source Token List Loaded

**Target:** 1s (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `FUNDING_SOURCE_TOKEN_LIST_LOADED`
**Location:** `usePerpsDepositView.ts` + `usePerpsMeasurement`

### Quote Received

**Target:** 2s (HIGH) | **Status:** ✅ Implemented
**Measurement:** `QUOTE_RECEIVED`
**Location:** `usePerpsDepositView.ts` + `usePerpsMeasurement`

### Transaction Submission/Confirmation

**Target:** 1s/30s | **Status:** ⚠️ Deferred
**Reason:** Requires transaction controller integration

---

## Withdrawal Flow

### Withdrawal Screen Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `WITHDRAWAL_SCREEN_LOADED`
**Location:** `PerpsWithdrawView.tsx` + `usePerpsMeasurement`

---

## Trading Flow

### Markets Screen Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Measurement:** `MARKETS_SCREEN_LOADED`
**Location:** `PerpsMarketListView.tsx` + `usePerpsMeasurement`

### Asset Screen Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Measurement:** `ASSET_SCREEN_LOADED`
**Location:** `PerpsMarketDetailsView.tsx` + `usePerpsMeasurement`

### Trade Screen Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Measurement:** `TRADE_SCREEN_LOADED`
**Location:** `PerpsOrderView.tsx` + `usePerpsMeasurement`

### Order Submission Toast Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `ORDER_SUBMISSION_TOAST_LOADED`
**Location:** `usePerpsOrderExecution.ts` + `usePerpsMeasurement`

### Order Confirmation Toast Loaded

**Target:** 1s (HIGH) | **Status:** ✅ Implemented
**Measurement:** `ORDER_CONFIRMATION_TOAST_LOADED`
**Location:** `usePerpsOrderExecution.ts` + direct `setMeasurement`

---

## Position Close Flow

### Close Screen Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `CLOSE_SCREEN_LOADED`
**Location:** `PerpsClosePositionView.tsx` + `usePerpsMeasurement`

### Close Order Submission Toast Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `CLOSE_ORDER_SUBMISSION_TOAST_LOADED`
**Location:** `usePerpsClosePosition.ts` + `usePerpsMeasurement`

### Close Order Confirmation Toast Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `CLOSE_ORDER_CONFIRMATION_TOAST_LOADED`
**Location:** `usePerpsClosePosition.ts` + direct `setMeasurement`

---

## Transaction History

### History Screen Loaded

**Target:** 1s (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `TRANSACTION_HISTORY_SCREEN_LOADED`
**Location:** `PerpsTransactionsView.tsx` + `usePerpsMeasurement`

### Perps Tab Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `PERPS_TAB_LOADED`
**Location:** `PerpsTabView.tsx` + `usePerpsMeasurement`

---

## API Performance

### Data Lake API Call

**Target:** 2s | **Status:** ✅ Implemented
**Measurement:** `DATA_LAKE_API_CALL`
**Location:** `PerpsController.ts` + direct `setMeasurement`

### Data Lake API Retry

**Target:** 5s | **Status:** ✅ Implemented
**Measurement:** `DATA_LAKE_API_RETRY`
**Location:** `PerpsController.ts` + direct `setMeasurement`

### Rewards Fee Discount API Call

**Target:** 2s | **Status:** ✅ Implemented
**Measurement:** `REWARDS_FEE_DISCOUNT_API_CALL`
**Location:** `usePerpsOrderFees.ts` + direct `setMeasurement`

### Rewards Points Estimation API Call

**Target:** 2s | **Status:** ✅ Implemented
**Measurement:** `REWARDS_POINTS_ESTIMATION_API_CALL`
**Location:** `usePerpsOrderFees.ts` + direct `setMeasurement`

### Rewards Order Execution Fee Discount API Call

**Target:** 2s | **Status:** ✅ Implemented
**Measurement:** `REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL`
**Location:** `PerpsController.ts` + direct `setMeasurement`

---

## WebSocket Performance

### WebSocket Connection Establishment

**Target:** 2s (HIGH) | **Status:** ✅ Implemented
**Measurement:** `WEBSOCKET_CONNECTION_ESTABLISHMENT`
**Location:** `PerpsConnectionManager.ts` + direct `setMeasurement`

### WebSocket Connection with Preload

**Target:** 4s (HIGH) | **Status:** ✅ Implemented
**Measurement:** `WEBSOCKET_CONNECTION_WITH_PRELOAD`
**Location:** `PerpsConnectionManager.ts` + direct `setMeasurement`

### WebSocket First Position Data

**Target:** 1s (HIGH) | **Status:** ✅ Implemented
**Measurement:** `WEBSOCKET_FIRST_POSITION_DATA`
**Location:** `PerpsStreamManager.tsx` + direct `setMeasurement`

### WebSocket Account Context Switch

**Target:** 3s (MEDIUM) | **Status:** ✅ Implemented
**Measurement:** `WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION`
**Location:** `PerpsConnectionManager.ts` + direct `setMeasurement`

---

## Implementation Notes

- **Hook-based (React components):** Screen loads, deposit flow, submission toasts → `usePerpsMeasurement`
- **Direct calls (services/controllers):** WebSocket, API, confirmation toasts → `setMeasurement`
- **Migration completed:** Submission toasts migrated to unified hooks for consistency
- **Direct calls rationale:** Confirmation toasts require complex async timing (position fetching, delays)
- **Targets:** Aligned with Sentry dashboard p75 requirements
- **Logging:** Use `PERPSMARK_SENTRY` marker for performance data
- **Removed:** Bottom sheet measurements (0ms readings), balance updates (synchronous), position data renders (cached WebSocket data)
