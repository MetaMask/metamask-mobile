# A/B Test Implementation Guide: Option A

This document provides a complete implementation guide for the Token Details Layout A/B test (Option A).

## Test Overview

| Aspect | Details |
|--------|---------|
| **Test Name** | Token Details Layout A/B Test |
| **Feature Flag** | `tokenDetailsLayoutAbTest` |
| **Variants** | `control` (old layout), `treatment` (new layout) |
| **Distribution** | 50/50 (controlled by LaunchDarkly) |

### What Each Variant Shows

| Variant | Action Buttons | Sticky Footer |
|---------|---------------|---------------|
| **Control** | Buy, Swap, Send, Receive | None |
| **Treatment** | Cash Buy, Send, Receive, More | Buy, Sell |

### Simplified Approach

Since this is a binary test (old layout vs new layout), we use a single `useNewLayout` boolean instead of multiple flags like `showStickyFooter`, `showSwapButton`, etc. This keeps the code clean and easy to reason about:

- `useNewLayout = true` → Treatment (new layout + sticky footer)
- `useNewLayout = false` → Control (old layout + Swap button)

---

## Implementation Steps

### Step 1: Create A/B Test Types (Simplified)

Since Option A is a clean "either/or" between old and new layout, we only need a simple type:

**Create file: `app/components/UI/TokenDetails/utils/abTesting/types.ts`**

```typescript
/**
 * Types for Token Details A/B testing
 */

/**
 * Valid variant names for the layout test
 */
export type TokenDetailsLayoutVariantName = 'control' | 'treatment';

/**
 * Layout configuration - simplified since it's binary (old vs new)
 * 
 * Control (old layout):
 *   - Buttons: Buy, Swap, Send, Receive
 *   - No sticky footer
 * 
 * Treatment (new layout):
 *   - Buttons: Cash Buy, Send, Receive, More
 *   - Sticky Buy/Sell footer
 */
export interface TokenDetailsLayoutConfig {
  /** Use new layout (treatment) vs old layout (control) */
  useNewLayout: boolean;
}
```

---

### Step 2: Create Test Configuration (Simplified)

Since the test is binary, we don't need complex variant data - just the variant name is enough.

**Create file: `app/components/UI/TokenDetails/utils/abTesting/tests.ts`**

```typescript
/**
 * Token Details Layout A/B Test Configuration
 *
 * Tests the new token details layout with sticky Buy/Sell footer
 * vs the old layout with Swap button.
 *
 * Hypothesis: The new layout with sticky Buy/Sell buttons and simplified
 * action row will drive higher engagement than the old layout with
 * the Swap button prominently displayed.
 *
 * Metrics:
 * - Button click rates (Buy, Sell, Swap, Send, Receive)
 * - Swap/trade completion rates
 * - Time spent on token details page
 * - Navigation patterns (which buttons are used most)
 *
 * Feature flag: tokenDetailsLayoutAbTest
 * Distribution: 50/50 (controlled by LaunchDarkly)
 *
 * Variants:
 * - control: Old layout (Buy, Swap, Send, Receive) + no sticky footer
 * - treatment: New layout (Cash Buy, Send, Receive, More) + sticky Buy/Sell
 */
export const TOKEN_DETAILS_LAYOUT_TEST = {
  testId: 'token_details_layout',
  featureFlagKey: 'tokenDetailsLayoutAbTest',
  description:
    'Tests new token details layout with sticky Buy/Sell footer vs old layout with Swap button',
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

// Valid variants for the layout A/B test
const VALID_LAYOUT_VARIANTS = ['control', 'treatment'] as const;

/**
 * Selector for Token Details Layout A/B test variant
 *
 * Reads the variant name from LaunchDarkly feature flag.
 * Returns null if the test is disabled or flag is not set.
 *
 * @returns 'control' | 'treatment' | null
 */
export const selectTokenDetailsLayoutTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string | null => {
    const remoteFlag = remoteFeatureFlags?.tokenDetailsLayoutAbTest;

    if (!remoteFlag) {
      return null;
    }

    // Direct string variant from LaunchDarkly
    if (typeof remoteFlag === 'string') {
      if (
        VALID_LAYOUT_VARIANTS.includes(
          remoteFlag as (typeof VALID_LAYOUT_VARIANTS)[number],
        )
      ) {
        return remoteFlag;
      }
      return null;
    }

    return null;
  },
);

/**
 * Keep TokenDetailsV2Enabled - always true since we use the V2 component
 * The A/B test controls the button layout within V2
 */
export const selectTokenDetailsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2],
    ),
);

/**
 * @deprecated Use selectTokenDetailsLayoutTestVariant for A/B test
 * Keep for backward compatibility during migration
 */
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

**Create file: `app/components/UI/TokenDetails/hooks/useTokenDetailsABTest.ts`**

```typescript
import { useSelector } from 'react-redux';
import { selectTokenDetailsLayoutTestVariant } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import type { TokenDetailsLayoutVariantName } from '../utils/abTesting/types';

/**
 * Return type for the useTokenDetailsABTest hook
 */
export interface UseTokenDetailsABTestResult {
  /** Whether to use new layout (true) or old layout (false) */
  useNewLayout: boolean;
  /** The variant name for analytics tracking */
  variantName: TokenDetailsLayoutVariantName;
  /** Whether the A/B test is active (LaunchDarkly returned a variant) */
  isTestActive: boolean;
}

/**
 * Hook for Token Details Layout A/B test
 *
 * Returns a simple boolean for layout selection based on the assigned variant.
 * Falls back to 'treatment' (new layout) if the test is disabled.
 *
 * @example
 * ```typescript
 * const { useNewLayout, variantName, isTestActive } = useTokenDetailsABTest();
 *
 * // Use in rendering - simple boolean check
 * {useNewLayout ? <TokenDetailsActions /> : <AssetDetailsActions />}
 * {useNewLayout && <StickyBuySellFooter />}
 *
 * // Use in analytics
 * trackEvent({
 *   ...(isTestActive && { ab_tests: { token_details_layout: variantName } }),
 * });
 * ```
 */
export function useTokenDetailsABTest(): UseTokenDetailsABTestResult {
  const launchDarklyVariant = useSelector(selectTokenDetailsLayoutTestVariant);

  // Determine variant: use LaunchDarkly value, or fallback to 'treatment' (new layout)
  // Fallback to treatment ensures users get the new experience when test is off
  const variantName: TokenDetailsLayoutVariantName =
    (launchDarklyVariant as TokenDetailsLayoutVariantName) || 'treatment';

  // Test is active only if LaunchDarkly returned a variant
  const isTestActive = !!launchDarklyVariant;

  // Simple boolean: treatment = new layout, control = old layout
  const useNewLayout = variantName === 'treatment';

  return {
    useNewLayout,
    variantName,
    isTestActive,
  };
}

export default useTokenDetailsABTest;
```

---

### Step 5: Create Index Export (Optional)

**Create file: `app/components/UI/TokenDetails/utils/abTesting/index.ts`**

```typescript
export * from './types';
export * from './tests';
```

> Note: With the simplified approach, you could even skip creating the `utils/abTesting/` folder entirely and just put the types inline in the hook file. The types are minimal enough.

---

### Step 6: Update AssetOverviewContent Component

**Update file: `app/components/UI/TokenDetails/components/AssetOverviewContent.tsx`**

```diff
+ import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
- import { selectTokenDetailsV2ButtonsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';

const AssetOverviewContent: React.FC<AssetOverviewContentProps> = ({
  // ... props
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

- const isTokenDetailsV2ButtonsEnabled = useSelector(
-   selectTokenDetailsV2ButtonsEnabled,
- );
+ const { useNewLayout } = useTokenDetailsABTest();

  // ... rest of component logic

  return (
    <View style={styles.wrapper} testID={TokenOverviewSelectorsIDs.CONTAINER}>
      {/* ... price chart section ... */}

-     {isTokenDetailsV2ButtonsEnabled ? (
+     {useNewLayout ? (
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

### Step 7: Update TokenDetails Component

**Update file: `app/components/UI/TokenDetails/Views/TokenDetails.tsx`**

```diff
+ import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
- import { selectTokenDetailsV2ButtonsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';

const TokenDetails: React.FC<{ token: TokenI }> = ({ token }) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

- const isTokenDetailsV2ButtonsEnabled = useSelector(
-   selectTokenDetailsV2ButtonsEnabled,
- );
+ const { useNewLayout } = useTokenDetailsABTest();

  // ... rest of component logic

  return (
    <View style={styles.wrapper}>
      <TokenDetailsInlineHeader
        title={token.symbol}
        networkName={networkName ?? ''}
        onBackPress={() => navigation.goBack()}
        onOptionsPress={
-         shouldShowMoreOptionsInNavBar && !isTokenDetailsV2ButtonsEnabled
+         shouldShowMoreOptionsInNavBar && !useNewLayout
            ? openAssetOptions
            : undefined
        }
      />

      {/* ... transactions content ... */}

      {networkModal}

-     {isTokenDetailsV2ButtonsEnabled && !txLoading && displaySwapsButton && (
+     {useNewLayout && !txLoading && displaySwapsButton && (
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

### Step 8: Analytics Implementation (Comprehensive)

This section covers the complete analytics setup for end-to-end attribution.

---

#### 8.1: Add TOKEN_DETAILS_PAGE_VIEWED Event (NEW for Mobile)

**Update file: `app/components/UI/TokenDetails/Views/TokenDetails.tsx`**

```typescript
import { useTokenDetailsABTest } from '../hooks/useTokenDetailsABTest';
import { useMetrics } from '../../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const TokenDetails: React.FC<{ token: TokenI }> = ({ token }) => {
  const { variantName, isTestActive } = useTokenDetailsABTest();
  const { trackEvent, createEventBuilder } = useMetrics();
  
  // Track page view on mount (NEW EVENT)
  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_PAGE_VIEWED)
        .addProperties({
          token_address: token.address,
          token_symbol: token.symbol,
          token_name: token.name,
          chain_id: token.chainId,
          has_perps_market: hasPerpsMarket, // from existing logic
          // A/B test attribution
          ...(isTestActive && {
            ab_tests: { token_details_layout: variantName },
          }),
        })
        .build(),
    );
  }, [token.address]); // Only fire once per token view
  
  // ... rest of component
};
```

**Note**: You'll need to add `TOKEN_DETAILS_PAGE_VIEWED` to `MetaMetricsEvents` enum if it doesn't exist.

---

#### 8.2: Enhance Existing ACTION_BUTTON_CLICKED Events

The existing events already fire. We just need to add `ab_tests` and `entry_point` properties.

**Update file: `app/components/Views/AssetDetails/AssetDetailsActions/AssetDetailsActions.tsx`** (Control variant)

```typescript
// Existing Swap button handler - ADD entry_point and ab_tests
const handleSwapPress = useCallback(() => {
  const { variantName, isTestActive } = useTokenDetailsABTest();
  
  // Existing ACTION_BUTTON_CLICKED event - ENHANCE IT
  trackEvent(
    createEventBuilder(MetaMetricsEvents.ACTION_BUTTON_CLICKED)
      .addProperties({
        action_name: 'swap',
        action_position: 1,
        location: 'asset details',
        // NEW: A/B test attribution
        ...(isTestActive && {
          ab_tests: { token_details_layout: variantName },
        }),
      })
      .build(),
  );
  
  // Existing SWAP_BUTTON_CLICKED event - ENHANCE IT
  trackEvent(
    createEventBuilder(MetaMetricsEvents.SWAP_BUTTON_CLICKED)
      .addProperties({
        location: 'TokenDetails',
        chain_id_source: token.chainId,
        token_symbol_source: token.symbol,
        token_address_source: token.address,
        // NEW: entry_point for e2e attribution
        entry_point: 'token_details_swap_button',
        ...(isTestActive && {
          ab_tests: { token_details_layout: variantName },
        }),
      })
      .build(),
  );
  
  // Navigate to swap - PASS entry_point
  goToSwaps({
    sourceToken: token.address,
    entry_point: 'token_details_swap_button', // For downstream attribution
  });
}, [/* dependencies */]);
```

---

#### 8.3: Add entry_point to Sticky Footer Buy/Sell (Treatment variant)

**Update file: `app/components/UI/TokenDetails/Views/TokenDetails.tsx`**

```typescript
// Sticky footer Buy button
const handleBuyPress = useCallback(() => {
  const { variantName, isTestActive } = useTokenDetailsABTest();
  
  // Track button click
  trackEvent(
    createEventBuilder(MetaMetricsEvents.ACTION_BUTTON_CLICKED)
      .addProperties({
        action_name: 'buy',
        action_position: 0,
        location: 'token_details_sticky_footer',
        button_type: 'sticky_buy',
        // entry_point for e2e attribution
        entry_point: 'token_details_sticky_buy',
        ...(isTestActive && {
          ab_tests: { token_details_layout: variantName },
        }),
      })
      .build(),
  );
  
  // Navigate - PASS entry_point for downstream tracking
  goToSwaps({
    destinationToken: token.address, // Buy = swap TO this token
    entry_point: 'token_details_sticky_buy',
  });
}, [/* dependencies */]);

// Sticky footer Sell button
const handleSellPress = useCallback(() => {
  const { variantName, isTestActive } = useTokenDetailsABTest();
  
  trackEvent(
    createEventBuilder(MetaMetricsEvents.ACTION_BUTTON_CLICKED)
      .addProperties({
        action_name: 'sell',
        action_position: 1,
        location: 'token_details_sticky_footer',
        button_type: 'sticky_sell',
        entry_point: 'token_details_sticky_sell',
        ...(isTestActive && {
          ab_tests: { token_details_layout: variantName },
        }),
      })
      .build(),
  );
  
  goToSwaps({
    sourceToken: token.address, // Sell = swap FROM this token
    entry_point: 'token_details_sticky_sell',
  });
}, [/* dependencies */]);
```

---

#### 8.4: End-to-End Attribution Flow

The `entry_point` property must flow through to completion events:

```
User Journey:
┌─────────────────────────────────────────────────────────────────────────┐
│ TOKEN_DETAILS_PAGE_VIEWED                                               │
│   token_address, chain_id, has_perps_market                             │
│   ab_tests: { token_details_layout: 'control' | 'treatment' }           │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ ACTION_BUTTON_CLICKED                                                   │
│   action_name: 'swap' | 'buy' | 'sell'                                  │
│   location: 'asset details' | 'token_details_sticky_footer'             │
│   entry_point: 'token_details_swap_button' | 'token_details_sticky_buy' │
│   ab_tests: { token_details_layout: 'control' | 'treatment' }           │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ SWAP_PAGE_VIEWED (needs entry_point)                                    │
│   entry_point: 'token_details_swap_button' | 'token_details_sticky_buy' │
│   ab_tests: { token_details_layout: '...' }                             │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ UNIFIED_SWAPBRIDGE_COMPLETED  ← Must include entry_point!               │
│   entry_point: 'token_details_swap_button' | 'token_details_sticky_buy' │
│   ab_tests: { token_details_layout: '...' }                             │
│   ^^^ THIS IS KEY FOR MEASURING CONVERSION ^^^                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### 8.5: Pass entry_point Through Navigation

**Update swap navigation to include entry_point:**

```typescript
// In useTokenActions.ts or wherever goToSwaps is called
const goToSwapsWithAttribution = useCallback((params: {
  sourceToken?: string;
  destinationToken?: string;
  entry_point: string;
}) => {
  // Store entry_point in navigation params or context
  navigation.navigate(Routes.SWAPS, {
    ...params,
    entry_point: params.entry_point,
    // Also pass ab_tests if needed
    ab_tests: isTestActive ? { token_details_layout: variantName } : undefined,
  });
}, [navigation, isTestActive, variantName]);
```

**Update Swap page to read and propagate entry_point:**

The Swap page and SwapBridge completion handler need to:
1. Read `entry_point` from navigation params
2. Include it in `UNIFIED_SWAPBRIDGE_COMPLETED` event

---

#### 8.6: Complete Event Reference

| Event | Variant | Properties Added |
|-------|---------|------------------|
| `TOKEN_DETAILS_PAGE_VIEWED` | Both | `token_address`, `token_symbol`, `token_name`, `chain_id`, `has_perps_market`, `ab_tests` |
| `ACTION_BUTTON_CLICKED` (Swap) | Control | `entry_point: 'token_details_swap_button'`, `ab_tests` |
| `ACTION_BUTTON_CLICKED` (Buy sticky) | Treatment | `entry_point: 'token_details_sticky_buy'`, `ab_tests` |
| `ACTION_BUTTON_CLICKED` (Sell sticky) | Treatment | `entry_point: 'token_details_sticky_sell'`, `ab_tests` |
| `SWAP_BUTTON_CLICKED` | Control | `entry_point`, `ab_tests` |
| `SWAP_PAGE_VIEWED` | Both | `entry_point`, `ab_tests` |
| `UNIFIED_SWAPBRIDGE_COMPLETED` | Both | `entry_point`, `ab_tests` |
| `PERP_TRADE_TRANSACTION` | Both | `entry_point`, `ab_tests` (if perps enabled) |

---

#### 8.7: entry_point Values Reference

| Button | entry_point Value |
|--------|-------------------|
| Swap button (control) | `token_details_swap_button` |
| Buy sticky footer (treatment) | `token_details_sticky_buy` |
| Sell sticky footer (treatment) | `token_details_sticky_sell` |
| Cash Buy action row (treatment) | `token_details_cash_buy` |
| Long button (perps) | `token_details_long` |
| Short button (perps) | `token_details_short` |

---

## LaunchDarkly Configuration

### Flag Setup (Done by Backend/DevOps)

1. **Create Flag in LaunchDarkly**
   - Name: `token-details-layout-ab-test`
   - Key: `tokenDetailsLayoutAbTest`
   - Type: **String**
   - Client-side SDK: **Enabled for Mobile Key**

2. **Define Variations**
   - Variation 0: `control` (name: "Control - Old Layout")
   - Variation 1: `treatment` (name: "Treatment - New Layout")

3. **Configure Default Rule**
   - Serve: A percentage rollout
   - Split: 50% → `control`, 50% → `treatment`
   - Bucket by: `user | key` (MetaMetrics ID)

4. **Default Variations**
   - When ON: Serves default rule (percentage rollout)
   - When OFF: Serves `treatment` (so users get new layout when test ends)

---

## Segment Schema Update

**PR to `Consensys/segment-schema`**

### 1. Add ab_tests Property (if not exists)

```yaml
# libraries/properties/metamask-mobile-globals.yaml
ab_tests:
  type: object
  description: "Active A/B test variants. Keys are test names, values are variant names."
  required: false
  additionalProperties:
    type: string
```

### 2. Add entry_point Property

```yaml
# libraries/properties/metamask-mobile-globals.yaml
entry_point:
  type: string
  description: "Source location that initiated the user flow. Used for e2e attribution."
  required: false
  enum:
    - token_details_swap_button
    - token_details_sticky_buy
    - token_details_sticky_sell
    - token_details_cash_buy
    - token_details_long
    - token_details_short
    # ... other entry points
```

### 3. Create TOKEN_DETAILS_PAGE_VIEWED Event (NEW)

```yaml
# libraries/events/metamask-mobile/token-details-page-viewed.yaml
name: Token Details Page Viewed
description: Fired when user views a token details page
properties:
  token_address:
    type: string
    description: The address of the token being viewed
    required: true
  token_symbol:
    type: string
    description: The symbol of the token (e.g., ETH, USDC)
    required: true
  token_name:
    type: string
    description: The full name of the token
    required: false
  chain_id:
    type: string
    description: The chain ID where the token exists
    required: true
  has_perps_market:
    type: boolean
    description: Whether this token has a perpetuals market available
    required: false
  ab_tests:
    $ref: '#/definitions/ab_tests'
```

### 4. Update Existing Events

Add `entry_point` and `ab_tests` to:

- `ACTION_BUTTON_CLICKED`
- `SWAP_BUTTON_CLICKED`
- `SWAP_PAGE_VIEWED`
- `UNIFIED_SWAPBRIDGE_COMPLETED`
- `PERP_TRADE_TRANSACTION`

```yaml
# Example: Update UNIFIED_SWAPBRIDGE_COMPLETED
properties:
  # ... existing properties ...
  entry_point:
    $ref: '#/definitions/entry_point'
  ab_tests:
    $ref: '#/definitions/ab_tests'
```

---

## Testing Checklist

### Local Development Testing

- [ ] Temporarily hardcode variant to test each layout:
  ```typescript
  // In useTokenDetailsABTest.ts - REMOVE BEFORE COMMIT
  const useNewLayout = false; // Test old layout (control)
  // const useNewLayout = true; // Test new layout (treatment)
  ```

- [ ] Verify `useNewLayout = false` (Control) shows:
  - Old buttons: Buy, Swap, Send, Receive
  - NO sticky footer

- [ ] Verify `useNewLayout = true` (Treatment) shows:
  - New buttons: Cash Buy, Send, Receive, More
  - Sticky Buy/Sell footer

### Analytics Testing

Use Segment Debugger or console logging to verify:

- [ ] **TOKEN_DETAILS_PAGE_VIEWED** fires on page load with:
  - `token_address`, `token_symbol`, `chain_id`, `has_perps_market`
  - `ab_tests: { token_details_layout: 'control' | 'treatment' }` when test active

- [ ] **ACTION_BUTTON_CLICKED** fires on button tap with:
  - Correct `action_name` ('swap', 'buy', 'sell')
  - Correct `entry_point` value
  - `ab_tests` property

- [ ] **entry_point flows through** to swap completion:
  - Open Segment Debugger
  - Tap Swap/Buy/Sell → Complete swap
  - Verify `UNIFIED_SWAPBRIDGE_COMPLETED` includes `entry_point`

### E2E Attribution Verification

- [ ] Control: Swap button → `entry_point: 'token_details_swap_button'` → Swap completed
- [ ] Treatment: Sell button → `entry_point: 'token_details_sticky_sell'` → Swap completed
- [ ] Treatment: Buy button → `entry_point: 'token_details_sticky_buy'` → Swap completed

### Pre-Launch Checklist

- [ ] LaunchDarkly flag created and configured
- [ ] Segment schema PR merged (TOKEN_DETAILS_PAGE_VIEWED, entry_point)
- [ ] Unit tests updated for new hook
- [ ] Manual QA on both iOS and Android
- [ ] Mixpanel dashboard created for analysis

---

## Measuring Success: Analytics Queries

### Query 1: Swap FROM Engagement by Variant

```sql
-- Compare Swap button (control) vs Sell button (treatment)
WITH page_views AS (
  SELECT 
    ab_tests.token_details_layout as variant,
    COUNT(DISTINCT session_id) as views
  FROM events
  WHERE event = 'TOKEN_DETAILS_PAGE_VIEWED'
    AND ab_tests.token_details_layout IS NOT NULL
  GROUP BY 1
),
swap_from_clicks AS (
  SELECT
    ab_tests.token_details_layout as variant,
    COUNT(*) as clicks
  FROM events
  WHERE event = 'ACTION_BUTTON_CLICKED'
    AND entry_point IN ('token_details_swap_button', 'token_details_sticky_sell')
    AND ab_tests.token_details_layout IS NOT NULL
  GROUP BY 1
),
swap_completions AS (
  SELECT
    ab_tests.token_details_layout as variant,
    COUNT(*) as completions
  FROM events
  WHERE event = 'UNIFIED_SWAPBRIDGE_COMPLETED'
    AND entry_point IN ('token_details_swap_button', 'token_details_sticky_sell')
    AND ab_tests.token_details_layout IS NOT NULL
  GROUP BY 1
)
SELECT
  pv.variant,
  pv.views,
  sc.clicks,
  comp.completions,
  ROUND(sc.clicks / pv.views * 100, 2) as click_rate,
  ROUND(comp.completions / sc.clicks * 100, 2) as completion_rate,
  ROUND(comp.completions / pv.views * 100, 2) as conversion_rate
FROM page_views pv
LEFT JOIN swap_from_clicks sc ON pv.variant = sc.variant
LEFT JOIN swap_completions comp ON pv.variant = comp.variant;
```

**Expected Output:**

| variant | views | clicks | completions | click_rate | completion_rate | conversion_rate |
|---------|-------|--------|-------------|------------|-----------------|-----------------|
| control | 50000 | 2500 | 1750 | 5.0% | 70% | 3.5% |
| treatment | 50000 | 2100 | 1550 | 4.2% | 74% | 3.1% |

### Query 2: Total Swap Engagement (FROM + TO)

```sql
-- Treatment has Buy (swap TO) which control doesn't have
SELECT
  ab_tests.token_details_layout as variant,
  entry_point,
  COUNT(*) as completions
FROM events
WHERE event = 'UNIFIED_SWAPBRIDGE_COMPLETED'
  AND entry_point LIKE 'token_details%'
  AND ab_tests.token_details_layout IS NOT NULL
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
```

**Expected Output:**

| variant | entry_point | completions |
|---------|-------------|-------------|
| control | token_details_swap_button | 1750 |
| treatment | token_details_sticky_sell | 1550 |
| treatment | token_details_sticky_buy | 2400 |

### Query 3: Funnel Analysis

```sql
-- Full funnel from page view to completion
SELECT
  ab_tests.token_details_layout as variant,
  'page_view' as step,
  COUNT(*) as count
FROM events WHERE event = 'TOKEN_DETAILS_PAGE_VIEWED'
  AND ab_tests.token_details_layout IS NOT NULL
GROUP BY 1

UNION ALL

SELECT
  ab_tests.token_details_layout,
  'button_click',
  COUNT(*)
FROM events WHERE event = 'ACTION_BUTTON_CLICKED'
  AND entry_point LIKE 'token_details%'
  AND ab_tests.token_details_layout IS NOT NULL
GROUP BY 1

UNION ALL

SELECT
  ab_tests.token_details_layout,
  'swap_completed',
  COUNT(*)
FROM events WHERE event = 'UNIFIED_SWAPBRIDGE_COMPLETED'
  AND entry_point LIKE 'token_details%'
  AND ab_tests.token_details_layout IS NOT NULL
GROUP BY 1

ORDER BY 1, 2;
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `utils/abTesting/types.ts` | CREATE | Type definitions |
| `utils/abTesting/tests.ts` | CREATE | Test configuration |
| `utils/abTesting/index.ts` | CREATE | Barrel export |
| `hooks/useTokenDetailsABTest.ts` | CREATE | A/B test hook |
| `selectors/.../index.ts` | MODIFY | Add variant selector |
| `components/AssetOverviewContent.tsx` | MODIFY | Use hook for buttons |
| `Views/TokenDetails.tsx` | MODIFY | Use hook for footer |
| `hooks/useTokenActions.ts` | MODIFY | Add analytics tracking |

---

## Rollout Strategy

1. **Phase 1: Internal Testing**
   - Enable flag for internal team only
   - Verify both variants work correctly
   - Check analytics events in Segment Debugger

2. **Phase 2: A/B Test (2-4 weeks)**
   - Enable 50/50 split for all users
   - Monitor key metrics in Mixpanel
   - Look for statistically significant differences

3. **Phase 3: Rollout Winner**
   - If Treatment wins: Set flag to always return `treatment`, then remove A/B test code
   - If Control wins: Revert to old layout, remove new layout code

---

## References

- [A/B Testing Framework](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400743989262/A+B+Testing+Framework)
- [Perps A/B Testing Implementation](../../Perps/utils/abTesting/)
- [ABTest.md - Options Analysis](./ABTest.md)
