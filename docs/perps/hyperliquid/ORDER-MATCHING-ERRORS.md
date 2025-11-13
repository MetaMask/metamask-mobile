# HyperLiquid Order Matching Errors

**Status**: Active Issue (Fixed 2025-01-13)
**Impact**: High - Affects market order execution reliability
**Root Cause**: Insufficient slippage tolerance for IOC/FrontendMarket orders

---

## Error Overview

### IocCancel Error

**Error Code**: `IocCancel`
**Error String**: `"Order could not immediately match against any resting orders. asset={asset_id}"`
**Affected TIF**: `IOC` (Immediate or Cancel), `FrontendMarket`
**Frequency**: Moderate-High during volatile market conditions

### Symptom

Market orders fail with error message despite sufficient account balance. User sees generic error, funds returned to account.

---

## Root Cause Analysis

### 1. HyperLiquid IOC Order Behavior

**IOC (Immediate or Cancel)** orders require _instant_ execution against resting orders on the order book:

- If no matching orders exist at the specified limit price → **order cancelled immediately**
- No partial fills that rest on the book
- `FrontendMarket` TIF is HyperLiquid's variant of IOC for market orders

**Source**: [HyperLiquid Error Responses](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/error-responses)

### 2. Order Matching Priority

HyperLiquid's block execution prioritizes:

1. **Cancels** (highest priority)
2. **Post-only orders** (ALO)
3. **GTC orders**
4. **IOC orders** (lowest priority)

**Implication**: Makers can cancel orders more reliably, but IOC orders face reduced available liquidity when they hit the order book.

**Source**: [HyperLiquid Order Book](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/order-book)

### 3. Previous Implementation Gap

**Original Configuration**:

```typescript
// perpsConfig.ts:78-83
DEFAULT_SLIPPAGE_BPS: 100; // 1% slippage for all orders
```

**Market Order Flow**:

1. User initiates market order at price `P`
2. Apply 1% slippage → limit price = `P × (1 ± 0.01)`
3. Submit order with `FrontendMarket` TIF
4. If price moves >1% during transmission → **no resting orders within limit**
5. Order fails with `IocCancel` error

**Failure Scenarios**:

- High volatility (price moves >1% in seconds)
- Network latency (price becomes stale)
- Thin order books (insufficient liquidity at 1% level)
- Flash price movements

### 4. HyperLiquid Recommendations vs. Implementation

| Order Type    | Original (MetaMask) | HyperLiquid Recommended | Gap           |
| ------------- | ------------------- | ----------------------- | ------------- |
| Market Orders | 1%                  | **8%**                  | 7% too low ❌ |
| TP/SL Orders  | 1%                  | **10%**                 | 9% too low ❌ |
| TWAP Orders   | N/A                 | 3%                      | N/A           |

**Source**: [HyperLiquid Order Types](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/order-types)

---

## Solution Implementation

### Fix #1: Align Slippage with HyperLiquid Standards

**File**: `app/components/UI/Perps/constants/perpsConfig.ts`

**Changes**:

```typescript
// Before
export const ORDER_SLIPPAGE_CONFIG = {
  DEFAULT_SLIPPAGE_BPS: 100, // 1%
};

// After
export const ORDER_SLIPPAGE_CONFIG = {
  DEFAULT_MARKET_SLIPPAGE_BPS: 800, // 8% - HyperLiquid market order standard
  DEFAULT_TPSL_SLIPPAGE_BPS: 1000, // 10% - HyperLiquid TP/SL standard
  DEFAULT_LIMIT_SLIPPAGE_BPS: 100, // 1% - Limit orders remain conservative
};
```

**Rationale**:

- Market orders prioritize execution certainty over price precision
- 8% slippage absorbs up to $4,000 movement on $50,000 BTC order
- TP/SL orders at 10% handle triggered execution volatility
- Limit orders keep 1% as they rest on book (not IOC)

### Fix #2: Order-Type-Specific Slippage Logic

**File**: `app/components/UI/Perps/utils/orderCalculations.ts:303-309`

**Implementation**:

```typescript
const getSlippageForOrderType = (
  orderType: 'market' | 'limit',
  isTpSl: boolean = false,
): number => {
  if (isTpSl) {
    return ORDER_SLIPPAGE_CONFIG.DEFAULT_TPSL_SLIPPAGE_BPS / 10000;
  }
  if (orderType === 'market') {
    return ORDER_SLIPPAGE_CONFIG.DEFAULT_MARKET_SLIPPAGE_BPS / 10000;
  }
  return ORDER_SLIPPAGE_CONFIG.DEFAULT_LIMIT_SLIPPAGE_BPS / 10000;
};

// Apply in order price calculation
if (orderType === 'market') {
  const slippageValue = getSlippageForOrderType(orderType, isTpSlOrder);
  orderPrice = isBuy
    ? currentPrice * (1 + slippageValue)
    : currentPrice * (1 - slippageValue);
}
```

### Fix #3: User-Friendly Error Messages

**File**: `app/components/UI/Perps/utils/translatePerpsError.ts`

**Error Mapping**:

```typescript
case 'IOC_CANCEL':
case 'IocCancel':
  return strings('perps.errors.insufficient_liquidity');
```

**i18n String** (localization files):

```json
{
  "perps.errors.insufficient_liquidity": "Insufficient liquidity to execute order. Try using a limit order or retry in a moment."
}
```

**Design**: Generic message without technical details, provides actionable alternatives.

### Fix #4: Error Detection Enhancement

**File**: `app/components/UI/Perps/controllers/providers/HyperLiquidProvider.ts:1850-1866`

**Pattern Matching**:

```typescript
private handleOrderError(error: Error): PerpsError {
  // Check for IOC matching failure
  if (error.message?.includes('could not immediately match')) {
    return this.mapError({
      code: 'IOC_CANCEL',
      message: error.message
    });
  }

  // ... existing error handling
}
```

---

## Expected Impact

### Before Fix

- **Market order failure rate**: ~15-25% during volatile periods
- **User confusion**: High (raw technical errors)
- **Support burden**: Elevated

### After Fix

- **Market order failure rate**: ~2-5% (extreme volatility only)
- **80-90% reduction** in IOC failures
- **Clear error messaging** when failures occur
- **Aligned with platform standards**

---

## Testing Validation

### Manual Test Cases

1. ✅ **Stable market**: Market order executes successfully
2. ✅ **Volatile market**: Market order still executes (vs. previous failures)
3. ✅ **TP/SL execution**: 10% slippage handles triggered orders
4. ✅ **Limit orders**: Unchanged behavior (1% slippage maintained)
5. ✅ **Error handling**: IOC failure shows user-friendly message
6. ✅ **Extreme volatility**: Order fails gracefully with clear message

### Metrics to Monitor

- `perps.order.placed` success rate (should increase 15-20%)
- `perps.order.error.ioc_cancel` occurrences (should decrease 80%+)
- User-reported liquidity errors (should decrease significantly)

---

## Related Errors

### MarketOrderNoLiquidity

**Error**: `"No liquidity available for market order."`
**Cause**: Complete order book exhaustion (rare)
**Solution**: Same slippage improvements apply

### BadAloPx

**Error**: `"Post only order would have immediately matched, bbo was {bbo}."`
**Cause**: Opposite scenario - ALO (post-only) order would cross spread
**Solution**: Not affected by slippage changes (intentional maker-only design)

---

## References

### External Documentation

- [HyperLiquid Error Responses](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/error-responses)
- [HyperLiquid Order Types](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/order-types)
- [HyperLiquid Order Book Mechanics](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/order-book)
- [HyperLiquid Exchange Endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)

### Internal Documentation

- [Order Types Reference](./order-types-reference.md) - TIF options and SDK definitions
- [Exchange Endpoint](./exchange-endpoint.md) - API request/response formats
- [Subscriptions](./subscriptions.md) - WebSocket order updates

### Implementation Files

| Component         | File                     | Lines                |
| ----------------- | ------------------------ | -------------------- |
| Slippage Config   | `perpsConfig.ts`         | 78-83                |
| Order Calculation | `orderCalculations.ts`   | 303-309              |
| Error Translation | `translatePerpsError.ts` | 36-68                |
| Error Detection   | `HyperLiquidProvider.ts` | 1850-1866            |
| Order Placement   | `HyperLiquidProvider.ts` | 1875-2037, 2147-2151 |

---

## Future Considerations

### User-Configurable Slippage (Deferred)

- Allow users to adjust slippage tolerance per order
- Presets: 0.5%, 1%, 3%, 5%, 8%, Custom
- Show estimated price impact before submission
- **Priority**: Medium (P2 backlog)

### Dynamic Slippage Adjustment (Deferred)

- Auto-adjust based on market volatility
- Exponential backoff on retry attempts
- Order book depth validation
- **Priority**: Low (P4 backlog)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-13
**Author**: MetaMask Mobile Perps Team
**Status**: Solution Implemented
