# AB Testing Implementation Guide - MetaMask Mobile

**Standard for implementing AB tests in MetaMask Mobile using feature flags and analytics.**

> **Note:** This guide presents a general AB testing infrastructure approach. For a real-world implementation example, see the **Perps AB Testing** implementation which uses LaunchDarkly directly with a simplified flat property pattern. See:
>
> - `docs/perps/perps-ab-testing.md` - Perps-specific implementation
> - `docs/perps/perps-metametrics-reference.md` - Event tracking patterns
>
> The analytics patterns in this guide (flat properties, conditional tracking) align with the Perps implementation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Analytics & Metrics](#analytics--metrics)
5. [Testing & Validation](#testing--validation)
6. [Best Practices](#best-practices)

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    RemoteFeatureFlagController              │
│  - Manages feature flags from backend                       │
│  - Version gating support                                   │
│  - Local override via env vars                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    AB Testing Layer (NEW)                   │
│  - Variant assignment based on user ID                      │
│  - Stable assignments (same user = same variant)            │
│  - Configurable variant weights                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    MetaMetrics Analytics                     │
│  - Track variant assignments                                │
│  - Track user interactions per variant                      │
│  - Track conversions and outcomes                           │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Stable Assignment:** Users get the same variant across sessions
2. **Feature Flag Control:** Tests can be enabled/disabled remotely
3. **Analytics First:** All variant assignments and interactions are tracked
4. **Type Safe:** Full TypeScript support with strict types

---

## Quick Start

### 1. Define Your AB Test

```typescript
// app/util/abTesting/tests/buttonColorTest.ts
export const BUTTON_COLOR_TEST = {
  testId: 'perps_button_colors_phase1',
  variants: [
    { id: 'control', weight: 50 }, // Green/Red
    { id: 'monochrome', weight: 50 }, // White/White
  ],
} as const;
```

### 2. Add Feature Flag

**Naming Convention:** `perps-abtest-{test-name}` (no `-enabled` suffix)

**Why this pattern?**

- `perps-` = Feature area (Perps trading)
- `abtest-` = Identifies it as an AB test (vs feature flag)
- `{test-name}` = What's being tested
- No `-enabled` suffix needed (LaunchDarkly has ON/OFF toggle)

**In LaunchDarkly:**

- Flag key: `perps-abtest-button-color` (kebab-case)
- Flag type: **String** (not Boolean or JSON)
- Variations: `"control"` and `"monochrome"` (simple strings)

**What the app receives:**

```typescript
// RemoteFeatureFlagController state (kebab-case converted to camelCase)
{
  "perpsAbtestButtonColor": "control"  // Simple string value
}
```

**Note:**

- When flag is OFF, LaunchDarkly returns `null`/`undefined` (no need for `-enabled` suffix)
- For AB tests, use simple string values
- Version gating is handled via targeting rules in LaunchDarkly, not in the flag value itself

### 3. Use in Component

```typescript
// app/components/UI/Perps/Views/PerpsOrderView.tsx
import { useABTest } from '@/util/abTesting/useABTest';
import { BUTTON_COLOR_TEST } from '@/util/abTesting/tests/buttonColorTest';

export const PerpsOrderView = () => {
  const { variant, isLoading } = useABTest(BUTTON_COLOR_TEST.testId);

  const buttonSeverity = variant === 'monochrome'
    ? ButtonSemanticSeverity.Info  // Blue
    : ButtonSemanticSeverity.Success; // Green for Long

  return (
    <ButtonSemantic severity={buttonSeverity}>
      Long
    </ButtonSemantic>
  );
};
```

---

## Step-by-Step Implementation

### Step 1: Create AB Testing Types

**File: `app/util/abTesting/types.ts`**

```typescript
/**
 * Configuration for an AB test
 */
export interface ABTestConfig {
  /** Unique identifier for the test */
  testId: string;
  /** List of variants with weights */
  variants: ABTestVariant[];
  /** Optional: override feature flag name (defaults to testId + 'Enabled') */
  featureFlagName?: string;
}

/**
 * A variant in an AB test
 */
export interface ABTestVariant {
  /** Unique identifier for this variant */
  id: string;
  /** Weight for random assignment (0-100) */
  weight: number;
}

/**
 * Stored assignment for a user
 */
export interface ABTestAssignment {
  testId: string;
  variantId: string;
  assignedAt: number; // timestamp
}

/**
 * Result of useABTest hook
 */
export interface ABTestResult {
  /** Assigned variant ID */
  variant: string;
  /** Whether the test is enabled via feature flag */
  isEnabled: boolean;
  /** Whether assignment is loading */
  isLoading: boolean;
  /** Error if assignment failed */
  error?: string;
}
```

### Step 2: Create Variant Assignment Logic

**File: `app/util/abTesting/variantAssignment.ts`**

```typescript
import { ABTestConfig, ABTestVariant } from './types';

/**
 * Generates a stable hash from a string
 * Same input always produces same output
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Assigns a variant to a user based on their user ID
 * Uses weighted distribution
 *
 * @example
 * const config = {
 *   testId: 'button_color',
 *   variants: [
 *     { id: 'control', weight: 50 },
 *     { id: 'variant_a', weight: 30 },
 *     { id: 'variant_b', weight: 20 }
 *   ]
 * };
 * const variant = assignVariant('user-123', config);
 */
export function assignVariant(userId: string, config: ABTestConfig): string {
  // Validate weights sum to 100
  const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    console.warn(
      `[AB Test] Weights for ${config.testId} sum to ${totalWeight}, expected 100. Using equal distribution.`,
    );
    return assignVariantEqual(userId, config.variants);
  }

  // Generate stable hash for this user + test combination
  const hash = simpleHash(`${userId}-${config.testId}`);
  const bucket = hash % 100; // 0-99

  // Assign based on weighted buckets
  let cumulative = 0;
  for (const variant of config.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant.id;
    }
  }

  // Fallback to first variant (should never happen)
  return config.variants[0].id;
}

/**
 * Fallback: Equal distribution
 */
function assignVariantEqual(userId: string, variants: ABTestVariant[]): string {
  const hash = simpleHash(userId);
  const index = hash % variants.length;
  return variants[index].id;
}
```

### Step 3: Create Storage Layer

**File: `app/util/abTesting/storage.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ABTestAssignment } from './types';

const STORAGE_KEY_PREFIX = '@ABTest:';

/**
 * Get stored assignment for a test
 */
export async function getStoredAssignment(
  testId: string,
): Promise<ABTestAssignment | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${testId}`;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;

    return JSON.parse(stored) as ABTestAssignment;
  } catch (error) {
    console.error(
      `[AB Test] Failed to get stored assignment for ${testId}:`,
      error,
    );
    return null;
  }
}

/**
 * Store assignment for a test
 */
export async function storeAssignment(
  assignment: ABTestAssignment,
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${assignment.testId}`;
    await AsyncStorage.setItem(key, JSON.stringify(assignment));
  } catch (error) {
    console.error(
      `[AB Test] Failed to store assignment for ${assignment.testId}:`,
      error,
    );
  }
}

/**
 * Clear stored assignment (for testing only)
 */
export async function clearAssignment(testId: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${testId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[AB Test] Failed to clear assignment for ${testId}:`, error);
  }
}
```

### Step 4: Create Main Hook

**File: `app/util/abTesting/useABTest.ts`**

```typescript
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics/MetaMetrics.events';
import { selectRemoteFeatureFlags } from '@/selectors/featureFlagController';
import { ABTestConfig, ABTestResult } from './types';
import { assignVariant } from './variantAssignment';
import { getStoredAssignment, storeAssignment } from './storage';

/**
 * Main hook for AB testing
 *
 * @example
 * const { variant, isEnabled } = useABTest(BUTTON_COLOR_TEST.testId);
 *
 * if (!isEnabled) {
 *   return <DefaultComponent />;
 * }
 *
 * return variant === 'control'
 *   ? <ControlVariant />
 *   : <TestVariant />;
 */
export function useABTest(testId: string, config?: ABTestConfig): ABTestResult {
  const { trackEvent } = useMetrics();
  const remoteFlags = useSelector(selectRemoteFeatureFlags);

  const [state, setState] = useState<ABTestResult>({
    variant: config?.variants[0].id || 'control',
    isEnabled: false,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function initializeTest() {
      try {
        // 1. Check if test is enabled via feature flag
        const featureFlagName = config?.featureFlagName || `${testId}Enabled`;
        const isEnabled = remoteFlags?.[featureFlagName]?.enabled === true;

        if (!isEnabled) {
          if (mounted) {
            setState({
              variant: config?.variants[0].id || 'control',
              isEnabled: false,
              isLoading: false,
            });
          }
          return;
        }

        // 2. Get user ID (metaMetricsId)
        // TODO: Get from Redux state or MetaMetrics
        const userId = 'user-placeholder'; // Replace with actual user ID

        // 3. Check for existing assignment
        const stored = await getStoredAssignment(testId);

        if (stored) {
          // Use existing assignment
          if (mounted) {
            setState({
              variant: stored.variantId,
              isEnabled: true,
              isLoading: false,
            });
          }
          return;
        }

        // 4. Assign new variant
        if (!config) {
          throw new Error(
            `AB Test config required for new assignment: ${testId}`,
          );
        }

        const variantId = assignVariant(userId, config);

        // 5. Store assignment
        const assignment = {
          testId,
          variantId,
          assignedAt: Date.now(),
        };
        await storeAssignment(assignment);

        // 6. Track assignment event
        trackEvent(MetaMetricsEvents.AB_TEST_ASSIGNMENT, {
          ab_test_id: testId,
          ab_test_variant: variantId,
          ab_test_assigned_at: assignment.assignedAt,
        });

        if (mounted) {
          setState({
            variant: variantId,
            isEnabled: true,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error(`[AB Test] Failed to initialize test ${testId}:`, error);
        if (mounted) {
          setState({
            variant: config?.variants[0].id || 'control',
            isEnabled: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    initializeTest();

    return () => {
      mounted = false;
    };
  }, [testId, config, remoteFlags, trackEvent]);

  return state;
}
```

### Step 5: Add Analytics Events

**File: `app/core/Analytics/MetaMetrics.events.ts`**

Add these new events:

```typescript
export enum MetaMetricsEvents {
  // ... existing events ...

  // AB Testing Events
  AB_TEST_ASSIGNMENT = 'AB Test Assignment',
  AB_TEST_INTERACTION = 'AB Test Interaction',
  AB_TEST_CONVERSION = 'AB Test Conversion',
}
```

**File: `app/components/UI/Perps/constants/eventNames.ts`**

Add AB test properties using **flat pattern** (one property per test):

```typescript
export enum PerpsEventProperties {
  // ... existing properties ...

  // A/B testing properties (flat per test for multiple concurrent tests)
  // Only include AB test properties when test is enabled (event not sent when disabled)
  // Button color test (TAT-1937)
  AB_TEST_BUTTON_COLOR = 'ab_test_button_color',
  // Asset details test (TAT-1940)
  AB_TEST_ASSET_DETAILS = 'ab_test_asset_details',
  // Homepage test (TAT-1827)
  AB_TEST_HOMEPAGE = 'ab_test_homepage',
  // Future tests: add as AB_TEST_{TEST_NAME} (no _ENABLED property needed)
}
```

### Step 6: Create Test Configs

**File: `app/util/abTesting/tests/index.ts`**

```typescript
import { ABTestConfig } from '../types';

/**
 * TAT-1937: Button Color Test
 * LaunchDarkly flag: perps-abtest-button-color
 */
export const BUTTON_COLOR_TEST: ABTestConfig = {
  testId: 'perps_button_colors_phase1',
  variants: [
    { id: 'control', weight: 50 }, // Green/Red (standard)
    { id: 'monochrome', weight: 50 }, // White/White
  ],
  featureFlagName: 'perpsAbtestButtonColor',
};

/**
 * TAT-1940: Asset Details Test
 * LaunchDarkly flag: perps-abtest-asset-details
 */
export const ASSET_DETAILS_TEST: ABTestConfig = {
  testId: 'perps_asset_details',
  variants: [
    { id: 'baseline', weight: 34 }, // No changes
    { id: 'replace_receive', weight: 33 }, // Replace Receive with Perps
    { id: 'banner', weight: 33 }, // Banner below chart
  ],
  featureFlagName: 'perpsAbtestAssetDetails',
};

/**
 * TAT-1827: Homepage Test
 * LaunchDarkly flag: perps-abtest-homepage
 */
export const HOMEPAGE_TEST: ABTestConfig = {
  testId: 'perps_homepage',
  variants: [
    { id: 'control', weight: 34 }, // Current layout
    { id: 'replace_receive', weight: 33 }, // Replace Receive with Perps
    { id: 'reorder_perps_3rd', weight: 33 }, // Perps as 3rd CTA
  ],
  featureFlagName: 'perpsAbtestHomepage',
};
```

---

## Analytics & Metrics

### Track Variant Assignment (Automatic)

Assignment is automatically tracked when `useABTest` assigns a new variant.

**Note:** Use the **flat property pattern** - include the test-specific property only when test is enabled:

```typescript
{
  event: 'AB Test Assignment',
  properties: {
    ab_test_button_color: 'monochrome', // Flat pattern: property per test
    assigned_at: 1699123456789
  }
}
// Event is NOT sent when test is disabled
```

### Track User Interactions

Track when users interact with AB test elements using the **flat pattern**:

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics/MetaMetrics.events';
import { PerpsEventProperties } from '@/components/UI/Perps/constants/eventNames';

const { trackEvent } = useMetrics();
const { variant, isEnabled } = useABTest(BUTTON_COLOR_TEST.testId);

const handleLongPress = () => {
  // Only track when test is enabled
  if (!isEnabled) return;

  // Track interaction with flat pattern
  trackEvent(MetaMetricsEvents.AB_TEST_INTERACTION, {
    [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: variant, // Flat pattern
    interaction_type: 'long_button_press',
    asset: 'BTC',
  });

  // Handle press
  navigateToTradeScreen();
};
```

### Track Conversions

Track when users complete desired actions using the **flat pattern**:

```typescript
const handleTradeExecuted = () => {
  // Only track when test is enabled
  if (!isEnabled) return;

  trackEvent(MetaMetricsEvents.AB_TEST_CONVERSION, {
    [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: variant, // Flat pattern
    conversion_type: 'trade_executed',
    duration_ms: executionDuration,
  });
};
```

### Example: Full Component with Tracking

```typescript
// app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx
import { useABTest } from '@/util/abTesting/useABTest';
import { BUTTON_COLOR_TEST } from '@/util/abTesting/tests';
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics/MetaMetrics.events';
import { PerpsEventProperties } from '@/components/UI/Perps/constants/eventNames';

export const PerpsOrderView = () => {
  const { variant, isEnabled } = useABTest(
    BUTTON_COLOR_TEST.testId,
    BUTTON_COLOR_TEST
  );
  const { trackEvent } = useMetrics();

  // Track screen view with variant (flat pattern)
  useEffect(() => {
    if (isEnabled) {
      trackEvent(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        {
          screen_type: 'trade_screen',
          [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: variant, // Flat pattern
        }
      );
    }
  }, [isEnabled, variant]);

  // Get button styles based on variant
  const getButtonSeverity = (direction: 'long' | 'short') => {
    if (variant === 'monochrome') {
      return ButtonSemanticSeverity.Info; // Blue for both
    }
    // Control: Standard colors
    return direction === 'long'
      ? ButtonSemanticSeverity.Success // Green
      : ButtonSemanticSeverity.Danger;  // Red
  };

  const handleLongPress = () => {
    // Track button press (flat pattern)
    if (isEnabled) {
      trackEvent(
        MetaMetricsEvents.AB_TEST_INTERACTION,
        {
          [PerpsEventProperties.AB_TEST_BUTTON_COLOR]: variant, // Flat pattern
          interaction_type: 'long_button_press',
        direction: 'long',
      }
    );

    setDirection('long');
  };

  return (
    <View>
      <ButtonSemantic
        severity={getButtonSeverity('long')}
        onPress={handleLongPress}
      >
        Long
      </ButtonSemantic>
      <ButtonSemantic
        severity={getButtonSeverity('short')}
        onPress={handleShortPress}
      >
        Short
      </ButtonSemantic>
    </View>
  );
};
```

---

## Testing & Validation

### Unit Tests

**File: `app/util/abTesting/__tests__/variantAssignment.test.ts`**

```typescript
import { assignVariant } from '../variantAssignment';
import { ABTestConfig } from '../types';

describe('variantAssignment', () => {
  const config: ABTestConfig = {
    testId: 'test',
    variants: [
      { id: 'control', weight: 50 },
      { id: 'variant_a', weight: 50 },
    ],
  };

  it('assigns same variant for same user', () => {
    const variant1 = assignVariant('user-123', config);
    const variant2 = assignVariant('user-123', config);
    expect(variant1).toBe(variant2);
  });

  it('distributes variants across users', () => {
    const variants = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const variant = assignVariant(`user-${i}`, config);
      variants.add(variant);
    }
    expect(variants.size).toBe(2); // Both variants should appear
  });

  it('respects weights', () => {
    const weightedConfig: ABTestConfig = {
      testId: 'weighted_test',
      variants: [
        { id: 'control', weight: 90 },
        { id: 'variant_a', weight: 10 },
      ],
    };

    const counts = { control: 0, variant_a: 0 };
    for (let i = 0; i < 1000; i++) {
      const variant = assignVariant(`user-${i}`, weightedConfig);
      counts[variant as keyof typeof counts]++;
    }

    // Should be roughly 900/100 (allow 10% variance)
    expect(counts.control).toBeGreaterThan(800);
    expect(counts.control).toBeLessThan(950);
  });
});
```

### Manual Testing

#### Test Variant Assignment

1. **Clear storage:**

```typescript
import { clearAssignment } from '@/util/abTesting/storage';
await clearAssignment('perps_button_colors_phase1');
```

2. **Force variant:**

```typescript
// For testing only - add override param to useABTest
const { variant } = useABTest(
  BUTTON_COLOR_TEST.testId,
  BUTTON_COLOR_TEST,
  { forceVariant: 'monochrome' }, // Testing only
);
```

3. **Check analytics:**
   - View Segment debugger
   - Verify `AB Test Assignment` event fired
   - Verify all interaction events include variant

### E2E Tests

```typescript
// e2e/specs/abTesting.spec.ts
describe('AB Testing - Button Colors', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should show control variant colors', async () => {
    // Navigate to Perps
    await element(by.id('perps-tab')).tap();
    await element(by.id('btc-asset')).tap();

    // Verify green/red buttons
    await expect(element(by.id('long-button'))).toHaveBackgroundColor('green');
    await expect(element(by.id('short-button'))).toHaveBackgroundColor('red');
  });

  it('should track button press with variant', async () => {
    // Mock analytics
    await device.setAnalyticsMock();

    // Press long button
    await element(by.id('long-button')).tap();

    // Verify event
    await expect(device.getLastAnalyticsEvent()).toEqual({
      event: 'AB Test Interaction',
      properties: expect.objectContaining({
        ab_test_id: 'perps_button_colors_phase1',
        ab_test_variant: expect.any(String),
      }),
    });
  });
});
```

---

## Best Practices

### 1. Always Use Feature Flags

❌ **Bad:**

```typescript
// Hardcoded test always runs
const variant = useABTest('my_test', config);
```

✅ **Good:**

```typescript
// Test controlled by feature flag
const { variant, isEnabled } = useABTest('my_test', config);

if (!isEnabled) {
  return <DefaultComponent />;
}

return <ABTestComponent variant={variant} />;
```

### 2. Track Everything

❌ **Bad:**

```typescript
// Only tracking assignment
const { variant } = useABTest('my_test', config);
return <TestComponent variant={variant} />;
```

✅ **Good:**

```typescript
// Track assignment, views, interactions, conversions with flat pattern
const { variant, isEnabled } = useABTest('my_test', config);

useEffect(() => {
  if (isEnabled) {
    trackEvent(MetaMetricsEvents.AB_TEST_INTERACTION, {
      ab_test_my_test: variant, // Flat pattern: test-specific property
      interaction_type: 'screen_view',
    });
  }
}, [variant, isEnabled]);

const handleClick = () => {
  if (isEnabled) {
    trackEvent(MetaMetricsEvents.AB_TEST_INTERACTION, {
      ab_test_my_test: variant, // Flat pattern
      // ... other properties
    });
  }
  // handle click
};

const handleConversion = () => {
  if (isEnabled) {
    trackEvent(MetaMetricsEvents.AB_TEST_CONVERSION, {
      ab_test_my_test: variant, // Flat pattern
      // ... other properties
    });
  }
  // handle conversion
};
```

### 3. Use TypeScript Strictly

❌ **Bad:**

```typescript
const variant: any = useABTest('my_test', config);
```

✅ **Good:**

```typescript
type ButtonColorVariant = 'control' | 'monochrome';

const { variant } = useABTest(
  BUTTON_COLOR_TEST.testId,
  BUTTON_COLOR_TEST,
) as ABTestResult & { variant: ButtonColorVariant };
```

### 4. Handle Loading States

❌ **Bad:**

```typescript
const { variant } = useABTest('my_test', config);
return <TestComponent variant={variant} />; // Flickers on load
```

✅ **Good:**

```typescript
const { variant, isLoading } = useABTest('my_test', config);

if (isLoading) {
  return <LoadingSpinner />;
}

return <TestComponent variant={variant} />;
```

### 5. Document Metrics

Always document what metrics you're tracking:

```typescript
/**
 * TAT-1937: Button Color Test
 *
 * Metrics:
 * - Trade initiation rate: % users opening trade screen after seeing asset
 * - Trade execution rate: % users placing trade after opening screen
 * - Misclick rate: % trades canceled/reversed within 10s
 * - Transaction speed: P1, P25, P50 duration from asset to button tap
 *
 * Events:
 * - AB Test Assignment: When variant assigned
 * - AB Test Interaction: asset_screen_view, long_button_press, short_button_press
 * - AB Test Conversion: trade_screen_opened, trade_executed
 */
export const BUTTON_COLOR_TEST: ABTestConfig = {
  /* ... */
};
```

### 6. Clean Up Old Tests

After test concludes, either:

**Option A: Remove test code**

```typescript
// Remove AB test, ship winning variant
const buttonSeverity = ButtonSemanticSeverity.Info; // Winner: Monochrome
```

**Option B: Keep flag for gradual rollout**

```typescript
// Keep flag to disable if issues arise
const isMonochromeEnabled = useSelector(selectMonochromeButtonsEnabled);
const buttonSeverity = isMonochromeEnabled
  ? ButtonSemanticSeverity.Info
  : ButtonSemanticSeverity.Success;
```

---

## Common Patterns

### Pattern 1: Simple UI Variant

```typescript
const { variant, isEnabled } = useABTest(TEST_CONFIG.testId, TEST_CONFIG);

if (!isEnabled) return <DefaultUI />;

return variant === 'control'
  ? <ControlUI />
  : <VariantUI />;
```

### Pattern 2: Style/Theme Variant

```typescript
const { variant } = useABTest(BUTTON_COLOR_TEST.testId, BUTTON_COLOR_TEST);

const styles = variant === 'monochrome'
  ? monochromeStyles
  : standardStyles;

return <Component style={styles} />;
```

### Pattern 3: Behavior Variant

```typescript
const { variant } = useABTest(CTA_TEST.testId, CTA_TEST);

const buttons = variant === 'replace_receive'
  ? [<Buy />, <Swap />, <Send />, <Perps />]
  : [<Buy />, <Swap />, <Send />, <Receive />];

return <ButtonRow>{buttons}</ButtonRow>;
```

### Pattern 4: Multi-Stage Conversion Tracking

```typescript
// Track full funnel with flat pattern
const { variant, isEnabled } = useABTest(TEST_CONFIG.testId, TEST_CONFIG);

// Stage 1: View
useEffect(() => {
  if (isEnabled) {
    trackEvent(MetaMetricsEvents.AB_TEST_INTERACTION, {
      ab_test_button_color: variant, // Flat pattern
      stage: 'asset_screen_view',
    });
  }
}, [isEnabled, variant]);

// Stage 2: Interaction
const handleButtonPress = () => {
  if (isEnabled) {
    trackEvent(MetaMetricsEvents.AB_TEST_INTERACTION, {
      ab_test_button_color: variant, // Flat pattern
      stage: 'button_press',
    });
  }
  navigate('TradeScreen');
};

// Stage 3: Conversion
const handleTradeExecuted = () => {
  if (isEnabled) {
    trackEvent(MetaMetricsEvents.AB_TEST_CONVERSION, {
      ab_test_button_color: variant, // Flat pattern
      stage: 'trade_executed',
    });
  }
};
```

---

## Troubleshooting

### Issue: Variant keeps changing

**Cause:** User ID not stable
**Solution:** Ensure metaMetricsId is used and persisted

### Issue: Feature flag not working

**Cause:** Flag name mismatch
**Solution:** Check `featureFlagName` matches backend config

### Issue: Events not firing

**Cause:** Missing analytics initialization
**Solution:** Verify MetaMetrics is initialized before using AB test

### Issue: Uneven distribution

**Cause:** Hash collision or small sample
**Solution:** Test with larger user base (1000+ users)

---

## Next Steps

1. **Implement infrastructure:**
   - Create files in `app/util/abTesting/`
   - Add events to MetaMetrics
   - Update RemoteFeatureFlagController config

2. **Start with TAT-1937 (Button Colors):**
   - Lowest risk test
   - Clear variants
   - Easy to measure

3. **Expand to other tests:**
   - TAT-1940 (Asset Details CTA)
   - TAT-1827 (Homepage CTA)

4. **Monitor & iterate:**
   - Track metrics in Mixpanel/Segment
   - Analyze after 2 weeks
   - Ship winning variant
