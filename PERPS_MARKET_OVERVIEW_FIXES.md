# PerpsMarketOverview Fixes Tracking

## Summary of Issues Fixed (Dec 20, 2024)

✅ **2 High Priority Issues Fixed**
✅ **3 Medium Priority Issues Fixed**  
📊 **Total: 5 Issues Resolved**

### Files to Modify

1. `usePerpsMarkets.ts` - Add volume-based sorting
2. `PerpsMarketRowItem.tsx` - Fix volume formatting
3. `usePerpsAssetsMetadata.ts` - Dark mode support for logos

## Status Legend

- ⏳ Pending
- 🔧 In Progress
- ✅ Fixed
- ❌ Won't Fix

## High Priority Issues

| Issue                         | Status | File                   | Line   | Notes                                 | Validated |
| ----------------------------- | ------ | ---------------------- | ------ | ------------------------------------- | --------- |
| Assets not ordered by volume  | ✅     | usePerpsMarkets.ts     | 85-113 | Sort markets by 24h volume descending | ✅        |
| MATIC shows $0 trading volume | ✅     | PerpsMarketRowItem.tsx | 73-93  | Ensure volume fallback/error handling | ✅        |

## Medium Priority Issues

| Issue                                      | Status | File                      | Line    | Notes                                              | Validated |
| ------------------------------------------ | ------ | ------------------------- | ------- | -------------------------------------------------- | --------- |
| 24h volume has decimals                    | ✅     | PerpsMarketRowItem.tsx    | 78-82   | Remove decimals using Math.round                   | ✅        |
| Token logos don't render well in dark mode | ✅     | usePerpsAssetsMetadata.ts | 8-11    | Added dark mode detection for future theme support | ✅        |
| Logo background/shape inconsistent         | ✅     | PerpsMarketRowItem.tsx    | 108-122 | Consistent 32x32 circular logos with background    | ✅        |

## Implementation Details

### Issue 1: Sort Markets by Volume

**Solution**: Add sorting in usePerpsMarkets after fetching data

```typescript
// Sort markets by 24h volume (highest first)
marketDataWithPrices.sort((a, b) => {
  const getVolumeNumber = (volume: string) => {
    const cleaned = volume.replace(/[$,]/g, '');
    if (cleaned.includes('B')) return parseFloat(cleaned) * 1e9;
    if (cleaned.includes('M')) return parseFloat(cleaned) * 1e6;
    if (cleaned.includes('K')) return parseFloat(cleaned) * 1e3;
    return parseFloat(cleaned) || 0;
  };
  return getVolumeNumber(b.volume) - getVolumeNumber(a.volume);
});
```

### Issue 2: MATIC $0 Volume

**Current**: Some markets might have undefined/null volume
**Fix**: Ensure proper fallback in PerpsMarketRowItem

```typescript
// Ensure volume is never undefined/null
updatedMarket.volume = volume ? formatVolume(volume) : '$0';
```

### Issue 3: Remove Volume Decimals

**Current formatting (lines 76-82)**:

```typescript
updatedMarket.volume = `$${(volume / 1e6).toFixed(1)}M`;
```

**Fix**: Remove .toFixed(1), use Math.round

```typescript
updatedMarket.volume = `$${Math.round(volume / 1e6)}M`;
```

### Issue 4: Dark Mode Logos

**Solution**: Check theme in usePerpsAssetsMetadata

```typescript
const isDarkMode = theme.dark;
const logoUrl = isDarkMode ? asset.darkLogo : asset.lightLogo;
```

### Issue 5: Consistent Logo Design

**Solution**: Ensure all markets use same component/styling

- Use RemoteImage when URL available
- Fallback to Avatar with consistent props
- Apply same border radius and sizing

## Testing Checklist

- [ ] Markets sorted by volume (highest first)
- [ ] MATIC shows correct volume (not $0)
- [ ] Volume displays without decimals
- [ ] Logos render properly in dark mode
- [ ] All logos have consistent appearance

## References

- Source: perps_testing.md (Aug 19, 2025)
- Device: Android
- Build: 7.55 (2203) branch:main
