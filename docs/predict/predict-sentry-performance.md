# Predict Sentry Performance Tracking - Implementation Documentation

## Overview

This document describes the Sentry performance tracking implementation for the Predict feature. The implementation follows the established Perps pattern, ensuring consistency across features and providing comprehensive observability for UI rendering, trading operations, and data fetches.

## What We Track

- **UI screen load performance** - How long it takes for users to see content
- **Trading operations** - Order placement, claims, and previews
- **Data fetch operations** - API calls for markets, positions, prices, activity
- **Toast notifications** - User-perceived feedback timing

## Architecture

### Two-Tiered Tracing System

Following the Perps pattern, we use two distinct approaches:

#### 1. `usePredictMeasurement` Hook - For UI Components

**Purpose:** Declarative performance tracking for screens and components with conditional completion.

**When to use:**

- Screen load measurements
- Modal/component render timing
- Any UI element that depends on data loading

**Key features:**

- Automatic trace lifecycle management
- Conditional start/end logic
- Auto-reset for modals and dynamic content
- Debug context support

#### 2. Direct `trace()` / `endTrace()` - For Controller Operations

**Purpose:** Imperative performance tracking for business logic and async operations.

**When to use:**

- Controller method calls
- API operations
- Data fetch operations
- Any operation that doesn't depend on React lifecycle

**Key features:**

- Full control over trace lifecycle
- Tags for searchable metadata (filtering in Sentry)
- Data for contextual information (debugging)
- Always uses `finally` block for reliability

---

## Implementation Details

### Infrastructure

#### Trace Names and Operations

**Location:** `app/util/trace.ts`

Added 13 Predict-specific trace names:

```typescript
// UI Screens (7)
TraceName.PredictFeedView;
TraceName.PredictMarketDetailsView;
TraceName.PredictBuyPreviewView;
TraceName.PredictSellPreviewView;
TraceName.PredictActivityDetailView;
TraceName.PredictTransactionHistoryView;
TraceName.PredictTabView;

// Toast Notifications (4)
TraceName.PredictOrderSubmissionToast;
TraceName.PredictOrderConfirmationToast;
TraceName.PredictCashoutSubmissionToast;
TraceName.PredictCashoutConfirmationToast;

// Operations (13)
TraceName.PredictPlaceOrder;
TraceName.PredictOrderPreview;
TraceName.PredictClaim;
TraceName.PredictDeposit;
TraceName.PredictWithdraw;
TraceName.PredictGetMarkets;
TraceName.PredictGetMarket;
TraceName.PredictGetPositions;
TraceName.PredictGetActivity;
TraceName.PredictGetBalance;
TraceName.PredictGetAccountState;
TraceName.PredictGetPriceHistory;
TraceName.PredictGetPrices;
TraceName.PredictGetUnrealizedPnL;
```

Added 3 trace operations:

```typescript
TraceOperation.PredictOperation; // General operations
TraceOperation.PredictOrderSubmission; // Order-related operations
TraceOperation.PredictDataFetch; // Data fetching operations
```

#### usePredictMeasurement Hook

**Location:** `app/components/UI/Predict/hooks/usePredictMeasurement.ts`

**Features:**

- Automatic trace ID generation
- Smart condition handling (simple and advanced APIs)
- Auto-reset logic for modals
- Debug context support
- Feature tag automatically applied

**Usage Examples:**

```typescript
// Simple: Immediate measurement
usePredictMeasurement({
  traceName: TraceName.PredictFeedView,
  conditions: [!isSearchVisible],
});

// With debug context
usePredictMeasurement({
  traceName: TraceName.PredictMarketDetailsView,
  conditions: [!isLoading, !!market, !isRefreshing],
  debugContext: {
    marketId: market?.id,
    hasMarket: !!market,
    loadingStates: { isMarketFetching, isRefreshing },
  },
});
```

**How it works:**

1. Starts trace immediately or when `startConditions` are met
2. Ends trace when all `endConditions` are true
3. Resets trace when any `resetCondition` is true (e.g., modal closed)
4. Automatically includes `feature: Predict` tag in all traces

---

## Implementation Patterns

### Pattern 1: View/Screen Tracking

**Applied to:**

- `PredictFeed.tsx`
- `PredictMarketDetails.tsx`
- `PredictBuyPreview.tsx`
- `PredictSellPreview.tsx`
- `PredictTabView.tsx`
- `PredictTransactionsView.tsx`

**Pattern:**

```typescript
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';

const MyView = () => {
  // ... hooks for data fetching ...

  // Track screen load performance
  usePredictMeasurement({
    traceName: TraceName.PredictMarketDetailsView,
    conditions: [
      !isLoading,      // Wait for data to finish loading
      !!data,          // Ensure data exists
      !isRefreshing,   // Not actively refreshing
    ],
    debugContext: {
      marketId: market?.id,
      hasMarket: !!market,
      loadingStates: { isMarketFetching, isRefreshing },
    },
  });

  return (
    // ... JSX ...
  );
};
```

**Key principles:**

- Place hook after data-fetching hooks
- Use conditions to wait for critical data
- Include debug context for troubleshooting
- Auto-resets when first condition becomes false (smart default)

### Pattern 2: Controller Operation Tracking

**Applied to 11 operations in `PredictController.ts`:**

- `placeOrder`
- `getMarkets`, `getMarket`, `getPriceHistory`, `getPrices`
- `getPositions`, `getActivity`, `getUnrealizedPnL`
- `getAccountState`, `getBalance`
- `claimWithConfirmation`

**Standard Pattern:**

```typescript
import { trace, endTrace, TraceName, TraceOperation } from '../../../../util/trace';
import { v4 as uuidv4 } from 'uuid';

async someOperation(params: Params): Promise<Result> {
  const traceId = `operation-${Date.now()}`;
  let traceData: { success: boolean; error?: string } | undefined;

  trace({
    name: TraceName.PredictGetMarkets,
    op: TraceOperation.PredictDataFetch,
    id: traceId,
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,  // Always include
      providerId: providerId ?? 'unknown',      // Searchable metadata
    },
    data: {
      marketCount: 42,  // Contextual information
    },
  });

  try {
    const result = await provider.someOperation(params);
    traceData = { success: true };
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    traceData = { success: false, error: errorMessage };

    // Log to Sentry with context
    Logger.error(
      ensureError(error),
      this.getErrorContext('someOperation', {
        message: 'Failed to execute operation',
      }),
    );
    throw error;
  } finally {
    // Always end trace, even on error
    endTrace({
      name: TraceName.PredictGetMarkets,
      id: traceId,
      data: traceData,
    });
  }
}
```

**Key principles:**

- Use `finally` block to ensure `endTrace` always executes
- Store trace data in variable before `finally` block
- Use `tags` for searchable/filterable metadata
- Use `data` for contextual debugging information
- Always include `feature` tag
- Standardize `providerId` to `'unknown'` when not available
- Log errors with proper context

### Pattern 3: Toast Notification Tracking

**Applied in `usePredictPlaceOrder.ts`:**

- Order submission toast
- Order confirmation toast
- Cashout submission toast
- Cashout confirmation toast

**Pattern:**

```typescript
const showOrderPlacedToast = useCallback(() => {
  const traceId = `order-toast-${Date.now()}`;

  trace({
    name: TraceName.PredictOrderConfirmationToast,
    op: TraceOperation.PredictOperation,
    id: traceId,
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
    },
  });

  toastRef?.current?.showToast({
    variant: ToastVariants.Icon,
    iconName: IconName.Check,
    labelOptions: [
      { label: strings('predict.order.prediction_placed'), isBold: true },
    ],
  });

  endTrace({
    name: TraceName.PredictOrderConfirmationToast,
    id: traceId,
    data: { success: true },
  });
}, [toastRef]);
```

**Why track toasts:**

- Measures **user-perceived responsiveness** - time until user sees feedback
- Helps identify if UI rendering (not API) is the bottleneck
- Example insight: "Order API: 200ms, but toast displays after 800ms → UI rendering is slow"
- Completes the full user journey timing

---

## Tags vs Data: Sentry Best Practices

We follow the Perps pattern for organizing trace metadata:

### Tags (Searchable/Filterable)

**Use for:** Attributes you want to filter or group by in Sentry UI

**Examples:**

```typescript
tags: {
  feature: PREDICT_CONSTANTS.FEATURE_NAME,  // Filter all Predict traces
  providerId: 'polymarket',                  // Filter by provider
  side: 'BUY',                               // Filter BUY vs SELL orders
  claimable: true,                           // Filter claimable positions
  interval: '1h',                            // Filter by chart interval
}
```

**Sentry queries:**

```
feature:Predict                    // All Predict traces
feature:Predict side:BUY          // Only BUY orders
feature:Predict providerId:polymarket  // Polymarket operations
```

### Data (Contextual Metrics)

**Use for:** Additional information for debugging, not for filtering

**Examples:**

```typescript
data: {
  success: true,              // Operation result
  error: 'Network timeout',   // Error details
  marketId: 'abc123',         // Specific identifiers
  marketCount: 42,            // Result counts
  queryCount: 5,              // Operation metadata
}
```

---

## Complete Event Catalog

### UI Screens (6 implemented)

| Screen             | TraceName                       | Conditions                                                      | Debug Context                                |
| ------------------ | ------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| **Feed**           | `PredictFeedView`               | `!isSearchVisible`                                              | `entryPoint`, `isSearchVisible`              |
| **Market Details** | `PredictMarketDetailsView`      | `!isMarketFetching`, `!!market`, `!isRefreshing`                | `marketId`, `hasMarket`, `loadingStates`     |
| **Buy Preview**    | `PredictBuyPreviewView`         | `!isBalanceLoading`, `balance !== undefined`, `!!market`        | `marketId`, `hasBalance`, `isBalanceLoading` |
| **Sell Preview**   | `PredictSellPreviewView`        | `!!position`, `!!preview`, `!!market`                           | `marketId`, `hasPosition`, `hasPreview`      |
| **Positions Tab**  | `PredictTabView`                | `!positionsError`, `!headerError`, `!isRefreshing`, `isVisible` | `hasErrors`, `errorStates`, `isRefreshing`   |
| **Transactions**   | `PredictTransactionHistoryView` | `!isLoading`, `activity !== undefined`, `isVisible`             | `activityCount`, `hasActivity`, `isLoading`  |

**Note:** `PredictActivityDetailView` was planned but the component doesn't exist as a separate modal in the codebase.

### Toast Notifications (4 implemented)

| Toast                    | TraceName                         | Purpose                                       |
| ------------------------ | --------------------------------- | --------------------------------------------- |
| **Order Submission**     | `PredictOrderSubmissionToast`     | User feedback timing for order submission     |
| **Order Confirmation**   | `PredictOrderConfirmationToast`   | User feedback timing for order confirmation   |
| **Cashout Submission**   | `PredictCashoutSubmissionToast`   | User feedback timing for cashout submission   |
| **Cashout Confirmation** | `PredictCashoutConfirmationToast` | User feedback timing for cashout confirmation |

### Controller Operations (11 implemented)

| Operation              | TraceName                 | TraceOperation           | Tags                                 | Data                        |
| ---------------------- | ------------------------- | ------------------------ | ------------------------------------ | --------------------------- |
| **Place Order**        | `PredictPlaceOrder`       | `PredictOrderSubmission` | `feature`, `providerId`, `side`      | `marketId`                  |
| **Get Markets**        | `PredictGetMarkets`       | `PredictDataFetch`       | `feature`, `providerId`              | `marketCount`, `queryCount` |
| **Get Market**         | `PredictGetMarket`        | `PredictDataFetch`       | `feature`, `providerId`              | -                           |
| **Get Positions**      | `PredictGetPositions`     | `PredictDataFetch`       | `feature`, `providerId`, `category`  | `positionCount`             |
| **Get Activity**       | `PredictGetActivity`      | `PredictDataFetch`       | `feature`, `providerId`              | `activityCount`             |
| **Get Balance**        | `PredictGetBalance`       | `PredictDataFetch`       | `feature`, `providerId`              | -                           |
| **Get Account State**  | `PredictGetAccountState`  | `PredictDataFetch`       | `feature`, `providerId`              | -                           |
| **Get Price History**  | `PredictGetPriceHistory`  | `PredictDataFetch`       | `feature`, `providerId`, `interval`  | `dataPointCount`            |
| **Get Prices**         | `PredictGetPrices`        | `PredictDataFetch`       | `feature`, `providerId`              | -                           |
| **Get Unrealized PnL** | `PredictGetUnrealizedPnL` | `PredictDataFetch`       | `feature`, `providerId`              | -                           |
| **Claim**              | `PredictClaim`            | `PredictOperation`       | `feature`, `providerId`, `claimable` | `positionCount`             |

---

## Error Logging Integration

All controller operations include comprehensive error logging with context:

### Error Context Helper

**Location:** `PredictController.ts`

```typescript
private getErrorContext(
  method: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    feature: PREDICT_CONSTANTS.FEATURE_NAME,
    context: `PredictController.${method}`,
    ...extra,
  };
}
```

### Usage Pattern

```typescript
try {
  // ... operation ...
} catch (error) {
  Logger.error(
    ensureError(error),
    this.getErrorContext('placeOrder', {
      providerId,
      side: preview.side,
      marketId: analyticsProperties?.marketId,
    }),
  );
  throw error;
}
```

**Benefits:**

- Consistent error context across all operations
- Enables filtering by `feature:Predict` in Sentry
- Links errors to specific controller methods
- Includes operation-specific metadata

---

## Key Implementation Decisions

### ✅ What We Implemented

1. **`finally` pattern for `endTrace`**
   - Ensures traces always complete, even on error
   - Prevents incomplete traces in Sentry

2. **Tags vs Data separation**
   - Tags: Searchable metadata (`feature`, `providerId`, `side`, etc.)
   - Data: Contextual information (`marketId`, `count`, etc.)

3. **Feature tag on all traces**
   - `feature: PREDICT_CONSTANTS.FEATURE_NAME` on every trace
   - Enables easy filtering: `feature:Predict` in Sentry

4. **Debug context on all views**
   - Provides troubleshooting information without cluttering tags
   - Passed directly to `usePredictMeasurement`

5. **Standardized `providerId` defaults**
   - Always use `'unknown'` when provider is not available
   - Consistent with Perps pattern

### ❌ What We Explicitly Excluded

1. **`setMeasurement` calls in controller operations**
   - Perps uses `setMeasurement` sparingly for sub-operations
   - For Predict, `trace()`/`endTrace()` provides sufficient granularity
   - Keeps implementation simple and clean

2. **`DevLogger.log` calls**
   - Development-only logging removed for cleaner code
   - Sentry provides all necessary debugging information

3. **`PredictMeasurementName` enum**
   - Originally planned but not needed
   - `TraceName` enum provides sufficient naming
   - File `performanceMetrics.ts` was deleted

4. **Performance logging markers**
   - `PREDICT_PERFORMANCE_CONFIG.LOGGING_MARKERS` removed
   - Not needed for production monitoring

---

## Usage Guide

### For New Screens/Components

1. **Import required utilities:**

   ```typescript
   import { TraceName } from '../../../../../util/trace';
   import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
   ```

2. **Add measurement hook:**

   ```typescript
   usePredictMeasurement({
     traceName: TraceName.YourNewView,
     conditions: [!isLoading, !!data],
     debugContext: { relevantInfo },
   });
   ```

3. **Add new TraceName to `app/util/trace.ts` if needed**

### For New Controller Operations

1. **Import required utilities:**

   ```typescript
   import {
     trace,
     endTrace,
     TraceName,
     TraceOperation,
   } from '../../../../util/trace';
   import { v4 as uuidv4 } from 'uuid';
   ```

2. **Wrap operation with trace:**

   ```typescript
   async yourOperation(params: Params): Promise<Result> {
     const traceId = `operation-${Date.now()}`;
     let traceData: { success: boolean; error?: string } | undefined;

     trace({
       name: TraceName.YourOperation,
       op: TraceOperation.PredictOperation,
       id: traceId,
       tags: {
         feature: PREDICT_CONSTANTS.FEATURE_NAME,
         // Add searchable metadata
       },
       data: {
         // Add contextual information
       },
     });

     try {
       const result = await someWork();
       traceData = { success: true };
       return result;
     } catch (error) {
       traceData = { success: false, error: errorMessage };
       Logger.error(ensureError(error), this.getErrorContext('yourOperation'));
       throw error;
     } finally {
       endTrace({ name: TraceName.YourOperation, id: traceId, data: traceData });
     }
   }
   ```

3. **Add new TraceName and TraceOperation to `app/util/trace.ts` if needed**

---

## Sentry Queries

### Common Queries

```
# All Predict traces
feature:Predict

# Buy orders only
feature:Predict side:BUY

# Specific provider
feature:Predict providerId:polymarket

# Failed operations
feature:Predict success:false

# Slow operations (P95 > 1s)
feature:Predict p95(transaction.duration):>1000

# Screen loads
feature:Predict transaction:Predict*View

# Data fetches
feature:Predict transaction:Predict Get*
```

### Performance Analysis

Use Sentry's performance dashboard to:

- **Track P50/P95/P99** for each operation
- **Compare before/after** deployments
- **Identify bottlenecks** in user flows
- **Monitor error rates** by operation type
- **Filter by tags** (provider, side, etc.)

---

## Benefits

### For Developers

✅ **Consistent patterns** - Same as Perps, easy to learn  
✅ **Type safety** - All values conform to `TraceValue` type  
✅ **Automatic cleanup** - `finally` blocks ensure traces complete  
✅ **Clear separation** - Tags for filtering, data for debugging  
✅ **Simple API** - Hook handles complexity for views

### For Product/Support

✅ **Searchable** - Filter by feature, provider, operation type  
✅ **Complete coverage** - All user-facing flows tracked  
✅ **User-perceived timing** - Toast tracking shows real UX  
✅ **Error context** - Failures include full debugging information  
✅ **Performance trends** - Track improvements/regressions over time

### For Performance Optimization

✅ **Identify bottlenecks** - See which operations are slow  
✅ **A/B testing** - Compare performance across variants  
✅ **Regression detection** - Alert on performance degradation  
✅ **User segmentation** - Analyze by network, device, etc.

---

## Files Changed

### Core Implementation

- ✅ `app/util/trace.ts` - Added TraceName and TraceOperation enums
- ✅ `app/components/UI/Predict/hooks/usePredictMeasurement.ts` - New hook
- ✅ `app/components/UI/Predict/controllers/PredictController.ts` - 11 operations traced
- ✅ `app/components/UI/Predict/hooks/usePredictPlaceOrder.ts` - Toast tracking
- ✅ `app/components/UI/Predict/constants/errors.ts` - `FEATURE_NAME` constant

### Views

- ✅ `app/components/UI/Predict/views/PredictFeed/PredictFeed.tsx`
- ✅ `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx`
- ✅ `app/components/UI/Predict/views/PredictBuyPreview/PredictBuyPreview.tsx`
- ✅ `app/components/UI/Predict/views/PredictSellPreview/PredictSellPreview.tsx`
- ✅ `app/components/UI/Predict/views/PredictTabView/PredictTabView.tsx`
- ✅ `app/components/UI/Predict/views/PredictTransactionsView/PredictTransactionsView.tsx`

### Documentation

- ✅ `docs/predict/predict-sentry-performance.md` - This document
- ✅ `docs/predict/predict-sentry-implementation-summary.md` - High-level summary
- ✅ `docs/predict/predict-views-analysis.md` - View-by-view analysis
- ✅ `docs/predict/IMPLEMENTATION_VERIFICATION.md` - Verification checklist
- ✅ `app/components/UI/Predict/README.md` - Updated with performance section

---

## Maintenance

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

### When to Update Traces

- Loading patterns change (new conditions needed)
- New debug context would be helpful
- Tags need to be added for better filtering
- Operation structure changes

---

## Comparison with Perps

| Aspect                   | Perps                 | Predict                 | Notes                  |
| ------------------------ | --------------------- | ----------------------- | ---------------------- |
| **Hook Name**            | `usePerpsMeasurement` | `usePredictMeasurement` | Same pattern           |
| **Trace Operations**     | 4 types               | 3 types                 | Simpler for Predict    |
| **Screen Count**         | 8 screens             | 6 screens               | Fewer screens to track |
| **Toast Tracking**       | Yes                   | Yes                     | Same pattern           |
| **WebSocket Tracing**    | Yes                   | No                      | Predict doesn't use WS |
| **Error Context Helper** | Yes                   | Yes                     | Same pattern           |
| **Tags vs Data**         | Yes                   | Yes                     | Same pattern           |
| **Feature Tag**          | Yes                   | Yes                     | Same pattern           |
| **Debug Context**        | Yes                   | Yes                     | Same pattern           |
| **Finally Pattern**      | Yes                   | Yes                     | Same pattern           |

### Key Simplifications for Predict

1. **No WebSocket tracking** - Predict uses REST APIs only
2. **Fewer operations** - Simpler trading flow (no TP/SL, leverage)
3. **Single provider** - Polymarket only (vs Perps multi-provider)
4. **No setMeasurement in operations** - Trace duration is sufficient

### Shared Infrastructure

Both features use:

- Same `trace()` / `endTrace()` utilities
- Same `TraceName` enum pattern
- Same `TraceOperation` enum pattern
- Same error logging with `Logger.error()`
- Same tags vs data separation
- Same feature tag approach

---

## References

- [Perps Sentry Reference](../perps/perps-sentry-reference.md)
- [Sentry Performance Monitoring](https://docs.sentry.io/platforms/react-native/performance/)
- [Predict README](../../app/components/UI/Predict/README.md)
- [TypeScript Guidelines](https://github.com/MetaMask/contributor-docs/blob/main/docs/typescript.md)
- [Unit Testing Guidelines](https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/unit-testing.md)

---

## Questions?

- **Need to add a new screen?** → Use `usePredictMeasurement` pattern
- **Need to trace a new operation?** → Use `trace()`/`endTrace()` with `finally` pattern
- **Want to filter traces in Sentry?** → Add searchable metadata to `tags`
- **Need debugging context?** → Add information to `data` or `debugContext`
- **Traces not appearing?** → Check Sentry configuration and sampling rate

For more detailed examples, see the actual implementation in the files listed above.
