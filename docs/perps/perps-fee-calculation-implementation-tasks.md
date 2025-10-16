# Perps Fee Calculation - Implementation Tasks

This document provides a step-by-step checklist for implementing accurate maker/taker fee calculations for Hyperliquid Perps trading.

## Overview

**Goal**: Replace hardcoded `isMaker: false` with intelligent maker/taker determination based on order characteristics and real-time bid/ask prices.

**Key Files**:

- `app/components/UI/Perps/hooks/usePerpsOrderFees.ts` (Core logic)
- `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx` (Order creation)
- `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx` (Position closing)

## Phase 1: Core Hook Implementation

### Task 1.1: Update `usePerpsOrderFees` Interface

**File**: `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`

- [ ] Remove `isMaker?: boolean` parameter from `UsePerpsOrderFeesParams` interface
- [ ] Add new parameters to `UsePerpsOrderFeesParams`:
  - [ ] `limitPrice?: string` - User's limit price
  - [ ] `currentPrice?: number` - Current market price (mid price)
  - [ ] `direction?: 'long' | 'short'` - Order direction
  - [ ] `currentAskPrice?: number` - Real ask price from L2 order book
  - [ ] `currentBidPrice?: number` - Real bid price from L2 order book
  - [ ] `cachedSpread?: string` - Real spread from order book
  - [ ] `priceTimestamp?: number` - Price data timestamp for staleness check

**Acceptance Criteria**: Interface compiles without TypeScript errors, old `isMaker` parameter removed.

---

### Task 1.2: Add `determineMakerStatus` Function

**File**: `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`

- [ ] Add constant: `PRICE_STALENESS_THRESHOLD_MS = 5000` (5 seconds)
- [ ] Create `determineMakerStatus` function with proper TypeScript signature
- [ ] Implement stale price check (Step 1):
  - [ ] Check if `priceTimestamp` is provided
  - [ ] Calculate age: `Date.now() - priceTimestamp`
  - [ ] If age > 5000ms, log warning and return `false` (taker)
- [ ] Implement market order check (Step 2):
  - [ ] If `orderType === 'market'`, return `false` (taker)
- [ ] Implement limit price validation (Steps 3-4):
  - [ ] Check if `limitPrice` is empty or undefined → return `false`
  - [ ] Parse `limitPrice` to number
  - [ ] Check if parsed value is `NaN` or `<= 0` → return `false`
- [ ] Implement crossed market check (Step 5a):
  - [ ] If both `bestBid` and `bestAsk` are provided
  - [ ] Check if `bestBid >= bestAsk` → log warning and return `false`
- [ ] Implement real bid/ask logic (Step 5b):
  - [ ] For `direction === 'long'`: return `limitPriceNum < bestAsk`
  - [ ] For `direction === 'short'`: return `limitPriceNum > bestBid`
- [ ] Implement spread estimation fallback (Step 6):
  - [ ] Default spread: `0.0005` (0.05%)
  - [ ] If `cachedSpread` provided and valid, calculate dynamic spread
  - [ ] Calculate `askPrice` and `bidPrice` using spread
  - [ ] Apply same comparison logic as Step 5b
- [ ] Add comprehensive DevLogger statements for debugging

**Acceptance Criteria**: Function handles all edge cases, returns boolean, compiles without errors.

---

### Task 1.3: Integrate `determineMakerStatus` into Hook

**File**: `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`

- [ ] Add `useMemo` to calculate `isMaker` automatically
- [ ] Handle case when `currentPrice` or `direction` is missing (return `false`)
- [ ] Call `determineMakerStatus` with all parameters
- [ ] Set proper `useMemo` dependencies:
  - [ ] `orderType`
  - [ ] `limitPrice`
  - [ ] `currentPrice`
  - [ ] `direction`
  - [ ] `currentAskPrice`
  - [ ] `currentBidPrice`
  - [ ] `cachedSpread`
  - [ ] `priceTimestamp`
- [ ] Pass computed `isMaker` to existing `calculateFees` call
- [ ] Verify existing hook logic remains unchanged

**Acceptance Criteria**: Hook automatically determines maker status, no breaking changes to return type.

---

## Phase 2: Component Integration

### Task 2.1: Update `PerpsOrderView` - Enable Order Book

**File**: `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx`

**Line ~292** (in `usePerpsLivePrices` call):

- [ ] Locate existing `usePerpsLivePrices` call
- [ ] Add `includeOrderBook: true` parameter
- [ ] Verify `currentPrice` variable receives bid/ask/spread data

**Acceptance Criteria**: Order book data is subscribed and available in `currentPrice` object.

---

### Task 2.2: Update `PerpsOrderView` - Pass Parameters to Hook

**File**: `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx`

**Line ~248** (in `usePerpsOrderFees` call):

- [ ] Remove `isMaker: false` line
- [ ] Add new parameters:
  - [ ] `limitPrice: orderForm.limitPrice`
  - [ ] `currentPrice: assetData.price`
  - [ ] `direction: orderForm.direction`
  - [ ] `currentAskPrice: currentPrice?.bestAsk ? parseFloat(currentPrice.bestAsk) : undefined`
  - [ ] `currentBidPrice: currentPrice?.bestBid ? parseFloat(currentPrice.bestBid) : undefined`
  - [ ] `cachedSpread: currentPrice?.spread`
  - [ ] `priceTimestamp: currentPrice?.timestamp`
- [ ] Verify TypeScript compiles without errors
- [ ] Test that fee display updates dynamically

**Acceptance Criteria**: Order view correctly passes all parameters, fees update based on limit price changes.

---

### Task 2.3: Update `PerpsClosePositionView` - Enable Order Book

**File**: `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx`

- [ ] Locate existing `usePerpsLivePrices` call (if present)
- [ ] Add `includeOrderBook: true` parameter
- [ ] If no `usePerpsLivePrices` call exists, verify price data source includes bid/ask

**Acceptance Criteria**: Close position view has access to bid/ask data.

---

### Task 2.4: Update `PerpsClosePositionView` - Pass Parameters to Hook

**File**: `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx`

**Line ~190** (in `usePerpsOrderFees` call):

- [ ] Remove `isMaker: false` line
- [ ] Add new parameters:
  - [ ] `limitPrice: limitPrice` (if available)
  - [ ] `currentPrice: effectivePrice`
  - [ ] `direction: isLong ? 'short' : 'long'` (opposite direction when closing)
  - [ ] `currentAskPrice: priceData[position.coin]?.bestAsk ? parseFloat(priceData[position.coin].bestAsk) : undefined`
  - [ ] `currentBidPrice: priceData[position.coin]?.bestBid ? parseFloat(priceData[position.coin].bestBid) : undefined`
  - [ ] `cachedSpread: priceData[position.coin]?.spread`
  - [ ] `priceTimestamp: priceData[position.coin]?.timestamp`
- [ ] Verify TypeScript compiles without errors
- [ ] Test that close position fees update correctly

**Acceptance Criteria**: Close position view correctly determines maker/taker status, especially for opposite direction.

---

## Phase 3: Testing

### Task 3.1: Write Comprehensive Unit Tests

**File**: `app/components/UI/Perps/hooks/usePerpsOrderFees.test.ts`

- [ ] Set up test file with proper imports and mocks
- [ ] Mock all external dependencies (no actual API calls)
- [ ] **Market Orders**:
  - [ ] Test: Market orders always return taker (0.045%)
- [ ] **Limit Orders - Long Direction**:
  - [ ] Test: Buy limit at ask price → taker
  - [ ] Test: Buy limit above ask → taker
  - [ ] Test: Buy limit below ask → maker
- [ ] **Limit Orders - Short Direction**:
  - [ ] Test: Sell limit at bid → taker
  - [ ] Test: Sell limit below bid → taker
  - [ ] Test: Sell limit above bid → maker
- [ ] **Edge Cases - Stale Price**:
  - [ ] Test: Price older than 5s → taker
  - [ ] Test: Price within 5s → normal logic
  - [ ] Test: No timestamp → normal logic
- [ ] **Edge Cases - Crossed Market**:
  - [ ] Test: bid >= ask → taker
  - [ ] Test: bid < ask → normal logic
- [ ] **Edge Cases - Invalid Data**:
  - [ ] Test: Missing currentPrice → taker
  - [ ] Test: Empty limitPrice → taker
  - [ ] Test: Invalid limitPrice (NaN) → taker
  - [ ] Test: Zero limitPrice → taker
  - [ ] Test: Negative limitPrice → taker
  - [ ] Test: Missing direction → taker
- [ ] **Spread Estimation**:
  - [ ] Test: Uses cached spread when valid
  - [ ] Test: Falls back to 0.05% when no bid/ask or spread
  - [ ] Test: Ignores invalid cached spread (NaN, 0, negative)
- [ ] **Close Position**:
  - [ ] Test: Closing long uses short direction
  - [ ] Test: Closing short uses long direction
- [ ] **Fee Calculations**:
  - [ ] Test: Maker order uses 0.015% rate
  - [ ] Test: Taker order uses 0.045% rate
  - [ ] Test: Fee amount calculated correctly (USD)
- [ ] **Hook Integration**:
  - [ ] Test: useMemo recalculates on relevant dependency changes
  - [ ] Test: useMemo does NOT recalculate on irrelevant changes
- [ ] Run tests: `npx jest app/components/UI/Perps/hooks/usePerpsOrderFees.test.ts --no-coverage`
- [ ] Verify all tests pass

**Acceptance Criteria**: All tests pass, high code coverage achieved, no console errors.

---

### Task 3.2: Manual Testing - Market Orders

- [ ] Open PerpsOrderView for BTC
- [ ] Set order type to "Market"
- [ ] Enter amount (e.g., $1000)
- [ ] Verify fee shows 0.045% (e.g., $0.45 for $1000)
- [ ] Switch between Long/Short → fee rate stays 0.045%

**Acceptance Criteria**: Market orders always show taker fee.

---

### Task 3.3: Manual Testing - Limit Orders (Maker)

- [ ] Open PerpsOrderView for BTC
- [ ] Set order type to "Limit"
- [ ] For Long: Set limit price BELOW current ask (e.g., ask=$50,000, limit=$49,500)
- [ ] Enter amount (e.g., $1000)
- [ ] Verify fee shows 0.015% (e.g., $0.15 for $1000)
- [ ] For Short: Set limit price ABOVE current bid
- [ ] Verify fee shows 0.015%

**Acceptance Criteria**: Limit orders that add liquidity show maker fee (0.015%).

---

### Task 3.4: Manual Testing - Limit Orders (Taker)

- [ ] Open PerpsOrderView for BTC
- [ ] Set order type to "Limit"
- [ ] For Long: Set limit price AT or ABOVE current ask (e.g., ask=$50,000, limit=$50,100)
- [ ] Enter amount (e.g., $1000)
- [ ] Verify fee shows 0.045% (e.g., $0.45 for $1000)
- [ ] For Short: Set limit price AT or BELOW current bid
- [ ] Verify fee shows 0.045%

**Acceptance Criteria**: Limit orders that cross market show taker fee (0.045%).

---

### Task 3.5: Manual Testing - Dynamic Fee Updates

- [ ] Open PerpsOrderView for BTC
- [ ] Set order type to "Limit", direction "Long"
- [ ] Set limit price below ask → verify 0.015% fee
- [ ] Gradually increase limit price to cross ask → verify fee switches to 0.045%
- [ ] Decrease limit price back below ask → verify fee switches to 0.015%

**Acceptance Criteria**: Fee updates dynamically as limit price changes relative to market.

---

### Task 3.6: Manual Testing - Close Position

- [ ] Open an existing long BTC position
- [ ] Navigate to close position view
- [ ] Set order type to "Limit"
- [ ] Set limit price ABOVE current bid (maker for short/close)
- [ ] Verify fee shows 0.015%
- [ ] Set limit price AT or BELOW current bid (taker)
- [ ] Verify fee shows 0.045%

**Acceptance Criteria**: Close position correctly uses opposite direction for maker/taker determination.

---

### Task 3.7: Manual Testing - Edge Cases

- [ ] Test with no internet (stale price) → should default to taker
- [ ] Test with market order and limit price set → should ignore limit price, use taker
- [ ] Test switching from Market to Limit without setting price → should show taker until price set
- [ ] Test with very small amounts → fees should still calculate correctly

**Acceptance Criteria**: Edge cases handled gracefully, no crashes, conservative defaults applied.

---

## Phase 4: Code Quality & Cleanup

### Task 4.1: Run Linting and Type Checking

- [ ] Run ESLint on modified files:
  ```bash
  yarn lint app/components/UI/Perps/hooks/usePerpsOrderFees.ts --fix
  yarn lint app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx --fix
  yarn lint app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx --fix
  ```
- [ ] Fix any ESLint errors
- [ ] Run TypeScript check:
  ```bash
  yarn lint:tsc
  ```
- [ ] Fix any TypeScript errors

**Acceptance Criteria**: No linting or TypeScript errors.

---

### Task 4.2: Run Prettier Formatting

- [ ] Format modified files:
  ```bash
  npx prettier --write 'app/components/UI/Perps/hooks/usePerpsOrderFees.ts'
  npx prettier --write 'app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx'
  npx prettier --write 'app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx'
  npx prettier --write 'app/components/UI/Perps/hooks/usePerpsOrderFees.test.ts'
  ```

**Acceptance Criteria**: All files properly formatted.

---

### Task 4.3: Code Review Checklist

- [ ] No `any` types used
- [ ] No hardcoded strings (use localization where needed)
- [ ] No inline styles
- [ ] All functions have clear, descriptive names
- [ ] Complex logic has explanatory comments
- [ ] No TODO comments left in code
- [ ] All DevLogger statements use appropriate log levels
- [ ] useMemo dependencies are complete and correct
- [ ] No unnecessary re-renders introduced

**Acceptance Criteria**: Code passes peer review, follows CLAUDE.md guidelines.

---

## Phase 5: Documentation & Deployment

### Task 5.1: Update Documentation

- [ ] Add inline JSDoc comments to `determineMakerStatus` function
- [ ] Update any relevant README files
- [ ] Document edge cases and their handling
- [ ] Note any limitations or future enhancements

**Acceptance Criteria**: Code is well-documented, intent is clear.

---

### Task 5.2: Final Integration Testing

- [ ] Test on iOS simulator
- [ ] Test on Android simulator
- [ ] Test multiple market symbols (BTC, ETH, SOL)
- [ ] Test with different account balances
- [ ] Test rapid limit price changes (no crashes)
- [ ] Test order submission with maker vs taker fees

**Acceptance Criteria**: Feature works correctly across all platforms and scenarios.

---

### Task 5.3: Performance Validation

- [ ] Measure fee calculation time (should be <5ms)
- [ ] Verify no memory leaks (check useMemo cleanup)
- [ ] Verify WebSocket subscription cleanup on unmount
- [ ] Check for unnecessary re-renders using React DevTools

**Acceptance Criteria**: No performance regressions, optimal rendering.

---

## Completion Checklist

- [ ] All Phase 1 tasks completed (Core hook implementation)
- [ ] All Phase 2 tasks completed (Component integration)
- [ ] All Phase 3 tasks completed (Testing)
- [ ] All Phase 4 tasks completed (Code quality)
- [ ] All Phase 5 tasks completed (Documentation & deployment)
- [ ] All tests passing
- [ ] No linting or TypeScript errors
- [ ] Manual testing scenarios verified
- [ ] Code reviewed and approved
- [ ] Feature ready for deployment

---

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate**: Revert commit that removed `isMaker: false` hardcode
2. **Short-term**: Investigate issue, fix in development branch
3. **Long-term**: Re-deploy with fixes and additional tests

---

## Success Metrics

- **Accuracy**: Maker/taker determination matches actual order execution ≥95% of time
- **Performance**: Fee calculation overhead <5ms
- **Test Coverage**: ≥90% code coverage for new logic
- **User Impact**: Maker order fees reduced by 66% (0.045% → 0.015%)
- **Stability**: No increase in error rates or crashes

---

## Notes

- Conservative approach: When in doubt, default to taker fee (never over-promise savings)
- Real bid/ask prices are PRIMARY, spread estimation is FALLBACK only
- Partial fill scenario: v1 assumes 100% taker if limit touches/crosses market
- Future enhancement: Blended fee estimation using order book depth
