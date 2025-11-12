# Predict Views Analysis - Sentry Performance Tracking

## All Views in `/app/components/UI/Predict/views/`

| View                        | In Plan?    | Should Track? | Priority | Notes                                    |
| --------------------------- | ----------- | ------------- | -------- | ---------------------------------------- |
| **PredictFeed**             | ✅ Yes (P1) | ✅ Yes        | High     | Main feed/market list screen             |
| **PredictMarketDetails**    | ✅ Yes (P1) | ✅ Yes        | High     | Market detail screen (critical UX)       |
| **PredictBuyPreview**       | ✅ Yes (P1) | ✅ Yes        | High     | Buy order preview modal                  |
| **PredictSellPreview**      | ✅ Yes (P2) | ✅ Yes        | High     | Sell order preview modal                 |
| **PredictTransactionsView** | ✅ Yes (P2) | ✅ Yes        | Medium   | Transaction history list                 |
| **PredictTabView**          | ❌ No       | ⚠️ Maybe      | Medium   | Positions tab container                  |
| **PredictAddFundsModal**    | ❌ No       | ❌ No         | Low      | Simple wrapper, tracked in plan as modal |
| **PredictUnavailableModal** | ❌ No       | ❌ No         | Low      | Geo-blocking modal, tracked in plan      |

## Issues Found

### ⚠️ PredictCashOut Doesn't Exist!

The plan references `PredictCashOut` view but **it doesn't exist**. Cash out/claim functionality is handled through:

- `PredictPositionResolved` component (claim button on resolved positions)
- `usePredictClaim` hook (claim operation - already tracked ✅)
- No separate "cash out screen" exists

**Action Required:** Remove `PredictCashOutView` from the plan.

---

## Detailed Analysis

### ✅ Already in Plan (5 views)

#### 1. PredictFeed ✅

- **Status:** Priority 1 ✅
- **What it does:** Main market feed with tabs (trending, new, sports, crypto, politics)
- **Critical?** Yes - most visited screen
- **Correct coverage:** ✅

#### 2. PredictMarketDetails ✅

- **Status:** Priority 1 ✅
- **What it does:** Shows individual market details, chart, outcomes, positions
- **Critical?** Yes - core conversion funnel
- **Correct coverage:** ✅

#### 3. PredictBuyPreview ✅

- **Status:** Priority 1 ✅
- **What it does:** Buy order preview and confirmation
- **Critical?** Yes - revenue impact
- **Correct coverage:** ✅

#### 4. PredictSellPreview ✅

- **Status:** Priority 2 ✅
- **What it does:** Sell order preview and confirmation
- **Critical?** Yes - user exit flow
- **Correct coverage:** ✅

#### 5. PredictTransactionsView ✅

- **Status:** Priority 2 ✅
- **What it does:** Transaction history list grouped by date
- **Critical?** Medium - activity tracking
- **Correct coverage:** ✅
- **Note:** Not yet integrated into navigation, but will be

---

### ⚠️ Missing from Plan - Should Consider

#### 6. PredictTabView ⚠️

**What it is:**

```typescript
// Container that displays:
// - PredictPositionsHeader (P&L, balance)
// - PredictPositions (list of user positions)
// - Pull-to-refresh functionality
```

**Analysis:**

- **Should track?** ⚠️ **MAYBE**
- **Reason TO track:**
  - First screen users see when opening Predict from wallet
  - Shows positions and P&L (critical UX)
  - Pull-to-refresh is a common user action
  - Helps measure "time to see my positions"
- **Reason NOT to track:**
  - It's a simple container view
  - Actual data loading is in `PredictPositions` component
  - Component-level tracking might be sufficient
  - `getPositions` operation already tracked ✅

**Recommendation:**

- **Add to Priority 2** if you want to track the **complete tab load experience** (header + positions)
- **Skip it** if component-level data fetching (already tracked) is sufficient

**If added:**

```typescript
usePredictMeasurement({
  traceName: TraceName.PredictTabView,
  conditions: [!positionsError, !headerError, !isRefreshing],
});
```

---

### ❌ Should NOT Track

#### 7. PredictAddFundsModal ❌

**What it is:**

- Simple wrapper that opens `PredictAddFundsSheet` component
- Just 30 lines of navigation wrapper code

**Analysis:**

- **Should track?** ❌ **NO**
- **Reason:**
  - It's already tracked in the plan as `PREDICT_ADD_FUNDS_MODAL_LOADED` (component-level)
  - The actual UI is in `PredictAddFundsSheet` component
  - Modal wrapper has no meaningful load time
  - No user-perceivable performance impact

**Status:** Already covered via component tracking ✅

---

#### 8. PredictUnavailableModal ❌

**What it is:**

- Simple wrapper that opens `PredictUnavailable` component
- Geo-blocking / feature unavailable message
- Just 26 lines of navigation wrapper code

**Analysis:**

- **Should track?** ❌ **NO**
- **Reason:**
  - It's already tracked in the plan as `PREDICT_UNAVAILABLE_MODAL_LOADED` (component-level)
  - The actual UI is in `PredictUnavailable` component
  - Modal wrapper has no meaningful load time
  - Only shown to users who can't access the feature
  - Not a conversion funnel metric

**Status:** Already covered via component tracking ✅

---

## Summary & Recommendations

### Current Plan Status

| Category  | In Plan                     | Actually Exist           | Coverage            |
| --------- | --------------------------- | ------------------------ | ------------------- |
| **Views** | 7 screens                   | 8 views (6 real screens) | 6/6 real = **100%** |
| **Issue** | References `PredictCashOut` | Doesn't exist            | ❌ Needs removal    |

### Actions Required

#### 1. ✅ Remove from Plan (Doesn't Exist)

- **PredictCashOutView** - This view doesn't exist
  - Cashout happens via claim button on resolved positions
  - `PredictClaim` operation already tracked ✅
  - No separate screen needed

#### 2. ⚠️ Optional Addition

- **PredictTabView** - Consider adding if you want complete tab load timing
  - **Add it if:** You want "time to see positions" metric
  - **Skip it if:** Component data loading (already tracked) is sufficient
  - **My take:** Probably worth adding for complete coverage (5 min work)

#### 3. ✅ Already Covered (No Action)

- **PredictAddFundsModal** - Covered as component ✅
- **PredictUnavailableModal** - Covered as component ✅

---

## Updated View Coverage (After Corrections)

### Actual Screen Views: 6 total

1. ✅ PredictFeed (Priority 1) - **Tracked**
2. ✅ PredictMarketDetails (Priority 1) - **Tracked**
3. ✅ PredictBuyPreview (Priority 1) - **Tracked**
4. ✅ PredictSellPreview (Priority 2) - **Tracked**
5. ✅ PredictTransactionsView (Priority 2) - **Tracked**
6. ⚠️ PredictTabView (Not in plan) - **Consider adding**

### Modal Wrappers: 2 total (covered at component level)

7. ✅ PredictAddFundsModal - **Covered as component**
8. ✅ PredictUnavailableModal - **Covered as component**

### Non-existent (Remove from plan): 1

9. ❌ PredictCashOut - **Doesn't exist, remove from plan**

---

## Corrected Plan Coverage

### After removing PredictCashOut and optionally adding PredictTabView:

**Option A (Conservative - Skip PredictTabView):**

- Real screen views: **6/6** (100% coverage ✅)
- All critical user flows tracked

**Option B (Complete - Add PredictTabView):**

- Real screen views: **7/6** (117% coverage ✅)
- Includes container-level tab metrics
- More comprehensive but slightly redundant

---

## My Recommendation

### Must Do:

1. ✅ **Remove PredictCashOutView** from plan (doesn't exist)
   - Remove from constants
   - Remove from TraceName enum
   - Remove from event catalog
   - Remove Section 3.6 implementation code

### Should Consider:

2. ⚠️ **Add PredictTabView** to Priority 2
   - Tracks "positions tab load" experience
   - Completes the user journey: open app → see positions
   - Only 5 minutes of work
   - Provides "time to first meaningful paint" for positions

### No Action:

3. ✅ Modal wrappers already covered at component level

---

## Final Recommendation

**Clean up plan by:**

1. Removing non-existent `PredictCashOut`
2. Adding `PredictTabView` (optional but recommended)

This gives you **6-7 real screen views** tracked (depending on whether you add TabView), with **100% coverage** of actual user-facing screens.

All critical conversion funnel points are tracked:

- ✅ Feed → Market Details → Buy/Sell Preview → Order Placement
- ✅ Positions Tab (if added)
- ✅ Transaction History
- ✅ Activity Details

**Coverage is solid!** 🎯
