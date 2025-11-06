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
  featureFlagKey: 'perpButtonColorTestEnabled',
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
    const remoteFlag = remoteFeatureFlags?.perpButtonColorTestEnabled;
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
    localOverride: process.env.MM_PERPS_BUTTON_COLOR_VARIANT, // Optional
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

### Override Variant for Testing

Set environment variable:

```bash
MM_PERPS_BUTTON_COLOR_VARIANT=monochrome
```

Or update `.env`:

```
MM_PERPS_BUTTON_COLOR_VARIANT=monochrome
```

The hook will prioritize local override over LaunchDarkly value.

## LaunchDarkly Configuration

### Backend Team Setup

1. **Create feature flag**: `perpButtonColorTestEnabled`
2. **Configure variations**:
   - Variation 0: `"control"`
   - Variation 1: `"monochrome"`
3. **Set targeting rules**:
   - 50% rollout to variation 0
   - 50% rollout to variation 1
4. **Version constraint**: `>=7.60.0`

### Flag Structure

**Simple (string):**

```json
{
  "perpButtonColorTestEnabled": "control"
}
```

**Version-gated (object):**

```json
{
  "perpButtonColorTestEnabled": {
    "enabled": true,
    "minAppVersion": "7.60.0",
    "variant": "control"
  }
}
```

Both formats are supported by the selector.

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
  featureFlagKey: 'perpMyTestEnabled',
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
  (flags): string | null => flags?.perpMyTestEnabled || null,
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

1. **Manual Testing**: Test both variants locally using env var override
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
A: Use `MM_PERPS_BUTTON_COLOR_VARIANT=control` or `=monochrome` env var.

**Q: Can I add unit tests?**
A: Yes, but we're validating manually first. Add tests later if needed.

**Q: What if LaunchDarkly is down?**
A: The selector returns `null`, and the hook falls back to the first variant (control).

## References

- LaunchDarkly Documentation: https://docs.launchdarkly.com/
- Perps Event Properties: `constants/eventNames.ts`
- Feature Flags: `selectors/featureFlags/index.ts`
