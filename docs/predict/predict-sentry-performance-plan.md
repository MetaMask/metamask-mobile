# Predict Sentry Performance Tracking Plan

## Overview

This document outlines the comprehensive plan to implement Sentry performance tracking for the Predict feature, following the established patterns from the Perps feature. The implementation will enable monitoring of:

- UI screen load performance
- Trading operation execution
- Data fetch operations
- API integration timing
- User interaction flows

## Implementation Approach

### Two-Tiered Tracing System

Following Perps' proven pattern, we'll implement:

1. **`usePredictMeasurement` Hook** - For UI component/screen load performance
2. **Direct `trace()` / `setMeasurement()`** - For controller operations, API calls, data fetches

---

## Phase 1: Infrastructure Setup

### 1.1 Create Performance Metrics Constants

**File:** `app/components/UI/Predict/constants/performanceMetrics.ts`

```typescript
/**
 * Performance measurement names for Sentry monitoring
 * These constants ensure consistency across the Predict feature
 * Used for direct setMeasurement() calls in controllers and services
 *
 * Naming Convention: predict.{category}.{metric_name}
 * - Uses dot notation for hierarchical grouping in Sentry
 * - Categories: api, operation, screen, ui, data
 * - Enables easy filtering (e.g., predict.api.*) and dashboard aggregation
 */
export enum PredictMeasurementName {
  // ===== SCREEN LOAD METRICS =====
  // UI screen render performance (milliseconds)
  PREDICT_FEED_SCREEN_LOADED = 'predict.screen.feed_loaded',
  PREDICT_MARKET_DETAILS_SCREEN_LOADED = 'predict.screen.market_details_loaded',
  PREDICT_BUY_PREVIEW_SCREEN_LOADED = 'predict.screen.buy_preview_loaded',
  PREDICT_SELL_PREVIEW_SCREEN_LOADED = 'predict.screen.sell_preview_loaded',
  PREDICT_ACTIVITY_DETAIL_SCREEN_LOADED = 'predict.screen.activity_detail_loaded',
  PREDICT_TRANSACTION_HISTORY_SCREEN_LOADED = 'predict.screen.transaction_history_loaded',
  PREDICT_TAB_VIEW_LOADED = 'predict.screen.tab_view_loaded',

  // ===== UI COMPONENT METRICS =====
  // Individual UI component render performance (milliseconds)
  PREDICT_ADD_FUNDS_MODAL_LOADED = 'predict.ui.add_funds_modal_loaded',
  PREDICT_UNAVAILABLE_MODAL_LOADED = 'predict.ui.unavailable_modal_loaded',

  // Toast notification display performance (milliseconds)
  PREDICT_ORDER_SUBMISSION_TOAST_LOADED = 'predict.ui.order_submission_toast_loaded',
  PREDICT_ORDER_CONFIRMATION_TOAST_LOADED = 'predict.ui.order_confirmation_toast_loaded',
  PREDICT_CASHOUT_SUBMISSION_TOAST_LOADED = 'predict.ui.cashout_submission_toast_loaded',
  PREDICT_CASHOUT_CONFIRMATION_TOAST_LOADED = 'predict.ui.cashout_confirmation_toast_loaded',

  // ===== DATA OPERATION METRICS =====
  // Data fetch operations (milliseconds)
  PREDICT_GET_MARKETS_OPERATION = 'predict.operation.get_markets',
  PREDICT_GET_MARKET_OPERATION = 'predict.operation.get_market',
  PREDICT_GET_POSITIONS_OPERATION = 'predict.operation.get_positions',
  PREDICT_GET_ACTIVITY_OPERATION = 'predict.operation.get_activity',
  PREDICT_GET_BALANCE_OPERATION = 'predict.operation.get_balance',
  PREDICT_GET_ACCOUNT_STATE_OPERATION = 'predict.operation.get_account_state',
  PREDICT_GET_PRICE_HISTORY_OPERATION = 'predict.operation.get_price_history',
  PREDICT_GET_PRICES_OPERATION = 'predict.operation.get_prices',
  PREDICT_GET_UNREALIZED_PNL_OPERATION = 'predict.operation.get_unrealized_pnl',

  // ===== TRADING OPERATIONS =====
  // Order preview and execution timing (milliseconds)
  PREDICT_ORDER_PREVIEW_OPERATION = 'predict.operation.order_preview',
  PREDICT_PLACE_ORDER_OPERATION = 'predict.operation.place_order',

  // ===== CLAIM & WITHDRAW OPERATIONS =====
  PREDICT_CLAIM_OPERATION = 'predict.operation.claim',
  PREDICT_DEPOSIT_PREPARATION = 'predict.operation.deposit_preparation',
  PREDICT_WITHDRAW_PREPARATION = 'predict.operation.withdraw_preparation',

  // ===== API INTEGRATION METRICS =====
  // External API call performance (milliseconds)
  PREDICT_POLYMARKET_API_CALL = 'predict.api.polymarket_call',
  PREDICT_CLOB_API_CALL = 'predict.api.clob_call',
  PREDICT_GAMMA_API_CALL = 'predict.api.gamma_call',
}
```

### 1.2 Update Config Constants

**File:** `app/components/UI/Predict/constants/errors.ts` (add to existing file)

```typescript
/**
 * Performance logging configuration
 */
export const PREDICT_PERFORMANCE_CONFIG = {
  /**
   * Performance logging markers for filtering logs during development and debugging
   * These markers help isolate performance-related logs from general application logs
   * Usage: Use in DevLogger calls to easily filter specific performance areas
   * Impact: Development only (uses DevLogger) - zero production performance cost
   *
   * Examples:
   * - Filter Sentry performance logs: `adb logcat | grep PREDICTMARK_SENTRY`
   * - Filter MetaMetrics events: `adb logcat | grep PREDICTMARK_METRICS`
   * - Filter API performance: `adb logcat | grep PREDICTMARK_API`
   * - Filter all Predict performance: `adb logcat | grep PREDICTMARK_`
   */
  LOGGING_MARKERS: {
    // Sentry performance measurement logs (screen loads, components, API timing)
    SENTRY_PERFORMANCE: 'PREDICTMARK_SENTRY',

    // MetaMetrics event tracking logs (user interactions, business analytics)
    METAMETRICS_EVENTS: 'PREDICTMARK_METRICS',

    // API performance logs (external API call timing, data operations)
    API_PERFORMANCE: 'PREDICTMARK_API',
  } as const,
} as const;
```

### 1.3 Create usePredictMeasurement Hook

**File:** `app/components/UI/Predict/hooks/usePredictMeasurement.ts`

```typescript
import { useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { PREDICT_PERFORMANCE_CONFIG } from '../constants/errors';

// Static helper functions - moved outside component to avoid recreation
const allTrue = (conditionArray: boolean[]): boolean =>
  conditionArray.length > 0 && conditionArray.every(Boolean);

const anyTrue = (conditionArray: boolean[]): boolean =>
  conditionArray.some(Boolean);

interface MeasurementOptions {
  traceName: TraceName;
  op?: TraceOperation; // Optional operation type, defaults to PredictOperation

  // Simple API - most common case
  conditions?: boolean[]; // Start immediately, end when all conditions are true

  // Advanced API - full control
  startConditions?: boolean[];
  endConditions?: boolean[];
  resetConditions?: boolean[];

  debugContext?: Record<string, unknown>;
}

/**
 * Unified hook for performance measurement with conditional start/end logic
 *
 * Replaces manual useEffect patterns with a declarative approach:
 * - Automatically starts measurement when ALL startConditions are true (or immediately if none provided)
 * - Completes measurement when ALL endConditions are true
 * - Resets measurement when ANY resetCondition is true
 *
 * @example
 * // SIMPLE: Immediate single measurement (most common case)
 * usePredictMeasurement({
 *   traceName: TraceName.PredictFeedView,
 *   // No conditions = immediate measurement
 *   // op defaults to PredictOperation
 * });
 *
 * @example
 * // CONDITIONAL: Wait for data before measuring
 * usePredictMeasurement({
 *   traceName: TraceName.PredictMarketDetailsView,
 *   conditions: [dataLoaded, !isLoading] // Start immediately, end when both true
 * });
 *
 * @example
 * // MODAL: With auto-reset
 * usePredictMeasurement({
 *   traceName: TraceName.PredictBuyPreviewView,
 *   conditions: [isVisible, !!marketData], // Auto-resets when !isVisible
 *   debugContext: { marketId }
 * });
 *
 * @example
 * // ADVANCED: Full control when needed
 * usePredictMeasurement({
 *   traceName: TraceName.PredictOrderExecution,
 *   op: TraceOperation.PredictOrderSubmission, // Override default operation
 *   startConditions: [userInteracted, dataReady],
 *   endConditions: [workflowComplete, !hasErrors],
 *   resetConditions: [userCanceled, sessionExpired]
 * });
 */
export const usePredictMeasurement = ({
  traceName,
  op = TraceOperation.PredictOperation,
  conditions,
  startConditions,
  endConditions,
  resetConditions,
  debugContext = {},
}: MeasurementOptions) => {
  const hasCompleted = useRef(false);
  const previousStartState = useRef(false);
  const previousEndState = useRef(false);
  const traceStarted = useRef(false);
  const traceId = useRef<string>(uuidv4());

  // Memoize smart defaults logic to avoid recalculation on every render
  const { actualStartConditions, actualEndConditions, actualResetConditions } =
    useMemo(() => {
      if (conditions) {
        // Simple API: start immediately, end when conditions are met
        return {
          actualStartConditions: [],
          actualEndConditions: conditions,
          // Smart default: reset when first condition becomes false (e.g., visibility)
          actualResetConditions:
            resetConditions || (conditions.length > 0 ? [!conditions[0]] : []),
        };
      }

      // Default case - immediate single measurement
      if (!startConditions && !endConditions && !resetConditions) {
        return {
          actualStartConditions: [],
          actualEndConditions: [true], // Always true = immediate completion
          actualResetConditions: [], // No reset needed for single measurement
        };
      }

      // Advanced API: explicit control
      return {
        actualStartConditions: startConditions || [],
        actualEndConditions: endConditions || [],
        actualResetConditions: resetConditions || [],
      };
    }, [conditions, startConditions, endConditions, resetConditions]);

  // Memoize condition checks to avoid recalculation
  const shouldStart = useMemo(
    () => actualStartConditions.length === 0 || allTrue(actualStartConditions),
    [actualStartConditions],
  );

  const shouldEnd = useMemo(
    () => allTrue(actualEndConditions),
    [actualEndConditions],
  );

  const shouldReset = useMemo(
    () => anyTrue(actualResetConditions),
    [actualResetConditions],
  );

  useEffect(() => {
    // Handle reset conditions
    if (shouldReset && (traceStarted.current || hasCompleted.current)) {
      // End any active trace before resetting
      if (traceStarted.current) {
        endTrace({
          name: traceName,
          id: traceId.current,
          data: {
            success: false,
            reason: 'reset',
          },
        });
        traceStarted.current = false;
      }
      hasCompleted.current = false;
      previousStartState.current = false;
      previousEndState.current = false;
      return;
    }

    // Handle start conditions
    if (shouldStart && !previousStartState.current && !traceStarted.current) {
      // Generate a new trace ID for this measurement cycle
      traceId.current = uuidv4();

      // Start a Sentry trace using the provided trace name
      trace({
        name: traceName,
        op,
        id: traceId.current,
        data: debugContext as Record<string, string | number | boolean>,
      });
      traceStarted.current = true;
    }

    // Handle end conditions
    if (
      shouldEnd &&
      !previousEndState.current &&
      traceStarted.current &&
      !hasCompleted.current
    ) {
      // Pre-build log object to avoid conditional spread operations
      const logData: Record<string, unknown> = {
        metric: traceName,
        endConditions: actualEndConditions.length,
        context: debugContext,
      };

      DevLogger.log(
        `${PREDICT_PERFORMANCE_CONFIG.LOGGING_MARKERS.SENTRY_PERFORMANCE} PredictScreen: ${traceName} completed`,
        logData,
      );

      // End the trace - Sentry calculates duration from timestamps automatically
      endTrace({
        name: traceName,
        id: traceId.current,
        data: { success: true },
      });
      traceStarted.current = false;

      hasCompleted.current = true;
    }

    // Update previous states for edge detection
    previousStartState.current = shouldStart;
    previousEndState.current = shouldEnd;
  }, [
    traceName,
    op,
    shouldStart,
    shouldEnd,
    shouldReset,
    debugContext,
    actualStartConditions,
    actualEndConditions,
  ]);
};
```

---

## Phase 2: Add TraceNames to trace.ts

**File:** `app/util/trace.ts`

Add to the `TraceName` enum (after the Perps entries, around line 169):

```typescript
  // Predict
  PredictFeedView = 'Predict Feed View',
  PredictMarketDetailsView = 'Predict Market Details View',
  PredictBuyPreviewView = 'Predict Buy Preview View',
  PredictSellPreviewView = 'Predict Sell Preview View',
  PredictActivityDetailView = 'Predict Activity Detail View',
  PredictTransactionHistoryView = 'Predict Transaction History View',
  PredictTabView = 'Predict Tab View',
  PredictAddFundsModal = 'Predict Add Funds Modal',
  PredictUnavailableModal = 'Predict Unavailable Modal',
  PredictOrderSubmissionToast = 'Predict Order Submission Toast',
  PredictOrderConfirmationToast = 'Predict Order Confirmation Toast',
  PredictCashoutSubmissionToast = 'Predict Cashout Submission Toast',
  PredictCashoutConfirmationToast = 'Predict Cashout Confirmation Toast',

  // Predict Operations
  PredictPlaceOrder = 'Predict Place Order',
  PredictOrderPreview = 'Predict Order Preview',
  PredictClaim = 'Predict Claim',
  PredictDeposit = 'Predict Deposit',
  PredictWithdraw = 'Predict Withdraw',

  // Predict Data Fetches
  PredictGetMarkets = 'Predict Get Markets',
  PredictGetMarket = 'Predict Get Market',
  PredictGetPositions = 'Predict Get Positions',
  PredictGetActivity = 'Predict Get Activity',
  PredictGetBalance = 'Predict Get Balance',
  PredictGetAccountState = 'Predict Get Account State',
  PredictGetPriceHistory = 'Predict Get Price History',
  PredictGetPrices = 'Predict Get Prices',
  PredictGetUnrealizedPnL = 'Predict Get Unrealized PnL',
```

Add to the `TraceOperation` enum (after the Perps entries, around line 210):

```typescript
  // Predict
  PredictOperation = 'predict.operation',
  PredictOrderSubmission = 'predict.order_submission',
  PredictDataFetch = 'predict.data_fetch',
```

---

## Phase 3: Implement Screen-Level Tracing

### 3.1 PredictFeed (Market List Screen)

**File:** `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx`

```typescript
// Add imports at the top
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside PredictFeed component (around line 90, before return statement):
const PredictFeed = () => {
  // ... existing code ...

  // Track screen load performance
  usePredictMeasurement({
    traceName: TraceName.PredictFeedView,
    conditions: [!isSearchVisible], // Wait for initial render
  });

  return (
    // ... existing JSX ...
  );
};
```

### 3.2 PredictMarketDetails

**File:** `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx`

```typescript
// Add imports
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside component (after hooks, before return):
const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  // ... existing hooks ...

  const { market, isLoading: isLoadingMarket } = usePredictMarket({ ... });
  const { positions } = usePredictPositions({ ... });
  const { prices } = usePredictPrices({ ... });

  // Track screen load - wait for critical data
  usePredictMeasurement({
    traceName: TraceName.PredictMarketDetailsView,
    conditions: [
      !isLoadingMarket,
      !!market,
      !!prices,
    ],
    debugContext: { marketId: route.params.conditionId },
  });

  return (
    // ... existing JSX ...
  );
};
```

### 3.3 PredictBuyPreview

**File:** `app/components/UI/Predict/views/PredictBuyPreview/PredictBuyPreview.tsx`

```typescript
// Add imports
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside component:
const PredictBuyPreview: React.FC = () => {
  // ... existing code ...

  // Track modal load performance
  usePredictMeasurement({
    traceName: TraceName.PredictBuyPreviewView,
    conditions: [!!orderPreview, !isLoadingPreview],
  });

  return (
    // ... existing JSX ...
  );
};
```

### 3.4 PredictSellPreview

**File:** `app/components/UI/Predict/views/PredictSellPreview/PredictSellPreview.tsx`

```typescript
// Add imports
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside component:
const PredictSellPreview: React.FC = () => {
  // ... existing code ...

  // Track modal load performance
  usePredictMeasurement({
    traceName: TraceName.PredictSellPreviewView,
    conditions: [!!orderPreview, !isLoadingPreview],
  });

  return (
    // ... existing JSX ...
  );
};
```

### 3.5 PredictActivityDetail

**File:** `app/components/UI/Predict/components/PredictActivityDetail/PredictActivityDetail.tsx`

```typescript
// Add imports
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside component:
const PredictActivityDetail: React.FC<PredictActivityDetailProps> = ({ activity }) => {
  // ... existing code ...

  // Track modal load
  usePredictMeasurement({
    traceName: TraceName.PredictActivityDetailView,
    conditions: [!!activity],
  });

  return (
    // ... existing JSX ...
  );
};
```

### 3.6 PredictTransactionHistory Screen

**File:** `app/components/UI/Predict/views/PredictTransactionsView/PredictTransactionsView.tsx`

```typescript
// Add imports
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside component (after usePredictActivity hook):
const PredictTransactionsView: React.FC<PredictTransactionsViewProps> = ({
  isVisible,
}) => {
  const tw = useTailwind();
  const { activity, isLoading } = usePredictActivity({});

  // Track transaction history screen load
  usePredictMeasurement({
    traceName: TraceName.PredictTransactionHistoryView,
    conditions: [!isLoading, !!activity],
    debugContext: { transactionCount: activity.length },
  });

  // Track activity list viewed when tab becomes visible
  useEffect(() => {
    if (isVisible && !isLoading) {
      Engine.context.PredictController.trackActivityViewed({
        activityType: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
      });
    }
  }, [isVisible, isLoading]);

  // ... rest of component ...
};
```

**Notes:**

- Tracks transaction history list screen load time
- Screen exists but not yet integrated into navigation (built for future use)
- Displays grouped activity (buy/sell/claim) by date
- Part of complete activity flow: list → detail

### 3.7 PredictTabView (Positions Tab)

**File:** `app/components/UI/Predict/views/PredictTabView/PredictTabView.tsx`

```typescript
// Add imports
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

// Inside component (after state declarations):
const PredictTabView: React.FC<PredictTabViewProps> = ({ isVisible }) => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);

  // ... existing refs and hooks ...

  // Track positions tab load
  usePredictMeasurement({
    traceName: TraceName.PredictTabView,
    conditions: [!positionsError, !headerError, !isRefreshing],
  });

  // ... rest of component ...
};
```

**Notes:**

- Tracks the positions tab container load time
- First screen users see when opening Predict from wallet
- Shows positions header (P&L, balance) + positions list
- Measures "time to see my positions" - critical UX metric
- Complements `getPositions` operation tracking with full UI load timing

### 3.8 Toast Notifications (Order + Cashout)

**File:** `app/components/UI/Predict/hooks/usePredictToasts.tsx` (or wherever toast logic exists)

```typescript
// Add imports
import { TraceName } from '../../../../util/trace';
import { usePredictMeasurement } from './usePredictMeasurement';

// Inside the toast hook or component where toasts are displayed:

// === ORDER TOASTS ===

// For Order Submission Toast
usePredictMeasurement({
  traceName: TraceName.PredictOrderSubmissionToast,
  conditions: [isOrderSubmissionToastVisible],
  debugContext: { toastType: 'order_submission' },
});

// For Order Confirmation Toast
usePredictMeasurement({
  traceName: TraceName.PredictOrderConfirmationToast,
  conditions: [isOrderConfirmationToastVisible],
  debugContext: { toastType: 'order_confirmation' },
});

// === CASHOUT TOASTS ===

// For Cashout Submission Toast
usePredictMeasurement({
  traceName: TraceName.PredictCashoutSubmissionToast,
  conditions: [isCashoutSubmissionToastVisible],
  debugContext: { toastType: 'cashout_submission' },
});

// For Cashout Confirmation Toast
usePredictMeasurement({
  traceName: TraceName.PredictCashoutConfirmationToast,
  conditions: [isCashoutConfirmationToastVisible],
  debugContext: { toastType: 'cashout_confirmation' },
});
```

**Notes:**

- These track the **user-perceived feedback timing** - how long until the user sees confirmation
- Measures complete trade/cashout flow: API call timing + UI feedback timing
- Helps identify if UI rendering (not API calls) is the bottleneck
- Auto-resets when toast becomes invisible (built into the hook's smart defaults)
- Cashout toasts complete the user exit journey tracking

**Alternative Implementation (if toasts are components):**

If toasts are separate components, add directly in the component:

```typescript
// PredictOrderSubmissionToast.tsx
const PredictOrderSubmissionToast = ({ isVisible }) => {
  usePredictMeasurement({
    traceName: TraceName.PredictOrderSubmissionToast,
    conditions: [isVisible],
  });

  return (
    // ... toast JSX ...
  );
};

// PredictCashoutSubmissionToast.tsx
const PredictCashoutSubmissionToast = ({ isVisible }) => {
  usePredictMeasurement({
    traceName: TraceName.PredictCashoutSubmissionToast,
    conditions: [isVisible],
  });

  return (
    // ... toast JSX ...
  );
};
```

---

## Phase 4: Implement Controller Operation Tracing

### 4.1 Update PredictController - Add Helper Method

**File:** `app/components/UI/Predict/controllers/PredictController.ts`

Add after the constructor (around line 340):

```typescript
/**
 * Generate standard error context for Logger.error calls
 * Ensures consistent error reporting to Sentry with minimal but complete context
 */
private getErrorContext(
  method: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    feature: PREDICT_CONSTANTS.FEATURE_NAME,
    context: `PredictController.${method}`,
    provider: 'polymarket', // Static for now, can be dynamic if multiple providers
    ...extra,
  };
}
```

Update the PREDICT_CONSTANTS to include FEATURE_NAME:

```typescript
// In app/components/UI/Predict/constants/errors.ts
export const PREDICT_CONSTANTS = {
  FEATURE_NAME: 'predict', // For Sentry error filtering - enables "feature:predict" queries
  // ... existing constants ...
};
```

### 4.2 Add Tracing to getMarkets

**File:** `app/components/UI/Predict/controllers/PredictController.ts`

Replace the existing `getMarkets` method (around line 420):

```typescript
async getMarkets(params?: GetMarketsParams): Promise<PredictMarket[]> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string; count?: number } | undefined;

  try {
    trace({
      name: TraceName.PredictGetMarkets,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
        hasFilters: !!params,
      },
    });

    const provider = this.getProvider();
    const result = await provider.getMarkets(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_MARKETS_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true, count: result.length };
    return result;
  } catch (error) {
    // Log to Sentry with market query context
    Logger.error(
      ensureError(error),
      this.getErrorContext('getMarkets', {
        message: 'Failed to fetch markets',
        hasFilters: !!params,
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetMarkets,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.3 Add Tracing to getMarket

Replace the existing `getMarket` method:

```typescript
async getMarket(conditionId: string): Promise<PredictMarket | undefined> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string } | undefined;

  try {
    trace({
      name: TraceName.PredictGetMarket,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getMarket(conditionId);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_MARKET_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true };
    return result;
  } catch (error) {
    // Log to Sentry with market details context
    Logger.error(
      ensureError(error),
      this.getErrorContext('getMarket', {
        message: 'Failed to fetch market details',
        marketId: conditionId,
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetMarket,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.4 Add Tracing to getPositions

Replace the existing `getPositions` method:

```typescript
async getPositions(params: GetPositionsParams): Promise<PredictPosition[]> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string; count?: number } | undefined;

  try {
    trace({
      name: TraceName.PredictGetPositions,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getPositions(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_POSITIONS_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true, count: result.length };
    return result;
  } catch (error) {
    // Log to Sentry with positions query context (no user address)
    Logger.error(
      ensureError(error),
      this.getErrorContext('getPositions', {
        message: 'Failed to fetch positions',
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetPositions,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.5 Add Tracing to placeOrder

Replace the existing `placeOrder` method:

```typescript
async placeOrder(params: PlaceOrderParams): Promise<Result> {
  const traceId = uuidv4();
  let traceData:
    | {
        success: boolean;
        error?: string;
        side?: string;
        marketId?: string;
      }
    | undefined;

  try {
    trace({
      name: TraceName.PredictPlaceOrder,
      id: traceId,
      op: TraceOperation.PredictOrderSubmission,
      tags: {
        provider: 'polymarket',
        side: params.side,
      },
      data: {
        marketId: params.tokenId,
      },
    });

    const provider = this.getProvider();
    const result = await provider.placeOrder(params);

    // Build success trace data
    traceData = {
      success: true,
      side: params.side,
      marketId: params.tokenId,
    };
    return result;
  } catch (error) {
    // Log to Sentry with order context (excluding sensitive data like amounts)
    Logger.error(
      ensureError(error),
      this.getErrorContext('placeOrder', {
        message: 'Failed to place order',
        side: params.side,
        marketId: params.tokenId,
      }),
    );

    // Build error trace data
    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      side: params.side,
      marketId: params.tokenId,
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictPlaceOrder,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.6 Add Tracing to previewOrder

Replace the existing `previewOrder` method:

```typescript
async previewOrder(params: PreviewOrderParams): Promise<OrderPreview> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string } | undefined;

  try {
    trace({
      name: TraceName.PredictOrderPreview,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
        side: params.side,
      },
    });

    const provider = this.getProvider();
    const result = await provider.previewOrder(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_ORDER_PREVIEW_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true };
    return result;
  } catch (error) {
    // Log to Sentry with preview context (no sensitive amounts)
    Logger.error(
      ensureError(error),
      this.getErrorContext('previewOrder', {
        message: 'Failed to preview order',
        side: params.side,
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictOrderPreview,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.7 Add Tracing to getPriceHistory

Replace the existing `getPriceHistory` method:

```typescript
async getPriceHistory(
  params: GetPriceHistoryParams,
): Promise<PredictPriceHistoryPoint[]> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string; count?: number } | undefined;

  try {
    trace({
      name: TraceName.PredictGetPriceHistory,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
        interval: params.interval,
      },
    });

    const provider = this.getProvider();
    const result = await provider.getPriceHistory(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_PRICE_HISTORY_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true, count: result.length };
    return result;
  } catch (error) {
    // Log to Sentry with price history context
    Logger.error(
      ensureError(error),
      this.getErrorContext('getPriceHistory', {
        message: 'Failed to fetch price history',
        interval: params.interval,
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetPriceHistory,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.8 Add Tracing to getPrices

Replace the existing `getPrices` method:

```typescript
async getPrices(params: GetPriceParams): Promise<GetPriceResponse> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string } | undefined;

  try {
    trace({
      name: TraceName.PredictGetPrices,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getPrices(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_PRICES_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true };
    return result;
  } catch (error) {
    // Log to Sentry with prices context
    Logger.error(
      ensureError(error),
      this.getErrorContext('getPrices', {
        message: 'Failed to fetch prices',
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetPrices,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.9 Add Tracing to getActivity

Replace the existing `getActivity` method:

```typescript
async getActivity(address: string): Promise<PredictActivity[]> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string; count?: number } | undefined;

  try {
    trace({
      name: TraceName.PredictGetActivity,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getActivity(address);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_ACTIVITY_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true, count: result.length };
    return result;
  } catch (error) {
    // Log to Sentry with activity query context (no user address)
    Logger.error(
      ensureError(error),
      this.getErrorContext('getActivity', {
        message: 'Failed to fetch activity',
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetActivity,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.10 Add Tracing to getBalance

Replace the existing `getBalance` method:

```typescript
async getBalance(params: GetBalanceParams): Promise<PredictBalance> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string } | undefined;

  try {
    trace({
      name: TraceName.PredictGetBalance,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getBalance(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_BALANCE_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true };
    return result;
  } catch (error) {
    // Log to Sentry with balance query context (no user address)
    Logger.error(
      ensureError(error),
      this.getErrorContext('getBalance', {
        message: 'Failed to fetch balance',
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetBalance,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.11 Add Tracing to getAccountState

Replace the existing `getAccountState` method:

```typescript
async getAccountState(
  params: GetAccountStateParams,
): Promise<AccountState> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string } | undefined;

  try {
    trace({
      name: TraceName.PredictGetAccountState,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getAccountState(params);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_ACCOUNT_STATE_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true };
    return result;
  } catch (error) {
    // Log to Sentry with account state context (no user address)
    Logger.error(
      ensureError(error),
      this.getErrorContext('getAccountState', {
        message: 'Failed to fetch account state',
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetAccountState,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.12 Add Tracing to getUnrealizedPnL

Replace the existing `getUnrealizedPnL` method:

```typescript
async getUnrealizedPnL(address: string): Promise<UnrealizedPnL> {
  const traceId = uuidv4();
  const startTime = performance.now();
  let traceData: { success: boolean; error?: string } | undefined;

  try {
    trace({
      name: TraceName.PredictGetUnrealizedPnL,
      id: traceId,
      op: TraceOperation.PredictDataFetch,
      tags: {
        provider: 'polymarket',
      },
    });

    const provider = this.getProvider();
    const result = await provider.getUnrealizedPnL(address);

    const completionDuration = performance.now() - startTime;
    setMeasurement(
      PredictMeasurementName.PREDICT_GET_UNREALIZED_PNL_OPERATION,
      completionDuration,
      'millisecond',
    );

    traceData = { success: true };
    return result;
  } catch (error) {
    // Log to Sentry with unrealized PnL context (no user address)
    Logger.error(
      ensureError(error),
      this.getErrorContext('getUnrealizedPnL', {
        message: 'Failed to fetch unrealized PnL',
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictGetUnrealizedPnL,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.13 Add Tracing to claim

Replace the existing `claim` method:

```typescript
async claim(params: ClaimParams): Promise<PredictClaim> {
  const traceId = uuidv4();
  let traceData:
    | {
        success: boolean;
        error?: string;
        positionCount?: number;
      }
    | undefined;

  try {
    trace({
      name: TraceName.PredictClaim,
      id: traceId,
      op: TraceOperation.PredictOperation,
      tags: {
        provider: 'polymarket',
      },
    });

    // Implementation...
    const result = await this.executeClaim(params);

    traceData = {
      success: true,
      positionCount: params.positions.length,
    };
    return result;
  } catch (error) {
    // Log to Sentry with claim context (no user address or amounts)
    Logger.error(
      ensureError(error),
      this.getErrorContext('claim', {
        message: 'Failed to claim winnings',
        positionCount: params.positions.length,
      }),
    );

    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: TraceName.PredictClaim,
      id: traceId,
      data: traceData,
    });
  }
}
```

### 4.14 Add Required Imports to PredictController.ts

Add at the top of the file with other imports:

```typescript
import { setMeasurement } from '@sentry/react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { PredictMeasurementName } from '../constants/performanceMetrics';
```

---

## Phase 5: Testing & Validation

### 5.1 Create Test Plan

**File:** `docs/predict/predict-sentry-testing.md`

1. **Development Testing:**
   - Use `adb logcat | grep PREDICTMARK_SENTRY` to verify traces are firing
   - Check trace start/end pairs
   - Verify condition logic works correctly
   - Test reset conditions (modals, navigation away)

2. **Manual Testing Checklist:**
   - [ ] PredictFeed loads and trace completes
   - [ ] Market details screen loads with data
   - [ ] Buy preview modal shows correct timing
   - [ ] Sell preview modal shows correct timing
   - [ ] Activity detail modal loads
   - [ ] getMarkets operation traces
   - [ ] getPositions operation traces
   - [ ] placeOrder operation traces with success/error
   - [ ] All data fetch operations trace correctly

3. **Sentry Dashboard Verification:**
   - [ ] Traces appear in Sentry performance dashboard
   - [ ] Tags are properly set (provider, etc.)
   - [ ] Measurements are recorded with correct units
   - [ ] Error data is captured in failed traces
   - [ ] Duration calculations are accurate

### 5.2 Create Unit Tests

Create test files for the hook:

**File:** `app/components/UI/Predict/hooks/usePredictMeasurement.test.ts`

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { usePredictMeasurement } from './usePredictMeasurement';
import {
  TraceName,
  TraceOperation,
  trace,
  endTrace,
} from '../../../../util/trace';

jest.mock('../../../../util/trace');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

describe('usePredictMeasurement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start and end trace immediately with no conditions', () => {
    renderHook(() =>
      usePredictMeasurement({
        traceName: TraceName.PredictFeedView,
      }),
    );

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PredictFeedView,
        op: TraceOperation.PredictOperation,
      }),
    );

    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.PredictFeedView,
        data: { success: true },
      }),
    );
  });

  it('should wait for conditions before ending trace', () => {
    const { rerender } = renderHook(
      ({ isLoading }) =>
        usePredictMeasurement({
          traceName: TraceName.PredictMarketDetailsView,
          conditions: [!isLoading],
        }),
      { initialProps: { isLoading: true } },
    );

    // Trace should start but not end
    expect(trace).toHaveBeenCalled();
    expect(endTrace).not.toHaveBeenCalled();

    // Rerender with loading complete
    rerender({ isLoading: false });

    // Now trace should end
    expect(endTrace).toHaveBeenCalled();
  });

  it('should reset trace when reset condition becomes true', () => {
    const { rerender } = renderHook(
      ({ isVisible }) =>
        usePredictMeasurement({
          traceName: TraceName.PredictBuyPreviewView,
          conditions: [isVisible],
        }),
      { initialProps: { isVisible: true } },
    );

    jest.clearAllMocks();

    // Trigger reset by changing visibility
    rerender({ isVisible: false });

    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { success: false, reason: 'reset' },
      }),
    );
  });
});
```

---

## Phase 6: Documentation

### 6.1 Create Sentry Reference Documentation

**File:** `docs/predict/predict-sentry-reference.md`

```markdown
# Predict Sentry Event Reference

## Overview

This document defines all Sentry performance traces and measurements for the Predict feature. The monitoring system tracks:

- UI screen load performance
- Trading operation execution
- Data fetch operations
- API integration timing

## Two Tracing Approaches

### 1. `usePredictMeasurement` Hook (UI Screens)

**Use for:** Screen/component load performance with conditional completion.

**Location:** `app/components/UI/Predict/hooks/usePredictMeasurement.ts`

**Pattern:**

\`\`\`typescript
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { TraceName } from '../../../../../util/trace';

// Simple: Immediate measurement
usePredictMeasurement({
traceName: TraceName.PredictFeedView,
});

// Conditional: Wait for data
usePredictMeasurement({
traceName: TraceName.PredictMarketDetailsView,
conditions: [!isLoading, !!market, !!prices],
});
\`\`\`

### 2. Direct `trace()` / `setMeasurement()` (Controllers)

**Use for:** Controller operations, API calls, data fetches.

**Pattern:**

\`\`\`typescript
import { trace, endTrace, TraceName, TraceOperation } from '../../../../util/trace';
import { setMeasurement } from '@sentry/react-native';
import { v4 as uuidv4 } from 'uuid';

const traceId = uuidv4();
let traceData: { success: boolean; error?: string } | undefined;

try {
trace({
name: TraceName.PredictPlaceOrder,
id: traceId,
op: TraceOperation.PredictOrderSubmission,
tags: { provider: 'polymarket', side: params.side },
});

const result = await provider.placeOrder(params);
traceData = { success: true };
return result;
} catch (error) {
traceData = { success: false, error: error.message };
throw error;
} finally {
endTrace({ name: TraceName.PredictPlaceOrder, id: traceId, data: traceData });
}
\`\`\`

## Event Catalog

### UI Screen Measurements (7 screens)

| TraceName                       | Conditions Tracked         | Notes                                    |
| ------------------------------- | -------------------------- | ---------------------------------------- |
| `PredictFeedView`               | Initial render             | Main feed screen (markets)               |
| `PredictMarketDetailsView`      | Market data, prices loaded | Market details screen                    |
| `PredictBuyPreviewView`         | Order preview available    | Buy modal                                |
| `PredictSellPreviewView`        | Order preview available    | Sell modal                               |
| `PredictActivityDetailView`     | Activity data loaded       | Activity modal (single transaction)      |
| `PredictTransactionHistoryView` | Activity loaded            | Transaction history list screen          |
| `PredictTabView`                | No errors, not refreshing  | Positions tab (first screen from wallet) |

### Toast Notification Measurements (4 toasts)

| TraceName                         | Conditions Tracked | Notes                                         |
| --------------------------------- | ------------------ | --------------------------------------------- |
| `PredictOrderSubmissionToast`     | Toast visible      | User feedback timing for order submission     |
| `PredictOrderConfirmationToast`   | Toast visible      | User feedback timing for order confirmation   |
| `PredictCashoutSubmissionToast`   | Toast visible      | User feedback timing for cashout submission   |
| `PredictCashoutConfirmationToast` | Toast visible      | User feedback timing for cashout confirmation |

**Toast Tracking Purpose:**

- Measures **user-perceived responsiveness** - how fast users see feedback
- Identifies if UI rendering (not API) is the bottleneck
- Tracks complete trade flow: `placeOrder` timing + toast display timing
- Tracks complete cashout flow: `claim` timing + toast display timing
- Example insight: "Order API: 200ms, Toast display: 800ms → UI is the problem"

### Trading Operations (3 operations)

| TraceName             | Operation                | Tags           | Data Attributes        |
| --------------------- | ------------------------ | -------------- | ---------------------- |
| `PredictPlaceOrder`   | `PredictOrderSubmission` | provider, side | success, marketId      |
| `PredictOrderPreview` | `PredictDataFetch`       | provider, side | success                |
| `PredictClaim`        | `PredictOperation`       | provider       | success, positionCount |

### Data Fetch Operations (9 operations)

| TraceName                 | Fetches               | Notes    |
| ------------------------- | --------------------- | -------- |
| `PredictGetMarkets`       | Available markets     | REST API |
| `PredictGetMarket`        | Single market details | REST API |
| `PredictGetPositions`     | User positions        | REST API |
| `PredictGetActivity`      | Activity history      | REST API |
| `PredictGetBalance`       | Account balance       | REST API |
| `PredictGetAccountState`  | Account state         | REST API |
| `PredictGetPriceHistory`  | Historical prices     | REST API |
| `PredictGetPrices`        | Current prices        | REST API |
| `PredictGetUnrealizedPnL` | Portfolio P&L         | REST API |

## Performance Markers (Development)

Use these markers with DevLogger for development filtering:

\`\`\`bash

# Filter Sentry logs only

adb logcat | grep PREDICTMARK_SENTRY

# Filter API performance

adb logcat | grep PREDICTMARK_API

# All Predict performance logs

adb logcat | grep PREDICTMARK\_
\`\`\`

## Error Logging Best Practices

### Standard Pattern

\`\`\`typescript
import Logger from '../../../../util/Logger';
import { ensureError } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS } from '../constants/errors';

try {
await someOperation();
} catch (error) {
Logger.error(ensureError(error), {
feature: PREDICT_CONSTANTS.FEATURE_NAME,
context: 'PredictController.placeOrder',
provider: 'polymarket',
message: 'Failed to place order',
});
throw error;
}
\`\`\`

### Context Helper Pattern (Controllers)

\`\`\`typescript
private getErrorContext(
method: string,
extra?: Record<string, unknown>,
): Record<string, unknown> {
return {
feature: PREDICT_CONSTANTS.FEATURE_NAME,
context: \`PredictController.\${method}\`,
provider: 'polymarket',
...extra,
};
}

// Usage
Logger.error(ensureError(error), this.getErrorContext('placeOrder'));
\`\`\`

## Best Practices

1. **Always use unique trace IDs** for manual traces with `uuidv4()`
2. **Include success/error data** when ending traces
3. **Use conditions** for UI measurements that depend on data loading
4. **Add tags** for filtering (provider, side, etc.)
5. **Use setMeasurement** for sub-operations within larger traces
6. **Always clean up** in finally blocks
7. **Use `Logger.error()` with context** for all error logging
8. **Use `ensureError()` helper** to normalize caught errors before logging

## Related Files

- **Trace utilities**: `app/util/trace.ts`
- **Measurement hook**: `app/components/UI/Predict/hooks/usePredictMeasurement.ts`
- **Measurement constants**: `app/components/UI/Predict/constants/performanceMetrics.ts`
- **Config constants**: `app/components/UI/Predict/constants/errors.ts`
- **Controller**: `app/components/UI/Predict/controllers/PredictController.ts`
```

### 6.2 Update README.md

**File:** `app/components/UI/Predict/README.md`

Add a new section after "Quick Hook Selection Guide":

```markdown
## Performance Monitoring

The Predict feature includes comprehensive Sentry performance tracking for:

- Screen load times
- Trading operations
- Data fetch operations
- API call timing

See [predict-sentry-reference.md](../../../../docs/predict/predict-sentry-reference.md) for complete documentation.

### Quick Reference

**UI Screens** - Use `usePredictMeasurement` hook:
\`\`\`typescript
usePredictMeasurement({
traceName: TraceName.PredictMarketDetailsView,
conditions: [!isLoading, !!data],
});
\`\`\`

**Controller Operations** - Use `trace()` / `endTrace()`:
\`\`\`typescript
const traceId = uuidv4();
try {
trace({ name: TraceName.PredictPlaceOrder, id: traceId, op: TraceOperation.PredictOrderSubmission });
// ... operation ...
} finally {
endTrace({ name: TraceName.PredictPlaceOrder, id: traceId, data: traceData });
}
\`\`\`
```

---

## Implementation Timeline & Priorities

### Priority 1 (Immediate Value) - Week 1

- ✅ Create infrastructure (hook, constants, trace names)
- ✅ Implement top 3 critical screens:
  - PredictFeed (most visited)
  - PredictMarketDetails (core UX)
  - PredictBuyPreview (conversion funnel)
- ✅ Implement toast tracking:
  - Order submission toast (user feedback)
  - Order confirmation toast (conversion funnel)
- ✅ Implement critical controller operations:
  - placeOrder (revenue impact)
  - getMarkets (performance baseline)
  - getPositions (user engagement)

### Priority 2 (Enhanced Coverage) - Week 2

- Complete remaining screen tracing:
  - PredictSellPreview
  - PredictActivityDetail (single transaction)
  - PredictTransactionHistoryView (transaction list)
  - PredictTabView (positions tab)
- Add cashout toast tracking (submission + confirmation)
- Add all data fetch operation tracing
- Implement claim and withdraw tracing
- Add comprehensive error context

### Priority 3 (Testing & Documentation) - Week 3

- Create unit tests
- Manual testing across all screens
- Verify Sentry dashboard integration
- Complete documentation
- Training for team

---

## Success Metrics

After implementation, we should be able to answer:

1. **Performance Questions:**
   - What's the P50/P95/P99 load time for PredictFeed?
   - Which data fetch operations are slowest?
   - How long does order placement take end-to-end?
   - Are there performance regressions after releases?

2. **Error Questions:**
   - What's the error rate for placeOrder operations?
   - Which API calls fail most frequently?
   - What are the most common error messages?
   - How does error rate correlate with network conditions?

3. **User Experience Questions:**
   - How long do users wait for market details to load?
   - What's the conversion funnel timing (view → preview → order)?
   - Where are the bottlenecks in the trading flow?
   - How does performance vary by provider (for future expansion)?

---

## Migration Notes

### Breaking Changes

None - This is purely additive monitoring infrastructure

### Backward Compatibility

- All existing functionality remains unchanged
- Performance tracking is opt-in via Sentry configuration
- No impact on users who haven't consented to metrics

### Rollout Strategy

1. Deploy to development/staging first
2. Verify traces in Sentry dashboard
3. Monitor for any performance overhead (should be <1ms)
4. Deploy to production with feature flag (if desired)
5. Monitor Sentry quota usage

---

## Appendix: Comparison with Perps

| Aspect               | Perps                 | Predict                 | Notes                  |
| -------------------- | --------------------- | ----------------------- | ---------------------- |
| Hook Name            | `usePerpsMeasurement` | `usePredictMeasurement` | Same pattern           |
| Trace Operations     | 4 types               | 3 types                 | Simpler for Predict    |
| Screen Count         | 8 screens             | 5 screens               | Fewer screens to track |
| WebSocket Tracing    | Yes                   | No                      | Predict doesn't use WS |
| API Count            | 7 APIs                | 3 APIs                  | Fewer external calls   |
| Error Context Helper | Yes                   | Yes                     | Same pattern           |
| Performance Markers  | 3 markers             | 3 markers               | Same pattern           |

### Key Simplifications for Predict

1. **No WebSocket tracking** - Predict uses REST APIs only
2. **Fewer operations** - Simpler trading flow (no TP/SL, leverage, etc.)
3. **Single provider** - Polymarket only (vs Perps' multi-provider)
4. **Simpler state management** - No connection lifecycle tracking

### Shared Infrastructure

Both features use:

- Same `trace()` / `endTrace()` utilities
- Same `TraceName` enum pattern
- Same error logging pattern with `Logger.error()`
- Same performance measurement naming convention
- Same DevLogger markers for development filtering

---

## Questions & Decisions

### Q1: Should we trace every controller method?

**Decision:** No. Focus on:

- User-facing operations (place order, claim)
- Data fetches that impact UX (markets, positions, prices)
- Operations that may have performance issues

Skip internal helpers and trivial getters.

### Q2: Should we add sub-measurements within traces?

**Decision:** Use sparingly. Add `setMeasurement()` only for:

- Operations that have distinct sub-phases
- Operations where we need to isolate specific bottlenecks
- Keep it simple initially, add more based on needs

### Q3: How granular should conditions be?

**Decision:** Track minimum viable conditions:

- Data is loaded (not isLoading)
- Critical data exists (not null/undefined)
- Don't over-engineer - start simple, refine based on data

### Q4: Should we trace modals the same as screens?

**Decision:** Yes, same pattern. Modals are key UX points:

- Buy/Sell preview = conversion funnel
- Activity detail = engagement metric
- Use conditions to handle visibility/reset

---

## Maintenance Plan

### Regular Reviews (Monthly)

- Review Sentry dashboard for anomalies
- Identify slow operations needing optimization
- Update trace conditions if data loading patterns change
- Remove traces that aren't providing value

### When to Add New Traces

- New screens/modals are added
- New data operations are created
- Performance issues are reported
- User complaints about specific flows

### When to Remove Traces

- Feature is deprecated
- Operation is no longer performance-critical
- Trace provides no actionable insights
- Sentry quota constraints

---

## References

- [Perps Sentry Reference](../perps/perps-sentry-reference.md)
- [Sentry Performance Monitoring Docs](https://docs.sentry.io/platforms/react-native/performance/)
- [MetaMask Unit Testing Guidelines](.cursor/rules/unit-testing-guidelines.mdc)
- [Predict README](../../app/components/UI/Predict/README.md)
