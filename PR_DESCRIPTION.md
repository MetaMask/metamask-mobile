# Perps Order View UX Improvements

## Summary

This PR implements critical UX improvements to the Perps trading interface, focusing on order entry, leverage selection, and limit price configuration. These changes significantly improve the trading experience by making controls more responsive and providing better real-time feedback.

## Key Improvements

### 1. ✅ Fixed Max Order Size Calculation with Leverage

**Problem**: Max order size didn't account for leverage, limiting users' trading capacity  
**Solution**:

- Updated `handleMaxAmount` and `handlePercentageAmount` to multiply available balance by leverage
- Slider maximum value now correctly reflects leveraged amount
- Users can now utilize their full buying power

**Files Changed**:

- `app/components/UI/Perps/hooks/usePerpsOrderForm.ts`
- `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx`

### 2. ✅ Enhanced Available Balance Display

**Problem**: "max" label was unclear and formatting inconsistent  
**Solution**:

- Changed from "$X max" to "Available: $X" for clarity
- Added i18n support with new `perps.available` string
- Consistent 2-decimal formatting across all balance displays
- Smaller, subtle text styling (BodySM with Alternative color)

**Files Changed**:

- `app/components/UI/Perps/components/PerpsAmountDisplay/PerpsAmountDisplay.tsx`
- `app/components/UI/Perps/utils/formatUtils.ts`
- `locales/languages/en.json`

### 3. ✅ Slider Responsiveness Improvements

**Problem**: Sliders had bouncy animations and didn't update values in real-time  
**Solution**:

- **Real-time updates**: Values update continuously during drag, not just on release
- **No bouncing**: Removed all spring animations for instant, direct updates
- **Visual feedback**: Added subtle scale effect (1.1x) on thumb press
- **Better touch targets**: Added 15px hitSlop for easier thumb interaction
- Applied improvements to both main slider and leverage slider

**Files Changed**:

- `app/components/UI/Perps/components/PerpsSlider/PerpsSlider.tsx`
- `app/components/UI/Perps/components/PerpsLeverageBottomSheet/PerpsLeverageBottomSheet.tsx`

### 4. ✅ Limit Price Bottom Sheet Real-Time Updates

**Problem**: Prices only updated when sheet opened, not in real-time  
**Solution**:

- Removed unnecessary `priceSnapshot` state
- Now uses live data directly from `usePerpsLivePrices` hook
- Prices update automatically every 1000ms
- Added price difference percentage display
- Added +1%, +2% buttons for prices above market
- All prices formatted to 2 decimal places

**Files Changed**:

- `app/components/UI/Perps/components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet.tsx`
- `app/components/UI/Perps/components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet.styles.ts`

## Technical Details

### Performance Improvements

- Removed unnecessary state management in limit price sheet
- Direct value assignments instead of spring animations in sliders
- Optimized re-renders with proper memoization

### Code Quality

- Consistent use of i18n strings
- Proper TypeScript typing
- Clean separation of concerns
- Improved code readability

## Testing Checklist

- [x] Max button works correctly with different leverage values
- [x] Percentage buttons (25%, 50%) account for leverage
- [x] Slider max value matches leveraged amount
- [x] Real-time price updates in limit price sheet
- [x] Slider provides continuous feedback during drag
- [x] All prices display with 2 decimal places
- [ ] Tested on Android device
- [ ] Tested on iOS device
- [ ] Tested with zero balance
- [ ] Tested with minimum order amounts

## Screenshots/Videos

[Add screenshots or videos demonstrating the improvements]

## Related Issues

- Addresses user feedback about order entry difficulties
- Improves trading efficiency for leveraged positions
- Enhances overall UX consistency

## Breaking Changes

None - all changes are backwards compatible

## Migration Guide

No migration needed

## Additional Notes

- All improvements focus on better user experience without changing core functionality
- Changes are performance-optimized to maintain smooth 60fps animations
- Consistent with MetaMask design system guidelines
