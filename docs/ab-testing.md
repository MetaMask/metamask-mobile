# A/B Testing Framework

Generic A/B testing for MetaMask Mobile.

**References:**

- [Remote Feature Flags Documentation](https://github.com/MetaMask/contributor-docs/blob/main/docs/remote-feature-flags.md)

---

## How It Works

MetaMask does **NOT use LaunchDarkly's percentage rollout targeting**. Instead, thresholds are defined **inside the variant value**, and the app does its own bucketing:

1. **LD returns array with thresholds in variant** — each element has `scope.value` (0-1)
2. **App hashes** `SHA256(metametricsId + flagName)` → deterministic value 0-1
3. **App selects variant** — first element where `userThreshold <= scope.value`

**Flag value structure:**

```json
[
  { "name": "control", "scope": { "type": "percentage_rollout", "value": 0.5 }, "value": {...} },
  { "name": "treatment", "scope": { "type": "percentage_rollout", "value": 1.0 }, "value": {...} }
]
```

**Selection logic:** User threshold = 0.45 → 0.45 <= 0.5? YES → `control` selected

> **Key:** Thresholds are IN the variant. App does bucketing via `@metamask/remote-feature-flag-controller`. We do NOT use LD's native percentage rollout targeting.

### How the Controller Detects A/B Test Flags

The `RemoteFeatureFlagController` identifies flags that need bucketing by checking if the value is an **array of objects with a `scope` property**:

```javascript
// Controller checks: is it an object with a 'scope' property?
{ name: "control", scope: { value: 0.5 }, value: {...} }  // ✓ Triggers bucketing
{ enabled: true, minimumVersion: "7.0.0" }                 // ✗ Simple flag, no bucketing
```

When detected, the controller:

1. Computes `sha256(metametricsId + flagName)` → deterministic threshold (0-1)
2. Finds first array item where `threshold <= scope.value`
3. Stores the selected variant's `name` in `state.remoteFeatureFlags`

The `scope.type` field (e.g., `"percentage_rollout"`) is metadata only - the controller just checks for presence of `scope`.

---

## The Hook

The generic `useABTest` hook provides a simple, type-safe interface for A/B testing:

```typescript
// app/hooks/useABTest.ts

import { useABTest } from '../hooks';

const { variant, variantName, isActive } = useABTest('buttonColorTest', {
  control: { color: 'green' },
  treatment: { color: 'blue' },
});
```

### API Reference

```typescript
function useABTest<T extends Record<string, unknown>>(
  flagKey: string,
  variants: T,
): {
  variant: T[keyof T]; // The variant data for the assigned variant
  variantName: string; // The name of the assigned variant (e.g., 'control')
  isActive: boolean; // Whether the A/B test is active
};
```

**Parameters:**

- `flagKey` - The feature flag key in LaunchDarkly (camelCase, e.g., `'buttonColorTest'`)
- `variants` - Object mapping variant names to their data

**Returns:**

- `variant` - The data object for the assigned variant
- `variantName` - Name of the assigned variant (e.g., `'control'`, `'treatment'`)
- `isActive` - `true` if the flag is set AND matches a valid variant; `false` otherwise

---

## Usage

### Basic Usage

```typescript
import { useABTest } from '../hooks';

const MyComponent = () => {
  const { variant, variantName, isActive } = useABTest('buttonColorTest', {
    control: { color: 'green' },
    treatment: { color: 'blue' },
  });

  return (
    <Button color={variant.color}>
      Submit
    </Button>
  );
};
```

### Tracking with Analytics

Track events with a single `ab_tests` JSON property (no per-test schema changes after initial setup):

```typescript
import { useABTest } from '../hooks';
import { useAnalytics } from '../components/hooks/useAnalytics';
import { MetaMetricsEvents } from '../core/Analytics';

const MyComponent = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { variant, variantName, isActive } = useABTest('buttonColorTest', {
    control: { color: 'green' },
    treatment: { color: 'blue' },
  });

  const handlePress = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SCREEN_VIEWED)
        .addProperties({
          screen: 'details',
          ...(isActive && { ab_tests: { button_color: variantName } }),
        })
        .build()
    );
  };

  return <Button onPress={handlePress} color={variant.color}>Submit</Button>;
};
```

### Multiple Concurrent Tests

```typescript
const buttonTest = useABTest('buttonColorTest', {
  control: { color: 'green' },
  treatment: { color: 'blue' },
});

const ctaTest = useABTest('ctaTextTest', {
  control: { text: 'Get Started' },
  urgent: { text: 'Start Now!' },
});

trackEvent(
  createEventBuilder(MetaMetricsEvents.SCREEN_VIEWED)
    .addProperties({
      ab_tests: {
        ...(buttonTest.isActive && { button_color: buttonTest.variantName }),
        ...(ctaTest.isActive && { cta_text: ctaTest.variantName }),
      },
    })
    .build(),
);
```

---

## LaunchDarkly Setup

Thresholds are defined **inside the variation value** as an array. Do NOT use LD's percentage rollout targeting.

### Step 1: Create the Flag

1. LaunchDarkly → Feature Flags → Create Flag
2. **Name:** `{team}{TestName}` (e.g., `swapsAbtestQuoteLayout`)
3. **Flag type:** JSON
4. **Client-side SDK availability:** Check "SDKs using Mobile Key"

### Step 2: Define Variation Value with Thresholds

The variation value is an **array** with cumulative thresholds:

```json
[
  {
    "name": "control",
    "scope": { "type": "percentage_rollout", "value": 0.5 },
    "value": { "buttonColor": "green" }
  },
  {
    "name": "treatment",
    "scope": { "type": "percentage_rollout", "value": 1.0 },
    "value": { "buttonColor": "blue" }
  }
]
```

**Threshold math:**

- `scope.value: 0.5` → users with hash 0-0.5 (50%)
- `scope.value: 1.0` → users with hash 0.5-1.0 (remaining 50%)

For 3 variants (33% each): 0.33, 0.66, 1.0

### Step 3: Configure Targeting

- **Default rule:** Serve the variation (single variation with threshold array)
- **When targeting is OFF:** Serve fallback variation

### Step 4: Enable

Toggle targeting ON. The `RemoteFeatureFlagController` handles bucketing automatically.

---

## Adding a New Test (Summary)

1. **Create LaunchDarkly flag** (JSON type, threshold array in variation)
2. **Define cumulative thresholds** in `scope.value` (0.5, 1.0 for 50/50)
3. **Add hook to component:**

```typescript
const { variant, variantName, isActive } = useABTest('swapsQuoteLayout', {
  control: { showFees: false },
  expanded: { showFees: true },
});
```

4. **Track events:**

```typescript
trackEvent(
  createEventBuilder(MetaMetricsEvents.QUOTE_VIEWED)
    .addProperties({
      ...(isActive && { ab_tests: { quote_layout: variantName } }),
    })
    .build(),
);
```

5. **Build Mixpanel funnel** — Filter by `ab_tests.quote_layout`

---

## Mixpanel Queries

Filter by nested property:

```
// Funnel step filter
ab_tests.button_color == "control"

// Breakdown
ab_tests.button_color
```

---

## Manual Mixpanel Dashboard Setup

### 1. Create a New Board

- Boards → Create Board → Name: `[Test Name] A/B Analysis`

### 2. Add Funnel Report

- New Report → Funnel
- Define conversion steps (e.g., Screen Viewed → Button Clicked → Transaction Completed)
- Filter: `ab_tests.[your_test_name]` is set
- Breakdown: `ab_tests.[your_test_name]`

### 3. Add Conversion Over Time

- New Report → Insights
- Metric: Conversion rate from your funnel
- Breakdown: `ab_tests.[your_test_name]`

### 4. Add Sample Size Tracker

- New Report → Insights → Event: Your entry event
- Breakdown: `ab_tests.[your_test_name]` → Display as: Total count

### 5. Statistical Significance

- Use Funnel report, compare variants side-by-side
- Look for 95%+ confidence before calling winner

---

---

## FAQ

**Q: How does bucketing work?**
`RemoteFeatureFlagController` hashes `SHA256(metametricsId + flagName)` → value 0-1. Selects first variant where `userThreshold <= scope.value`.

**Q: Why don't we use LD's percentage rollout?**
Thresholds are defined in the variant value itself. App-side controller does bucketing. This gives us control and consistency across platforms.

**Q: Do I need a Segment schema PR for each test?**
No. The `ab_tests` object accepts any keys. Define once, use forever.

**Q: What if user opts out of MetaMetrics?**
No `metametricsId` → controller returns array unchanged → no variant selection.

**Q: What does `isActive` mean?**
`isActive` is `true` when the flag is set AND matches a valid variant. It's `false` when using the fallback (flag not set or invalid).

---

## Related Files

- **Generic Hook:** `app/hooks/useABTest.ts`
- **Generic Hook Tests:** `app/hooks/useABTest.test.ts`
- **Hooks Index:** `app/hooks/index.ts`
- **Feature Flag Selector:** `app/selectors/featureFlagController/index.ts`
