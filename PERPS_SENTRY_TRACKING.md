# Perps Sentry Performance Traces Reference - v1.1

---

## Funding Flow

### Funding Screen Input Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Implementation:** deposit.tsx:54 + usePerpsScreenTracking

### Source Token List Loaded (incl. balances)

**Target:** 1s (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** usePerpsDepositView.ts:76-88 + direct setMeasurement calls

### Quote Received

**Target:** 2s (HIGH) | **Status:** ✅ Implemented
**Implementation:** usePerpsDepositView.ts:47-66 + direct setMeasurement calls

### Transaction Submission Toast Displayed

**Target:** 1s (MEDIUM) | **Status:** ⚠️ Deferred
**Note:** Complex to implement due to confirmation system architecture - requires transaction controller integration

### Transaction Execution Confirmation Toast Displayed

**Target:** 30s (MEDIUM) | **Status:** ⚠️ Deferred
**Note:** Complex to implement due to confirmation system architecture - requires transaction status monitoring

---

## Withdrawal Flow

### Withdrawal Screen Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** PerpsWithdrawView.tsx:148 + usePerpsMeasurement with conditions
**Measurement:** Waits for account balance, destination token, and balance calculation to complete

### Transaction Submission Screen Loaded

**Target:** 1s (MEDIUM) | **Status:** 🚫 Canceled
**Reason:** No separate transaction submission screen in withdrawal UX - flow closes immediately after form submission

### Transaction Confirmation Screen Loaded

**Target:** 15s (MEDIUM) | **Status:** 🚫 Canceled
**Reason:** No separate transaction confirmation screen in withdrawal UX - happens in background

---

## Trading Flow

### Perps Markets Screen Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Implementation:** PerpsMarketListView.tsx:212 + usePerpsMeasurement

### Perps Asset Screen Loaded (incl. chart)

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Implementation:** PerpsMarketDetailsView.tsx:219 + usePerpsMeasurement

### Trade Screen Loaded

**Target:** 200ms (HIGH) | **Status:** ✅ Implemented
**Implementation:** PerpsOrderView.tsx:272 + usePerpsMeasurement

### TP/SL Bottom Sheet Loaded

**Target:** 50ms (MEDIUM) | **Status:** 🚫 Removed - Not meaningful measurement
**Reason:** Conditions were already satisfied when measurement started, resulting in non-actionable 0ms readings. Data and UI are pre-loaded from parent component.

### Leverage Bottom Sheet Loaded

**Target:** 50ms (MEDIUM) | **Status:** 🚫 Removed - Not meaningful measurement
**Reason:** Conditions were already satisfied when measurement started, resulting in non-actionable 0ms readings. Price calculations and data are instantly available.

### Order Submission Toast Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** usePerpsOrderExecution.ts:62 + setMeasurement

### Order Confirmation Toast Loaded

**Target:** 1s (HIGH) | **Status:** ✅ Implemented
**Implementation:** usePerpsOrderExecution.ts:112 + setMeasurement

### Asset Balances Displayed and Updated

**Target:** 200ms (MEDIUM) | **Status:** 🚫 Removed - Not meaningful measurement
**Reason:** Balance updates are synchronous React state changes that complete in one frame (~16ms). Measuring this provides no actionable performance insights and creates noise in Sentry data.

---

## Position Close Flow

### Position Data Loaded in Perp Tab

**Target:** 200ms (MEDIUM) | **Status:** 🚫 Canceled
**Reason:** Position data comes from WebSocket streams via PerpsStreamManager - measuring cached data render doesn't reflect actual performance bottlenecks

### Position Data Loaded in Perp Asset Screen

**Target:** 200ms (MEDIUM) | **Status:** 🚫 Canceled
**Reason:** Position data comes from WebSocket streams via PerpsStreamManager - measuring cached data render doesn't reflect actual performance bottlenecks

### Close Screen Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** PerpsClosePositionView.tsx:88 + usePerpsScreenTracking

### Close Order Submission Toast Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** usePerpsClosePosition.ts:117 + setMeasurement

### Close Order Confirmation Toast Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** usePerpsClosePosition.ts:154 + setMeasurement

---

## Transaction History

### Transaction History Screen Loaded

**Target:** 1s (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** PerpsTransactionsView.tsx:64 + usePerpsMeasurement
**Measurement:** Waits for transaction data to be loaded and displayed (`flatListData.length > 0`)

### Perps Tab Loaded

**Target:** 200ms (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** PerpsTabView.tsx:66 + usePerpsMeasurement
**Note:** Measures tab readiness including WebSocket data - provides insights into cold start vs warm performance patterns

---

## Other Metrics

### Crash Rate on a Perp Screen

**Status:** ⚠️ Standard Sentry crash tracking
**Implementation:** Global Sentry error tracking

---

## API Performance

### Data Lake API Call

**Target:** 2s | **Status:** ✅ Implemented
**Implementation:** PerpsController.ts:2289 + setMeasurement

### Data Lake API Retry

**Target:** 5s | **Status:** ✅ Implemented
**Implementation:** PerpsController.ts:2342 + setMeasurement

---

## WebSocket Performance

### WebSocket Connection Establishment

**Target:** 2s (HIGH) | **Status:** ✅ Implemented
**Implementation:** PerpsConnectionManager.ts:383-424 + setMeasurement (pure connection time)

### WebSocket Connection with Preload

**Target:** 4s (HIGH) | **Status:** ✅ Implemented
**Implementation:** PerpsConnectionManager.ts:429-437 + setMeasurement (user-perceived performance including data preload)

### Time to First Position Data After Subscription

**Target:** 1s (HIGH) | **Status:** ✅ Implemented
**Implementation:** PerpsStreamManager.tsx:467-497 + setMeasurement (WebSocket-level first data timing, not component-level)

### Account Context Switch & Reconnection Performance

**Target:** 3s (MEDIUM) | **Status:** ✅ Implemented
**Implementation:** PerpsConnectionManager.ts:493-578 + setMeasurement (includes preload time)

---

## Performance Measurement Patterns - Source of Truth

### ✅ Unified usePerpsMeasurement Hook (Recommended)

**Pattern:** Use `usePerpsMeasurement` for all measurement scenarios
**When:** All performance measurements - screens, bottom sheets, complex flows
**Benefits:** Simplified API, auto-reset, unified patterns, better performance

#### Simple API (90% of use cases)

```typescript
// Immediate single measurement (most common)
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.CLOSE_SCREEN_LOADED,
  // No conditions = immediate measurement
});

// Conditional measurement
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.TRADE_SCREEN_LOADED,
  conditions: [!!currentPrice, !!account], // Start immediately, end when all true
});

// Bottom sheet with auto-reset (example only - actual bottom sheet measurements removed due to 0ms readings)
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.SOME_MODAL_LOADED,
  conditions: [isVisible, !!dataReady], // Auto-resets when !isVisible
  debugContext: { contextData },
});
```

#### Advanced API (full control)

```typescript
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.COMPLEX_WORKFLOW,
  startConditions: [userInteracted, dataReady],
  endConditions: [workflowComplete, !hasErrors],
  resetConditions: [userCanceled, sessionExpired],
});
```

#### Legacy Compatibility (migration only)

```typescript
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.ASSET_SCREEN_LOADED,
  dependencies: [market, marketStats, !isLoadingHistory], // Legacy pattern
});
```

### ✅ Screen Load Measurements

**Pattern:** Use `usePerpsMeasurement` - immediate for simple screens, conditions for data-dependent screens
**When:** Measuring screen load performance
**Example:** Main screen loads (Order View, Market List, Asset Details, etc.)

**Code Pattern:**

```typescript
// Immediate measurement for screens that are ready on mount
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.CLOSE_SCREEN_LOADED,
});

// Conditional measurement for data-dependent screens
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.TRADE_SCREEN_LOADED,
  conditions: [!!currentPrice, !!account], // Wait for data to load
});
```

### ✅ Bottom Sheet/Modal Measurements

**Pattern:** Use `usePerpsMeasurement` with `conditions` API (Recommended)
**When:** Measuring from visibility change to ready state
**Benefits:** Auto-reset when visibility changes, simplified code, no manual refs

**Code Pattern (Recommended - usePerpsMeasurement):**

```typescript
// Example only - actual bottom sheet measurements removed due to 0ms readings
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.SOME_MODAL_LOADED,
  conditions: [isVisible, !!dataReady], // Auto-resets when !isVisible
  debugContext: { contextData },
});
```

**Code Pattern (Legacy - Manual measurement):**

```typescript
const bottomSheetStartTime = useRef<number | null>(null);
const hasTrackedLoad = useRef(false);

useEffect(() => {
  if (isVisible && !hasTrackedLoad.current) {
    bottomSheetStartTime.current = performance.now();
  }
}, [isVisible]);

useEffect(() => {
  if (
    isVisible &&
    bottomSheetStartTime.current &&
    dataReady &&
    !hasTrackedLoad.current
  ) {
    const loadTime = performance.now() - bottomSheetStartTime.current;
    DevLogger.log(`AAABBB PerpsBottomSheet: ${metricName} completed`, {
      metric: metricName,
      duration: `${loadTime.toFixed(0)}ms`,
      asset,
    });
    setMeasurement(metricName, loadTime, 'millisecond');
    hasTrackedLoad.current = true;
  }
}, [isVisible, dataReady, asset]);
```

**Code Pattern (Option 2 - Manual measurement):**

```typescript
useEffect(() => {
  if (isVisible) {
    startMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
    bottomSheetRef.current?.onOpenBottomSheet(() => {
      const loadTime = endMeasure(
        PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED,
      );
      DevLogger.log(`AAABBB PerpsBottomSheet: ${metricName} completed`, {
        metric: metricName,
        duration: `${loadTime ? loadTime.toFixed(0) : 'unknown'}ms`,
        asset,
      });
    });
  }
}, [isVisible, asset]); // Remove startMeasure/endMeasure from dependencies!
```

### ✅ Action/Event Measurements

**Pattern:** Manual `startMeasure`/`endMeasure`
**When:** Measuring specific user actions or data processing
**Example:** API calls, form submissions, data updates

**Code Pattern:**

```typescript
useEffect(() => {
  if (shouldMeasure) {
    startMeasure(PerpsMeasurementName.ACTION_METRIC);
    // Use requestAnimationFrame for UI updates
    requestAnimationFrame(() => {
      endMeasure(PerpsMeasurementName.ACTION_METRIC);
    });
  }
}, [shouldMeasure]); // Never include startMeasure/endMeasure in dependencies
```

### ❌ Anti-Patterns - AVOID THESE

#### ❌ DEPRECATED: `usePerpsScreenTracking` hook

**Problem:** Legacy pattern, replaced by unified `usePerpsMeasurement`
**Migration:** Use `usePerpsMeasurement` with `conditions` instead of `dependencies`

```typescript
// ❌ DEPRECATED - Migrate to usePerpsMeasurement!
usePerpsScreenTracking({
  screenName: PerpsMeasurementName.TRADE_SCREEN_LOADED,
  dependencies: [currentPrice, account], // Old pattern
});

// ✅ CORRECT - Use the new unified hook
usePerpsMeasurement({
  measurementName: PerpsMeasurementName.TRADE_SCREEN_LOADED,
  conditions: [!!currentPrice, !!account], // New simplified pattern
});
```

#### ❌ NEVER: Use legacy patterns for bottom sheets/modals

**Problem:** Creates massive timing gaps (75+ seconds) when sheets open later

```typescript
// ❌ WRONG - Don't do this!
usePerpsScreenTracking({
  screenName: PerpsMeasurementName.LEVERAGE_BOTTOM_SHEET_LOADED,
  dependencies: [isVisible], // BAD: timing reference from mount, not visibility
});
```

#### ❌ NEVER: Include measurement functions in useEffect dependencies

**Problem:** Causes unnecessary re-runs and potential measurement issues

```typescript
// ❌ WRONG - Don't include these in dependencies!
}, [data, startMeasure, endMeasure]); // BAD: measurement functions change on every render
```

#### ❌ NEVER: Mix measurement patterns

**Problem:** Inconsistent and unreliable measurements

```typescript
// ❌ WRONG - Don't mix patterns!
usePerpsScreenTracking({ ... });
startMeasure(sameMeasurementName); // BAD: double measurement
```

### 🏷️ Logging Standard

**Use markers from `PERFORMANCE_CONFIG.LOGGING_MARKERS`:**

- `PERPSMARK_SENTRY` - Performance measurements
- `PERPSMARK_WS` - WebSocket logs
- `PERPSMARK_DEBUG` - Performance validation
- Filter: `adb logcat | grep PERPSMARK_`

### 📋 Pattern Decision Tree

1. **Screen ready immediately?** → Use `usePerpsMeasurement` with no conditions
2. **Screen needs data loading?** → Use `usePerpsMeasurement` with `conditions`
3. **Bottom sheet/modal?** → Use `usePerpsMeasurement` with `conditions` (auto-reset)
4. **Complex workflow?** → Use `usePerpsMeasurement` with advanced API
5. **Simple action/event?** → Use manual `setMeasurement()` calls
6. **WebSocket/API?** → Use direct `setMeasurement()` calls

**Measurement Philosophy:** Measure from component mount to when screen is usable by user. Immediate for static screens, conditions-based for data-dependent screens.

**Rule of thumb:** Use `usePerpsMeasurement` for React component-based measurements, direct `setMeasurement()` for non-component logic.

---

## Implementation Architecture

### ✅ Standardized Hooks

- `usePerpsMeasurement` - Unified hook for all measurements (Recommended)
- `usePerpsScreenTracking` - Legacy screen load timing (Deprecated)

### ✅ Improved Architecture

- New deposit flow uses proper `usePerpsScreenTracking`
- Quote tracking integrated directly into `usePerpsDepositView` with direct measurement calls
- MetaMetrics events moved to dedicated `usePerpsDepositEvents` hook
- Removed unnecessary abstraction layers and manual tracking effects

### ✅ Recent Improvements

- Removed legacy `usePerpsDepositStatus` hook (~200 lines)
- Fixed quote tracking to use actual deposit flow with proper validation
- Added 3 missing funding flow measurements (source tokens, quote tracking)
- Implemented dynamic source tracking for accurate user journey analytics
- Removed problematic `usePerpsDepositSubmission` hook that used inefficient transaction watching
- Marked transaction submission/confirmation tracking as deferred due to architectural constraints
- Canceled withdrawal transaction screen measurements that don't correspond to actual UX screens
- Canceled position data load measurements that don't reflect WebSocket architecture reality
- Added WebSocket performance metrics to track actual data flow bottlenecks instead of cached UI renders

### 📊 Performance Targets

- Performance targets configured in Sentry dashboard
- No local validation - measurements sent directly to Sentry
- Targets align with p75 requirements for monitoring and alerting
