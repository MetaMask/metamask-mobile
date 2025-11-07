# Perps A/B Testing Framework

Simplified A/B testing implementation for Perps, leveraging LaunchDarkly for user identification, variant assignment, and persistence.

## Overview

This framework provides a simple way to run A/B tests in Perps components. LaunchDarkly handles the complex parts:

- User identification and tracking
- Variant assignment (deterministic per user)
- Persistence across sessions
- Remote control and rollout
- Analytics tracking

We just read the variant and apply it.

## Architecture

```
LaunchDarkly (Remote)
    ↓ Returns variant name ('control' | 'monochrome')
Feature Flag Selector (selectPerpsButtonColorTestVariant)
    ↓
usePerpsABTest Hook
    ↓ Returns variant data (e.g., button colors)
Component (PerpsOrderView)
```

## File Structure

```
abTesting/
├── types.ts              # TypeScript interfaces
├── usePerpsABTest.ts     # Main hook for reading variants
├── tests.ts              # Test configurations (BUTTON_COLOR_TEST)
└── README.md             # This file
```

## Usage

### 1. Define Test Configuration

In `tests.ts`:

```typescript
export const BUTTON_COLOR_TEST: ABTestConfig<ButtonColorTestVariants> = {
  testId: 'button_color_test',
  featureFlagKey: 'perpsButtonColorTestEnabled',
  description: 'Tests impact of button colors on trading behavior',
  minVersion: '7.60.0',
  variants: {
    control: {
      weight: 50, // Informational only
      data: { long: 'green', short: 'red' },
    },
    monochrome: {
      weight: 50, // Informational only
      data: { long: 'white', short: 'white' },
    },
  },
};
```

### 2. Create Feature Flag Selector

In `selectors/featureFlags/index.ts`:

```typescript
export const selectPerpsButtonColorTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string | null => {
    const remoteFlag = remoteFeatureFlags?.perpsButtonColorTestEnabled;
    // Returns 'control' | 'monochrome' | null
    return remoteFlag || null;
  },
);
```

### 3. Use Hook in Component

```typescript
import { usePerpsABTest } from '../../utils/abTesting/usePerpsABTest';
import { BUTTON_COLOR_TEST } from '../../utils/abTesting/tests';
import { selectPerpsButtonColorTestVariant } from '../../selectors/featureFlags';

const MyComponent = () => {
  // Read variant from LaunchDarkly
  const {
    variant: buttonColors,     // { long: 'green', short: 'red' }
    variantName,               // 'control' | 'monochrome'
    isEnabled                  // true if test is active
  } = usePerpsABTest({
    test: BUTTON_COLOR_TEST,
    featureFlagSelector: selectPerpsButtonColorTestVariant,
  });

  // Apply variant
  return (
    <ButtonSemantic
      severity={getButtonSeverityForDirection(direction, buttonColors)}
    />
  );
};
```

### 4. Track Events with Variant Context

```typescript
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_UI_INTERACTION,
  properties: {
    // ... other properties
    [PerpsEventProperties.AB_TEST_ID]: isEnabled
      ? PerpsEventValues.AB_TEST.BUTTON_COLOR_TEST
      : undefined,
    [PerpsEventProperties.AB_TEST_VARIANT]: isEnabled ? variantName : undefined,
    [PerpsEventProperties.AB_TEST_ENABLED]: isEnabled,
  },
});
```

## Local Development

### Testing Variants Locally

**Method 1: Dev Info Banner (Read-Only)**

- In DEV builds, see a blue banner at the top of Perps screens
- Shows current variant, source (LaunchDarkly/Fallback), and raw flag value
- Read-only informational display - no interaction needed

**Method 2: Temporary Hardcode (For Testing)**
For quick local testing, temporarily hardcode the variant in the component:

```typescript
// In PerpsOrderView.tsx or PerpsMarketDetailsView.tsx
// Temporarily override for testing - REMOVE BEFORE COMMIT!
const buttonColorVariant = 'monochrome'; // Force specific variant
// Comment out the actual hook call while testing
```

**Important:** Always remove hardcoded overrides before committing!

## LaunchDarkly Configuration

### Backend Team Setup

**IMPORTANT: Use String flag type for AB tests, not Boolean or JSON**

1. **Create feature flag**: `perps-button-color-test-enabled` (kebab-case in LaunchDarkly UI)
2. **Select flag type**: **String** (not Boolean, not JSON)
3. **Configure string variations**:
   - Variation 0: Name: `Control`, Value: `control` (lowercase string)
   - Variation 1: Name: `Monochrome`, Value: `monochrome` (lowercase string)
4. **Set targeting rules**:
   - Rule 1: 50% percentage rollout → `control`
   - Rule 2: 50% percentage rollout → `monochrome`
   - Optional: Add version constraint via custom rule: `appVersion >= 7.60.0`
5. **Default variations**:
   - When targeting ON: `control`
   - When targeting OFF: (flag disabled)

### What the App Receives

LaunchDarkly returns a simple string value:

```typescript
// What Redux state looks like
{
  RemoteFeatureFlagController: {
    remoteFeatureFlags: {
      perpsButtonColorTestEnabled: 'control'; // or "monochrome"
    }
  }
}
```

The selector (`selectPerpsButtonColorTestVariant`) reads this value as-is and returns:

- `"control"` → Green/Red buttons
- `"monochrome"` → White/White buttons
- `null` → Test disabled, fall back to default

## Adding New Tests

### 1. Define variant data type in `types.ts`:

```typescript
export interface MyTestVariant {
  myProperty: string;
}
```

### 2. Create test config in `tests.ts`:

```typescript
export const MY_TEST: ABTestConfig<{
  control: ABTestVariant<MyTestVariant>;
  treatment: ABTestVariant<MyTestVariant>;
}> = {
  testId: 'my_test',
  featureFlagKey: 'perpsMyTestEnabled',
  variants: {
    control: { weight: 50, data: { myProperty: 'value1' } },
    treatment: { weight: 50, data: { myProperty: 'value2' } },
  },
};
```

### 3. Add feature flag selector:

```typescript
export const selectPerpsMyTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (flags): string | null => flags?.perpsMyTestEnabled || null,
);
```

### 4. Add event constants in `constants/eventNames.ts`:

```typescript
AB_TEST: {
  MY_TEST: 'my_test',
  // variants...
}
```

### 5. Use in component:

```typescript
const { variant, variantName, isEnabled } = usePerpsABTest({
  test: MY_TEST,
  featureFlagSelector: selectPerpsMyTestVariant,
});
```

## Testing Strategy

1. **Manual Testing**: Test both variants locally using temporary hardcoded overrides
2. **QA Validation**: Validate in staging environment
3. **Gradual Rollout**: Start with small percentage, monitor metrics
4. **Data Collection**: Track for 2-4 weeks minimum
5. **Analysis**: Compare metrics between variants
6. **Decision**: Roll out winning variant to 100%

## Current Tests

### TAT-1937: Button Color Test

**Goal**: Determine which button colors drive better trading behavior

**Variants**:

- **Control**: Green (long) / Red (short) - traditional
- **Monochrome**: White (both) - neutral, reduces anxiety

**Metrics**:

- Trade initiation rate
- Trade execution rate
- Misclick rate
- Time to execution

**Duration**: 2-4 weeks
**Distribution**: 50/50

## FAQ

**Q: Why not use the original implementation with storage?**
A: LaunchDarkly already handles user identification, assignment, and persistence. No need to duplicate this logic.

**Q: What do the weights mean?**
A: They're informational only. LaunchDarkly controls actual distribution.

**Q: How do I test both variants locally?**
A: Temporarily hardcode the variant in the component (see "Local Development" section above). Remember to remove before committing!

**Q: Can I add unit tests?**
A: Yes, but we're validating manually first. Add tests later if needed.

**Q: What if LaunchDarkly is down?**
A: The selector returns `null`, and the hook falls back to the first variant (control).

**Q: Why use String flag type instead of JSON?**
A: For AB tests, string variants are simpler and cleaner. LaunchDarkly handles user assignment and persistence. JSON format with version gating is better for feature flags that need per-variant version requirements, not for AB tests.

## References

- LaunchDarkly Documentation: https://docs.launchdarkly.com/
- Perps Event Properties: `constants/eventNames.ts`
- Feature Flags: `selectors/featureFlags/index.ts`
