# A/B Test Implementation Guide: Option B

This document provides a complete implementation guide for the Token Details **Isolated Swap Button Test** (Option B).

## Test Overview

| Aspect | Details |
|--------|---------|
| **Test Name** | Token Details Swap Button A/B Test |
| **Feature Flag** | `tokenDetailsSwapButtonAbTest` |
| **Variants** | `control` (old buttons + swap), `treatment` (new buttons) |
| **Distribution** | 50/50 (controlled by LaunchDarkly) |

### What Each Variant Shows

| Variant | Action Buttons | Sticky Footer |
|---------|---------------|---------------|
| **Control** | Buy, **Swap**, Send, Receive | Buy, Sell (always shown) |
| **Treatment** | Cash Buy, Send, Receive, More | Buy, Sell (always shown) |

### Key Difference from Option A

**Sticky footer is ALWAYS shown in both variants.** The test isolates the impact of having a visible Swap button.

```
Option A: Old layout (no footer) vs New layout (with footer)
Option B: Old buttons + footer vs New buttons + footer
              ↑                       ↑
         Has Swap button         No Swap button
```

---

## Technical Complexity Assessment

### Complexity: MODERATE (Higher than Option A)

| Aspect | Option A | Option B |
|--------|----------|----------|
| **Code Changes** | 3-4 files | 5-6 files |
| **Logic Complexity** | Simple boolean | Decoupling + conditionals |
| **Testing Effort** | Low | Medium |
| **Risk of Bugs** | Low | Medium |
| **UX Edge Cases** | None | Swap+Sell redundancy |

### Why Option B is More Complex

1. **Decoupling Required**: The sticky footer is currently tied to `isTokenDetailsV2ButtonsEnabled`. Option B requires decoupling this.

2. **Hybrid State**: Option B creates a state that was never part of the original design (old buttons WITH sticky footer).

3. **Swap + Sell Redundancy**: In control variant, users have two buttons that do essentially the same thing (swap FROM current token). This needs:
   - Special analytics to track which button users prefer
   - UI consideration (is this confusing?)

4. **More Edge Cases**: Need to verify sticky footer works correctly with old button layout (never tested together).

---

## Implementation Steps

### Step 1: Create A/B Test Types (Simplified)

**Create file: `app/components/UI/TokenDetails/utils/abTesting/types.ts`**

```typescript
/**
 * Types for Token Details Swap Button A/B testing (Option B)
 */

/**
 * Valid variant names for the swap button test
 * 
 * control = old button layout (Buy, Swap, Send, Receive)
 * treatment = new button layout (Cash Buy, Send, Receive, More)
 * 
 * Note: Sticky footer is ALWAYS shown in both variants.
 */
export type TokenDetailsSwapButtonVariantName = 'control' | 'treatment';
```

---

### Step 2: Create Test Configuration

**Create file: `app/components/UI/TokenDetails/utils/abTesting/tests.ts`**

```typescript
/**
 * Token Details Swap Button A/B Test Configuration (Option B)
 *
 * Tests whether having the Swap button visible increases swap engagement
 * when the sticky Buy/Sell footer is ALWAYS present.
 *
 * Hypothesis: With sticky Buy/Sell footer present, having an additional
 * Swap button visible will increase swap FROM engagement.
 *
 * IMPORTANT: This creates Swap + Sell redundancy in Control variant.
 * Both buttons trigger swap FROM current token.
 *
 * Metrics:
 * - Swap button click rate (control only)
 * - Sell button click rate (both variants)
 * - Total swap FROM completion rate
 * - User confusion indicators (multiple button taps without completion)
 *
 * Feature flag: tokenDetailsSwapButtonAbTest
 * Distribution: 50/50 (controlled by LaunchDarkly)
 */
export const TOKEN_DETAILS_SWAP_BUTTON_TEST = {
  testId: 'token_details_swap_button',
  featureFlagKey: 'tokenDetailsSwapButtonAbTest',
  description:
    'Tests if Swap button visibility matters when sticky Buy/Sell footer is present',
} as const;
```

---

### Step 3: Create Feature Flag Selector

**Update file: `app/selectors/featureFlagController/tokenDetailsV2/index.ts`**

```typescript
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

// Valid variants for the swap button A/B test (Option B)
const VALID_SWAP_BUTTON_VARIANTS = ['control', 'treatment'] as const;

/**
 * Selector for Token Details Swap Button A/B test variant (Option B)
 *
 * @returns 'control' | 'treatment' | null
 */
export const selectTokenDetailsSwapButtonTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string | null => {
    const remoteFlag = remoteFeatureFlags?.tokenDetailsSwapButtonAbTest;

    if (!remoteFlag) {
      return null;
    }

    if (typeof remoteFlag === 'string') {
      if (
        VALID_SWAP_BUTTON_VARIANTS.includes(
          remoteFlag as (typeof VALID_SWAP_BUTTON_VARIANTS)[number],
        )
      ) {
        return remoteFlag;
      }
      return null;
    }

    return null;
  },
);

// Keep existing selectors...
export const selectTokenDetailsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2],
    ),
);

export const selectTokenDetailsV2ButtonsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2Buttons] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2Buttons],
    ),
);
```

---

### Step 4: Create the A/B Test Hook (Simplified)

**Create file: `app/components/UI/TokenDetails/hooks/useTokenDetailsSwapButtonABTest.ts`**

```typescript
import { useSelector } from 'react-redux';
import { selectTokenDetailsSwapButtonTestVariant } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import type { TokenDetailsSwapButtonVariantName } from '../utils/abTesting/types';

/**
 * Return type for the useTokenDetailsSwapButtonABTest hook (Option B)
 */
export interface UseTokenDetailsSwapButtonABTestResult {
  /** 
   * Whether to use old button layout (Buy, Swap, Send, Receive)
   * vs new button layout (Cash Buy, Send, Receive, More)
   * 
   * true = control (old buttons WITH Swap)
   * false = treatment (new buttons, no Swap)
   */
  useOldButtonLayout: boolean;
  /** The variant name for analytics tracking */
  variantName: TokenDetailsSwapButtonVariantName;
  /** Whether the A/B test is active */
  isTestActive: boolean;
}

/**
 * Hook for Token Details Swap Button A/B test (Option B)
 *
 * In this test, sticky footer is ALWAYS shown (not controlled by this hook).
 * The test only controls the button layout:
 * - control: Old buttons (Buy, Swap, Send, Receive)
 * - treatment: New buttons (Cash Buy, Send, Receive, More)
 *
 * Falls back to 'treatment' when test is disabled.
 *
 * @example
 * ```typescript
 * const { useOldButtonLayout, variantName, isTestActive } = useTokenDetailsSwapButtonABTest();
 *
 * // Button rendering - only thing controlled by this hook
 * {useOldButtonLayout ? <AssetDetailsActions /> : <TokenDetailsActions />}
 *
 * // Sticky footer is ALWAYS shown (not controlled by this hook)
 * <BottomSheetFooter ... />
 * ```
 */
export function useTokenDetailsSwapButtonABTest(): UseTokenDetailsSwapButtonABTestResult {
  const launchDarklyVariant = useSelector(selectTokenDetailsSwapButtonTestVariant);

  const variantName: TokenDetailsSwapButtonVariantName =
    (launchDarklyVariant as TokenDetailsSwapButtonVariantName) || 'treatment';

  const isTestActive = !!launchDarklyVariant;

  // control = old layout (has Swap button), treatment = new layout (no Swap)
  const useOldButtonLayout = variantName === 'control';

  return {
    useOldButtonLayout,
    variantName,
    isTestActive,
  };
}

export default useTokenDetailsSwapButtonABTest;
```

---

### Step 5: Update AssetOverviewContent Component

**Update file: `app/components/UI/TokenDetails/components/AssetOverviewContent.tsx`**

```diff
+ import { useTokenDetailsSwapButtonABTest } from '../hooks/useTokenDetailsSwapButtonABTest';
- import { selectTokenDetailsV2ButtonsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';

const AssetOverviewContent: React.FC<AssetOverviewContentProps> = ({
  // ... props
}) => {
  const { styles } = useStyles(styleSheet, {});

- const isTokenDetailsV2ButtonsEnabled = useSelector(
-   selectTokenDetailsV2ButtonsEnabled,
- );
+ const { useOldButtonLayout } = useTokenDetailsSwapButtonABTest();

  // ... rest of component logic

  return (
    <View style={styles.wrapper} testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {/* ... price chart section ... */}

-     {isTokenDetailsV2ButtonsEnabled ? (
+     {!useOldButtonLayout ? (
        <TokenDetailsActions
          hasPerpsMarket={hasPerpsMarket}
          hasBalance={balance != null && Number(balance) > 0}
          isBuyable={isBuyable}
          isNativeCurrency={token.isETH || token.isNative || false}
          token={token}
          onBuy={onBuy}
          onLong={handlePerpsAction}
          onShort={handlePerpsAction}
          onSend={onSend}
          onReceive={onReceive}
          isLoading={isButtonsLoading}
        />
      ) : (
        <AssetDetailsActions
          displayBuyButton={displayBuyButton && isBuyable}
          displaySwapsButton={displaySwapsButton}
          goToSwaps={goToSwaps}
          onBuy={onBuy}
          onReceive={onReceive}
          onSend={onSend}
          asset={{
            address: token.address,
            chainId: token.chainId,
          }}
        />
      )}

      {/* ... rest of content ... */}
    </View>
  );
};
```

---

### Step 6: Update TokenDetails Component (CRITICAL CHANGE)

**Update file: `app/components/UI/TokenDetails/Views/TokenDetails.tsx`**

This is the **key difference from Option A**: The sticky footer is ALWAYS shown, not tied to button layout.

```diff
+ import { useTokenDetailsSwapButtonABTest } from '../hooks/useTokenDetailsSwapButtonABTest';
- import { selectTokenDetailsV2ButtonsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';

const TokenDetails: React.FC<{ token: TokenI }> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

- const isTokenDetailsV2ButtonsEnabled = useSelector(
-   selectTokenDetailsV2ButtonsEnabled,
- );
+ const { useOldButtonLayout } = useTokenDetailsSwapButtonABTest();

  // ... rest of component logic

  return (
    <View style={styles.wrapper}>
      <TokenDetailsInlineHeader
        title={token.symbol}
        networkName={networkName ?? ''}
        onBackPress={() => navigation.goBack()}
        onOptionsPress={
-         shouldShowMoreOptionsInNavBar && !isTokenDetailsV2ButtonsEnabled
+         shouldShowMoreOptionsInNavBar && useOldButtonLayout
            ? openAssetOptions
            : undefined
        }
      />

      {/* ... transactions content ... */}

      {networkModal}

-     {isTokenDetailsV2ButtonsEnabled && !txLoading && displaySwapsButton && (
+     {/* OPTION B: Sticky footer is ALWAYS shown (decoupled from button layout) */}
+     {!txLoading && displaySwapsButton && (
        <BottomSheetFooter
          style={{
            ...styles.bottomSheetFooter,
            paddingBottom: insets.bottom + 6,
          }}
          buttonPropsArray={[
            {
              variant: ButtonVariants.Primary,
              label: strings('asset_overview.buy_button'),
              size: ButtonSize.Lg,
              onPress: handleBuyPress,
            },
            ...(balance && parseFloat(String(balance)) > 0
              ? [
                  {
                    variant: ButtonVariants.Primary,
                    label: strings('asset_overview.sell_button'),
                    size: ButtonSize.Lg,
                    onPress: handleSellPress,
                  },
                ]
              : []),
          ]}
          buttonsAlignment={ButtonsAlignment.Horizontal}
        />
      )}
    </View>
  );
};
```

---

### Step 7: Handle Swap + Sell Analytics Overlap

Since Control variant has BOTH Swap button AND Sell button (both do swap FROM), we need special analytics:

**Update file: `app/components/UI/TokenDetails/hooks/useTokenActions.ts`**

```typescript
import { useTokenDetailsSwapButtonABTest } from './useTokenDetailsSwapButtonABTest';

// Track which button triggered the swap
const handleSellPress = useCallback(() => {
  const { variantName, isTestActive } = useTokenDetailsSwapButtonABTest();
  
  trackEvent(
    createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_BUTTON_CLICKED)
      .addProperties({
        button_type: 'sell',  // Sticky footer Sell button
        swap_source: 'sticky_footer',  // Important for Option B analysis
        token_address: token.address,
        token_symbol: token.symbol,
        ...(isTestActive && {
          ab_tests: { token_details_swap_button: variantName },
        }),
      })
      .build(),
  );
  // ... rest of sell logic
}, [/* dependencies */]);
```

**In `AssetDetailsActions.tsx`** (for the Swap button in control):

```typescript
const handleSwapPress = useCallback(() => {
  trackEvent(
    createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_BUTTON_CLICKED)
      .addProperties({
        button_type: 'swap',  // Action row Swap button
        swap_source: 'action_buttons',  // Distinguishes from sticky Sell
        // ... other props
      })
      .build(),
  );
  goToSwaps();
}, [/* dependencies */]);
```

---

## Edge Cases & Considerations

### 1. Swap + Sell Redundancy (Control Variant)

In Control variant, users see:

| Button | Location | Action |
|--------|----------|--------|
| **Swap** | Action buttons row | Swap FROM current token |
| **Sell** | Sticky footer | Swap FROM current token |

**Same action, two buttons!** This could:
- ✅ Increase swap usage (more visibility)
- ⚠️ Confuse users ("Why two buttons?")
- 📊 Split analytics between buttons

**Mitigation**: Track `swap_source` to distinguish which button drove engagement.

### 2. Options Menu Visibility

In the old layout, the "More options" was in the navbar. With sticky footer always visible, we need to verify:
- Does the options menu still appear correctly?
- Is the navbar overflow handled properly?

### 3. Layout/Spacing Testing

The old button layout was never designed to coexist with sticky footer. Verify:
- Scroll behavior with sticky footer
- Bottom padding doesn't overlap buttons
- Transaction list scrolls correctly

---

## Testing Checklist

### Local Development Testing

- [ ] Temporarily hardcode variant:
  ```typescript
  // In useTokenDetailsSwapButtonABTest.ts - REMOVE BEFORE COMMIT
  const useOldButtonLayout = true;  // Test control (old buttons + footer)
  // const useOldButtonLayout = false;  // Test treatment (new buttons + footer)
  ```

- [ ] Verify Control variant shows:
  - Old buttons: Buy, **Swap**, Send, Receive
  - Sticky Buy/Sell footer (ALWAYS visible)

- [ ] Verify Treatment variant shows:
  - New buttons: Cash Buy, Send, Receive, More
  - Sticky Buy/Sell footer (ALWAYS visible)

### Edge Case Testing

- [ ] Control: Tap both Swap and Sell - verify both work correctly
- [ ] Control: Verify analytics track `swap_source` correctly
- [ ] Both: Scroll transaction list - footer doesn't overlap
- [ ] Both: Options menu works correctly

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `utils/abTesting/types.ts` | CREATE | Type definitions |
| `utils/abTesting/tests.ts` | CREATE | Test configuration |
| `hooks/useTokenDetailsSwapButtonABTest.ts` | CREATE | A/B test hook |
| `selectors/.../index.ts` | MODIFY | Add variant selector |
| `components/AssetOverviewContent.tsx` | MODIFY | Use hook for buttons |
| `Views/TokenDetails.tsx` | MODIFY | **Decouple footer** |
| `hooks/useTokenActions.ts` | MODIFY | Add `swap_source` analytics |
| `AssetDetailsActions.tsx` | MODIFY | Track Swap button clicks |

---

## Complexity Summary

| Factor | Complexity | Notes |
|--------|------------|-------|
| **Files to modify** | 6-7 | vs 4-5 for Option A |
| **Logic changes** | Moderate | Decoupling footer requires care |
| **Testing scope** | Higher | Need to test hybrid state |
| **Analytics** | More complex | Need `swap_source` tracking |
| **Edge cases** | More | Swap+Sell overlap, layout issues |
| **Estimated effort** | 1.5-2x Option A | |

---

## Recommendation

**Option B is viable but more complex.**

Use Option B ONLY if the specific question is:

> "With sticky Buy/Sell footer present, does having an additional Swap button visible increase swap engagement?"

Otherwise, **Option A is recommended** for cleaner test hypothesis and simpler implementation.

---

## References

- [ABTest.md - Options Analysis](./ABTest.md)
- [ABTestImplForOptionA.md - Option A Guide](./ABTestImplForOptionA.md)
- [A/B Testing Framework](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400743989262/A+B+Testing+Framework)
