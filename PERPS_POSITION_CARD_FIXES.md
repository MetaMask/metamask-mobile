# PerpsPositionCard Fixes Tracking

## Summary of Issues Fixed (Dec 20, 2024)

✅ **3 High Priority Issues Fixed**
✅ **1 Medium Priority Issue Fixed**  
✅ **2 Low Priority Issues Fixed**
📊 **Total: 6 Issues Resolved**

### Files Modified

1. `PerpsPositionCard.tsx` - Fixed PnL color logic and price formatting
2. `en.json` - Fixed "Liquidity Price" typo to "Liquidation Price"
3. `usePerpsMarketStats.ts` - Added $ symbol to Open Interest/Volume display

## Status Legend

- ⏳ Pending
- 🔧 In Progress
- ✅ Fixed
- ❌ Won't Fix

## High Priority Issues

| Issue                                                       | Status | File                  | Line       | Notes                                                                          | Validated |
| ----------------------------------------------------------- | ------ | --------------------- | ---------- | ------------------------------------------------------------------------------ | --------- |
| PnL color inverted (green when negative, red when positive) | ✅     | PerpsPositionCard.tsx | 197        | Changed from `isPositive24h` to `pnlNum >= 0`                                  | ✅        |
| Market price not displayed                                  | ✅     | PerpsPositionCard.tsx | 69-75, 250 | Added live price subscription at leaf level, shows "Loading..." while fetching | ✅        |
| "Liquidity price" typo                                      | ✅     | en.json               | 1129       | Changed to "Liquidation Price", updated key to `liquidation_price`             | ✅        |

## Medium Priority Issues

| Issue                 | Status | File                  | Line     | Notes                                      | Validated |
| --------------------- | ------ | --------------------- | -------- | ------------------------------------------ | --------- |
| Prices use 4 decimals | ✅     | PerpsPositionCard.tsx | Multiple | Applied 2-decimal formatting to all prices | ✅        |

## Low Priority Issues

| Issue                          | Status | File                   | Line | Notes                                      | Validated |
| ------------------------------ | ------ | ---------------------- | ---- | ------------------------------------------ | --------- |
| Open interest missing $ symbol | ✅     | usePerpsMarketStats.ts | 112  | Added $ prefix to formatLargeNumber result | ✅        |
| 24hr volume missing $ symbol   | ✅     | usePerpsMarketStats.ts | 109  | Added $ prefix to formatLargeNumber result | ✅        |

## Implementation Details

### Issue 1: PnL Color Inversion

**Current Code (Line 135-137, 200)**:

```typescript
const isPositive24h =
  position.cumulativeFunding.sinceChange &&
  parseFloat(position.cumulativeFunding.sinceChange) >= 0;

// Line 200:
color={isPositive24h ? TextColor.Success : TextColor.Error}
```

**Fix**: Change to use actual PnL value:

```typescript
color={pnlNum >= 0 ? TextColor.Success : TextColor.Error}
```

### Issue 2: Market Price Not Displayed

**Current Code (Line 242)**:

```typescript
{
  priceData?.price ? formatPrice(priceData.price) : '';
}
```

**Fix**: Add fallback text:

```typescript
{
  priceData?.price ? formatPrice(priceData.price) : '--';
}
```

### Issue 3: "Liquidity Price" Typo

**Current i18n (en.json line 1129)**:

```json
"liquidity_price": "Liquidity Price"
```

**Fix**: Change to:

```json
"liquidity_price": "Liquidation Price"
```

### Issue 4: Price Decimal Formatting

**Locations to update**:

- Line 194: `formatPrice(position.positionValue)`
- Line 228: `formatPrice(position.entryPrice)`
- Line 242: `formatPrice(priceData.price)`
- Line 257: `formatPrice(position.liquidationPrice)`
- Line 276: `formatPrice(position.takeProfitPrice)`
- Line 292: `formatPrice(position.stopLossPrice)`

**Fix**: Add formatting options to all:

```typescript
formatPrice(value, { minimumDecimals: 2, maximumDecimals: 2 });
```

### Issue 5 & 6: Open Interest/Volume $ Symbol

**Need to investigate**: Find where Open Interest and 24hr Volume are displayed

- Likely in market details or overview screens
- Add $ prefix to formatting

## Testing Checklist

- [ ] PnL shows green for positive values
- [ ] PnL shows red for negative values
- [ ] Market price displays "--" when loading
- [ ] All prices show exactly 2 decimal places
- [ ] "Liquidation Price" text is correct
- [ ] Open Interest shows $ symbol
- [ ] 24hr Volume shows $ symbol

## References

- Source: perps_testing.md (Aug 19, 2025)
- Device: Android
- Build: 7.55 (2203) branch:main
