# Perps Fee Calculation Improvement Plan

## Executive Summary

This document outlines a production-ready solution to improve fee calculations for Hyperliquid Perps trading by accurately determining maker vs. taker status for orders. Currently, the application hardcodes `isMaker: false` when opening and closing positions, leading to conservative (higher) fee estimates. This improvement will provide accurate fee calculations and fee rates (both USD amount and percentage) by analyzing order characteristics.

## Current State Analysis

### Current Implementation

**Location**: `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`

**Key Findings**:

1. **Hardcoded Maker Status**: Both `PerpsOrderView.tsx:252` and `PerpsClosePositionView.tsx:193` pass `isMaker: false`
2. **Conservative Approach**: Always uses higher taker fees (0.045%) instead of potentially lower maker fees (0.015%)
3. **Centralized Logic**: Fee calculation already centralized in `usePerpsOrderFees` hook
4. **Provider Support**: `HyperLiquidProvider.calculateFees()` already accepts `isMaker` parameter

### Fee Structure (Hyperliquid Base Tier 0)

- **Taker Fee**: 0.045% (0.00045 decimal)
  - Market orders (always taker)
  - Limit orders that execute immediately
- **Maker Fee**: 0.015% (0.00015 decimal)
  - Limit orders that go into the order book
  - Provides liquidity to the market

### User Impact

- **Overstated Fees**: Users see higher fees than they may actually pay
- **Decision Making**: May discourage limit orders that could save fees
- **Trust**: Discrepancy between displayed and actual fees reduces confidence

## Key Discovery: Real Bid/Ask Prices Available! 🎉

**IMPORTANT**: The Hyperliquid infrastructure already supports real-time bid/ask prices through L2 order book WebSocket subscriptions. This eliminates the need for spread estimation as the primary approach.

### Infrastructure Already in Place

1. **PriceUpdate Interface** (`controllers/types/index.ts:315-329`):

   ```typescript
   export interface PriceUpdate {
     coin: string;
     price: string; // Mid price
     bestBid?: string; // ✅ Best bid price from L2 book
     bestAsk?: string; // ✅ Best ask price from L2 book
     spread?: string; // ✅ Calculated spread
     // ... other fields
   }
   ```

2. **L2 Order Book Subscription** (`HyperLiquidSubscriptionService.ts:982-1003`):

   - Already implemented and cached
   - Updates via WebSocket in real-time
   - Reference-counted subscription per symbol
   - Extracts best bid/ask from order book levels

3. **Current Status**: Order book data available but not requested by fee calculation hooks

## Proposed Solution

### 1. Maker/Taker Determination Logic

#### Market Orders

```typescript
orderType === 'market' → Always taker (0.045%)
```

#### Limit Orders - New Logic (Using Real Bid/Ask)

```typescript
// ✅ PRIMARY: Use real bid/ask prices from L2 order book
// Taker conditions (immediate execution):
1. Buy limit order with limit price >= current ask price (real ask from order book)
2. Sell limit order with limit price <= current bid price (real bid from order book)
3. Close limit order crossing market price

// Maker conditions (goes into order book):
1. Buy limit order with limit price < current ask price (real ask from order book)
2. Sell limit order with limit price > current bid price (real bid from order book)

// ⚠️ FALLBACK: Only when bid/ask temporarily unavailable (loading, network issues)
// Use mid price with ~0.05% spread estimation
```

### 2. Implementation Strategy

#### Phase 1: Hook Enhancement (Primary)

**File**: `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`

**New Interface**:

```typescript
interface UsePerpsOrderFeesParams {
  orderType: 'market' | 'limit';
  amount: string;
  coin?: string;
  isClosing?: boolean;

  // New fields for maker/taker determination
  limitPrice?: string; // User's limit price
  currentPrice?: number; // Current market price (mid price)
  direction?: 'long' | 'short'; // Order direction
  currentAskPrice?: number; // Optional: for precise taker detection
  currentBidPrice?: number; // Optional: for precise taker detection
}
```

**New Internal Function**:

```typescript
// Constants for data validation
const PRICE_STALENESS_THRESHOLD_MS = 5000; // 5 seconds

/**
 * Determines if a limit order will likely be a maker or taker
 *
 * Logic:
 * 1. Validates price data freshness and market state
 * 2. Market orders are always taker
 * 3. Limit orders that would execute immediately are taker
 * 4. Limit orders that go into order book are maker
 *
 * @param params Order parameters
 * @returns boolean - true if maker, false if taker
 */
function determineMakerStatus(params: {
  orderType: 'market' | 'limit';
  limitPrice?: string;
  currentPrice: number;
  direction: 'long' | 'short';
  bestAsk?: number;
  bestBid?: number;
  priceTimestamp?: number;
  cachedSpread?: string; // Real spread from order book (when bid/ask unavailable)
  coin?: string; // For logging
}): boolean {
  const {
    orderType,
    limitPrice,
    currentPrice,
    direction,
    bestAsk,
    bestBid,
    priceTimestamp,
    cachedSpread,
    coin,
  } = params;

  // 1. STALE PRICE CHECK: Ensure price data is fresh
  // During WebSocket reconnection (5-15s), stale prices could lead to incorrect fee calculations
  // Conservative approach: default to taker fee when data is stale
  if (priceTimestamp) {
    const age = Date.now() - priceTimestamp;
    if (age > PRICE_STALENESS_THRESHOLD_MS) {
      DevLogger.log(
        'Fee Calculation: Stale price data detected, using conservative taker fee',
        {
          age,
          threshold: PRICE_STALENESS_THRESHOLD_MS,
          coin,
        },
      );
      return false; // Conservative: assume taker
    }
  }

  // 2. Market orders are always taker
  if (orderType === 'market') {
    return false;
  }

  // 3. Limit orders without price specified: conservative estimate (taker)
  if (!limitPrice || limitPrice === '') {
    return false;
  }

  const limitPriceNum = parseFloat(limitPrice);

  // 4. Invalid price: conservative estimate (taker)
  if (isNaN(limitPriceNum) || limitPriceNum <= 0) {
    return false;
  }

  // 5. Use real bid/ask if available (PRIMARY PATH)
  if (bestBid !== undefined && bestAsk !== undefined) {
    // CROSSED MARKET CHECK: Detect invalid market state
    //
    // A "crossed market" occurs when bid >= ask, which should never happen in normal conditions.
    // This typically indicates:
    // - WebSocket out-of-order message delivery (bid update arrives before ask update)
    // - Data feed issues or lag during high volatility
    // - Flash crash or extreme market conditions (very rare, ~0.001% of time)
    // - Exchange internal errors or trading halts
    //
    // While rare, this simple defensive check prevents incorrect fee calculations
    // during data anomalies. Conservative approach: default to taker fee.
    if (bestBid >= bestAsk) {
      DevLogger.log(
        'Fee Calculation: Crossed market detected, using conservative taker fee',
        {
          bestBid,
          bestAsk,
          spread: bestAsk - bestBid,
          coin,
        },
      );
      return false; // Conservative: assume taker during anomaly
    }

    // Normal maker/taker determination with real bid/ask
    if (direction === 'long') {
      // Buy order: Must be strictly below ask to be maker
      // If limit >= ask, may partially fill → conservative: 100% taker
      return limitPriceNum < bestAsk;
    } else {
      // Sell order: Must be strictly above bid to be maker
      // If limit <= bid, may partially fill → conservative: 100% taker
      return limitPriceNum > bestBid;
    }
  }

  // 6. FALLBACK: Use dynamic spread estimation when bid/ask unavailable
  // Priority: Real spread > Historical spread > Default spread constant
  //
  // **Why 0.0005 (0.05%)?**
  // This fallback should rarely execute since we request includeOrderBook: true.
  // However, it may be used during WebSocket reconnection, data loading, or network issues.
  //
  // Typical Hyperliquid spreads:
  // - BTC: ~0.01-0.03% (very tight)
  // - ETH: ~0.02-0.05%
  // - Major altcoins: ~0.05-0.15%
  // - Less liquid assets: 0.2%+
  //
  // The 0.0005 (0.05%) default is a conservative middle ground:
  // ✅ Reasonable for major assets (ETH, BTC)
  // ✅ Conservative (defaults to taker fee when uncertain)
  // ⚠️ May be too tight for less liquid assets
  // ⚠️ May be too wide for highly liquid assets
  //
  // This is acceptable because:
  // 1. It's only a temporary fallback during data unavailability
  // 2. Conservative approach never over-promises low fees to users
  // 3. Real bid/ask data will be available within seconds after reconnection
  let spreadPercent = 0.0005; // Default: 0.05% (5 basis points)

  // If we have cached spread data from previous order book updates, use it
  if (params.cachedSpread !== undefined) {
    const spreadValue = parseFloat(params.cachedSpread);
    if (!isNaN(spreadValue) && spreadValue > 0) {
      // Calculate spread as percentage of current price
      spreadPercent = spreadValue / (2 * currentPrice);
      DevLogger.log('Fee Calculation: Using cached spread from order book', {
        coin,
        cachedSpread: spreadValue,
        spreadPercent: (spreadPercent * 100).toFixed(4) + '%',
      });
    }
  } else {
    // Fall back to configured default spread
    DevLogger.log('Fee Calculation: Using default spread estimate', {
      coin,
      spreadPercent: (spreadPercent * 100).toFixed(4) + '%',
    });
  }

  const askPrice = currentPrice * (1 + spreadPercent);
  const bidPrice = currentPrice * (1 - spreadPercent);

  if (direction === 'long') {
    return limitPriceNum < askPrice;
  } else {
    return limitPriceNum > bidPrice;
  }
}
```

**Hook Modification**:

```typescript
export function usePerpsOrderFees(
  params: UsePerpsOrderFeesParams,
): OrderFeesResult {
  const {
    orderType,
    amount,
    coin = 'ETH',
    isClosing = false,
    limitPrice,
    currentPrice,
    direction,
    currentAskPrice,
    currentBidPrice,
  } = params;

  // Determine maker status automatically
  const isMaker = useMemo(() => {
    // Need price and direction for accurate calculation
    if (!currentPrice || !direction) {
      return false; // Conservative default
    }

    return determineMakerStatus({
      orderType,
      limitPrice,
      currentPrice,
      direction,
      currentAskPrice,
      currentBidPrice,
    });
  }, [
    orderType,
    limitPrice,
    currentPrice,
    direction,
    currentAskPrice,
    currentBidPrice,
  ]);

  // Rest of existing hook logic...
  // Pass calculated isMaker to calculateFees
}
```

#### Phase 2: Component Updates

**File**: `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx`

**Step 1: Enable Order Book Subscription (line ~292)**:

```typescript
// BEFORE:
const prices = usePerpsLivePrices({
  symbols: [orderForm.asset],
  throttleMs: 1000,
});

// AFTER:
const prices = usePerpsLivePrices({
  symbols: [orderForm.asset],
  throttleMs: 1000,
  includeOrderBook: true, // ✅ Enable L2 order book for bid/ask/spread
});
```

**Step 2: Update Fee Calculation (line ~248)**:

```typescript
// BEFORE:
const feeResults = usePerpsOrderFees({
  orderType: orderForm.type,
  amount: orderForm.amount,
  isMaker: false, // TODO: Update this to use the actual maker status
  coin: orderForm.asset,
  isClosing: false,
});

// AFTER:
const feeResults = usePerpsOrderFees({
  orderType: orderForm.type,
  amount: orderForm.amount,
  coin: orderForm.asset,
  isClosing: false,
  // Add new fields for maker/taker determination
  limitPrice: orderForm.limitPrice,
  currentPrice: assetData.price,
  direction: orderForm.direction,
  // Add real bid/ask/spread from order book (available after Step 1)
  currentAskPrice: currentPrice?.bestAsk
    ? parseFloat(currentPrice.bestAsk)
    : undefined,
  currentBidPrice: currentPrice?.bestBid
    ? parseFloat(currentPrice.bestBid)
    : undefined,
  cachedSpread: currentPrice?.spread, // Real spread from L2 order book
  priceTimestamp: currentPrice?.timestamp, // For staleness check
});
```

**File**: `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx`

**Changes at line ~190**:

```typescript
// BEFORE:
const feeResults = usePerpsOrderFees({
  orderType,
  amount: closingValueString,
  isMaker: false, // Closing positions are typically taker orders
  coin: position.coin,
  isClosing: true,
});

// AFTER:
const feeResults = usePerpsOrderFees({
  orderType,
  amount: closingValueString,
  coin: position.coin,
  isClosing: true,
  // Add new fields for maker/taker determination
  limitPrice,
  currentPrice: effectivePrice,
  direction: isLong ? 'short' : 'long', // Opposite direction when closing
  // Optional: Add bid/ask if available
  currentAskPrice: priceData[position.coin]?.askPrice
    ? parseFloat(priceData[position.coin].askPrice)
    : undefined,
  currentBidPrice: priceData[position.coin]?.bidPrice
    ? parseFloat(priceData[position.coin].bidPrice)
    : undefined,
});
```

### 3. Return Values Enhancement

**Already Supported**: The `usePerpsOrderFees` hook already returns:

```typescript
interface OrderFeesResult {
  totalFee: number; // ✓ USD amount
  protocolFee: number; // ✓ USD amount
  metamaskFee: number; // ✓ USD amount
  protocolFeeRate: number; // ✓ Percentage as decimal
  metamaskFeeRate: number; // ✓ Percentage as decimal
  // ... other fields
}
```

**Recommendation**: Add explicit maker/taker indicator for transparency:

```typescript
interface OrderFeesResult {
  // Existing fields...
  totalFee: number;
  protocolFeeRate: number;

  // New field
  isMakerOrder?: boolean; // True if maker, false if taker, undefined if cannot determine
}
```

### 4. Edge Cases & Considerations

#### Partial Fill Scenario (Critical Edge Case)

**Problem**: Limit orders that touch or cross market price may partially fill as taker, with remainder as maker.

**Example**:

```typescript
// User: Buy limit at $50,000
// Market ask: $49,995
// Result:
//   - Portion fills immediately at $49,995 (taker fee 0.045%)
//   - Remainder sits at $50,000 in book (maker fee 0.015% if filled)
```

**v1 Solution (Conservative Approach)**:

```typescript
// If limit price touches or crosses market → Assume 100% taker fee
function determineMakerStatus(params) {
  // ... validation ...

  if (direction === 'long') {
    // Buy order: Only maker if limit price is BELOW ask
    // If limit >= ask, may partially fill → conservative: 100% taker
    return limitPriceNum < bestAsk;
  } else {
    // Sell order: Only maker if limit price is ABOVE bid
    // If limit <= bid, may partially fill → conservative: 100% taker
    return limitPriceNum > bestBid;
  }
}
```

**Rationale**:

- ✅ **Conservative**: Never over-promises low fees
- ✅ **Simple**: No order book depth analysis required
- ✅ **Predictable**: Consistent user experience
- ✅ **Safe**: Actual fees may be lower (pleasant surprise)

**Trade-off**: May show higher fees than actually paid, but ensures users are never surprised by higher fees

**Future Enhancements** (v2+):

- Blended fee estimation using order book depth
- Post-execution analysis to measure accuracy
- UI warnings for orders crossing market price

**Decision**: For v1, we prioritize simplicity and conservative estimation. Can iterate based on user feedback and data.

#### Price Data Availability

```typescript
// Handle missing price data gracefully
if (!currentPrice || !direction) {
  // Log warning but continue with conservative estimate
  DevLogger.log('Fee Calculation: Missing price data, using taker fee');
  return false; // Default to taker (conservative)
}
```

#### Partial Limit Price Entry

```typescript
// User is entering limit price but hasn't confirmed yet
if (orderType === 'limit' && !limitPrice) {
  // Show taker fee initially, will update when limit price is set
  return false;
}
```

#### Limit Orders Near Market Price

```typescript
// Orders very close to market may execute immediately
// v1: Use strict comparison (touching market = taker)
// No spread buffer needed - let real bid/ask determine

if (direction === 'long') {
  // Must be strictly below ask to be maker
  return limitPriceNum < bestAsk; // No buffer
} else {
  // Must be strictly above bid to be maker
  return limitPriceNum > bestBid; // No buffer
}
```

#### Close Position Orders

```typescript
// Closing is opposite direction to position
const closeDirection = isLong ? 'short' : 'long';

// Apply same maker/taker logic (including partial fill handling)
const isMaker = determineMakerStatus({
  orderType,
  limitPrice,
  currentPrice: effectivePrice,
  direction: closeDirection, // Use opposite direction
  currentAskPrice,
  currentBidPrice,
});
```

### 5. Testing Strategy

**IMPORTANT**: After implementing the feature, comprehensive unit tests MUST be written to ensure correctness and prevent regressions.

#### Unit Tests (Write After Implementation)

**File**: `app/components/UI/Perps/hooks/usePerpsOrderFees.test.ts`

**Test Requirements**:

- Use proper TypeScript typing (no `any` types)
- Mock all external dependencies
- Test both the `determineMakerStatus` function and the hook integration
- Include descriptive test names following pattern: "description of what it does" (not "should do X")
- Achieve high code coverage for maker/taker logic

**Test Cases**:

```typescript
describe('usePerpsOrderFees - Maker/Taker Determination', () => {
  describe('Market Orders', () => {
    it('treats market orders as taker regardless of price', () => {
      // Test that market orders always use taker fee
    });
  });

  describe('Limit Orders - Long Direction', () => {
    it('treats buy limit above ask as taker (immediate execution)', () => {
      // limitPrice >= askPrice → taker
    });

    it('treats buy limit below ask as maker (goes to book)', () => {
      // limitPrice < askPrice → maker
    });

    it('uses mid price with spread when bid/ask unavailable', () => {
      // Tests spread estimation logic
    });
  });

  describe('Limit Orders - Short Direction', () => {
    it('treats sell limit below bid as taker (immediate execution)', () => {
      // limitPrice <= bidPrice → taker
    });

    it('treats sell limit above bid as maker (goes to book)', () => {
      // limitPrice > bidPrice → maker
    });
  });

  describe('Edge Cases', () => {
    it('defaults to taker when price data missing', () => {
      // currentPrice undefined → taker (conservative)
    });

    it('defaults to taker when limit price is invalid', () => {
      // limitPrice = '' or NaN → taker
    });

    it('defaults to taker when direction is missing', () => {
      // direction undefined → taker
    });
  });

  describe('Close Position', () => {
    it('correctly determines maker/taker for closing long position', () => {
      // Close long = short direction
    });

    it('correctly determines maker/taker for closing short position', () => {
      // Close short = long direction
    });
  });

  describe('Fee Calculations', () => {
    it('applies maker fee rate (0.015%) for maker orders', () => {
      // Verify correct fee rate applied
    });

    it('applies taker fee rate (0.045%) for taker orders', () => {
      // Verify correct fee rate applied
    });

    it('calculates correct USD fee amount', () => {
      // Verify totalFee = amount * feeRate
    });
  });
});
```

#### Integration Tests

1. Test order view with various limit prices
2. Test close position view with limit orders
3. Verify fee display updates when limit price changes
4. Test with missing price data (loading states)

#### Manual Testing Scenarios

1. **Market Order**: Verify 0.045% fee displayed
2. **Limit Order (Maker)**: Set limit buy below market → Verify 0.015% fee
3. **Limit Order (Taker)**: Set limit buy above market → Verify 0.045% fee
4. **Switching Order Types**: Market ↔ Limit → Verify fee updates
5. **Changing Limit Price**: Cross market price → Verify fee switches
6. **Close Position**: Limit orders → Verify correct fee direction

### 6. User Experience Improvements

#### Fee Display Updates

```typescript
// Show maker/taker status in fee tooltip
<PerpsBottomSheetTooltip
  contentKey="fees"
  data={{
    metamaskFeeRate: feeResults.metamaskFeeRate,
    protocolFeeRate: feeResults.protocolFeeRate,
    isMakerOrder: feeResults.isMakerOrder, // New field
    // ... other fields
  }}
/>
```

#### Tooltip Content Enhancement

Add explanation in tooltip:

- "Maker orders add liquidity and receive lower fees (0.015%)"
- "Taker orders remove liquidity and pay higher fees (0.045%)"
- "Your limit order will be a [maker/taker] order"

### 7. Performance Considerations

#### Memoization

```typescript
// Maker status determination is memoized
const isMaker = useMemo(() => {
  return determineMakerStatus({
    /* params */
  });
}, [
  orderType,
  limitPrice,
  currentPrice,
  direction,
  currentAskPrice,
  currentBidPrice,
]);
```

#### Minimal Re-calculations

- Only recalculates when relevant fields change
- Uses existing price data from `usePerpsLivePrices`
- No additional API calls required

### 8. Migration & Rollout

#### Phase 1: Implementation (Week 1)

1. Update `usePerpsOrderFees` hook interface
2. Implement `determineMakerStatus` function
3. Add unit tests

#### Phase 2: Integration (Week 1-2)

1. Update `PerpsOrderView.tsx`
2. Update `PerpsClosePositionView.tsx`
3. Update tooltip content
4. Integration testing

#### Phase 3: Testing & QA (Week 2)

1. Manual testing scenarios
2. Edge case validation
3. Performance testing

#### Phase 4: Documentation & Release (Week 3)

1. Update component documentation
2. Add developer notes
3. Deploy with feature flag (optional)

### 9. Future Enhancements

#### Real Bid/Ask Prices

```typescript
// Currently using mid price with spread estimation
// Future: Get actual bid/ask from WebSocket
interface PriceData {
  price: string; // Mid price
  askPrice?: string; // Add if available from Hyperliquid
  bidPrice?: string; // Add if available from Hyperliquid
}
```

#### Post-Execution Analysis

```typescript
// After order executes, compare estimated vs actual fee
// Log discrepancies for continuous improvement
MetaMetrics.trackEvent('perps_fee_estimation_accuracy', {
  estimatedFee: feeResults.totalFee,
  actualFee: executionResult.actualFee,
  wasEstimatedMaker: isMaker,
  wasActualMaker: executionResult.isMaker,
});
```

#### User Volume Tiers

```typescript
// Already prepared in HyperLiquidProvider
// Future: Incorporate user's volume tier for additional discounts
private async getUserVolume(): Promise<number> {
  // Implement when API available
}
```

## Implementation Files

### Files to Modify

1. `app/components/UI/Perps/hooks/usePerpsOrderFees.ts` - Core logic
2. `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx` - Order creation
3. `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx` - Position closing
4. `app/components/UI/Perps/hooks/usePerpsOrderFees.test.ts` - Unit tests

### Files to Review (No Changes Expected)

1. `app/components/UI/Perps/hooks/usePerpsTrading.ts` - Interface only
2. `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts` - Already supports isMaker
3. `app/components/UI/Perps/controllers/types/index.ts` - Interface review
4. `app/components/UI/Perps/constants/hyperLiquidConfig.ts` - Fee rates reference

## Success Metrics

1. **Accuracy**: Estimated fees within 0.001% of actual fees
2. **Performance**: Fee calculation adds <5ms overhead
3. **Coverage**: 100% unit test coverage for maker/taker logic
4. **User Impact**: Reduced fee estimates for maker orders by 66% (0.045% → 0.015%)

## Risks & Mitigations

| Risk                       | Impact                     | Mitigation                          |
| -------------------------- | -------------------------- | ----------------------------------- |
| Missing price data         | High fees displayed        | Conservative default (taker fee)    |
| Rapid price movements      | Fee switches unexpectedly  | Use stable price data (1s throttle) |
| Bid/ask spread unavailable | Less precise determination | Estimate spread (~0.05% typical)    |
| Complex order types        | Incorrect fee calculation  | Comprehensive test coverage         |

## Questions for Review

1. Should we display maker/taker status explicitly in UI?
2. Should we add a feature flag for gradual rollout?
3. Do we need bid/ask prices from WebSocket for v1?
4. Should we track estimation accuracy via MetaMetrics?
5. Do we want to show fee savings when limit order qualifies for maker fee?

## Conclusion

This solution provides accurate, production-ready fee calculations by automatically determining maker vs. taker status based on order characteristics. The implementation is:

- **Centralized**: All logic in `usePerpsOrderFees` hook
- **Robust**: Handles edge cases with conservative defaults
- **Performant**: Minimal overhead, properly memoized
- **Testable**: Clear logic with comprehensive test coverage
- **User-Friendly**: Accurate fees improve trust and decision-making

Next step: Review this plan, address questions, and proceed with implementation.
