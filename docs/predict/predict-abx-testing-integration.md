# Predictions A/B/X Testing: Segment Integration

## Background

The codebase has a generic `useABTest` hook (`app/hooks/useABTest.ts`) built by the swaps team that handles:

- Automatic `Experiment Viewed` exposure events to Segment, deduplicated once per session
- `active_ab_tests` array on business events, which is already a global field in the Segment schema (`metamask-mobile-globals`). No per-experiment schema PRs needed.
- Multi-variant support (A/B/C/D/etc.) out of the box

This doc covers how to use it for Predictions features.

## Steps per experiment

### 1. Create the LaunchDarkly flag

Create a **JSON** flag with a threshold array.

Name format: `predict{TICKET_ID}Abtest{TestName}`, e.g. `predictPRED533AbtestFeaturedCarousel`

Two variants (A/B):

```json
[
  {
    "name": "control",
    "scope": { "type": "percentage_rollout", "value": 0.5 }
  },
  {
    "name": "treatment",
    "scope": { "type": "percentage_rollout", "value": 1.0 }
  }
]
```

Three+ variants (A/B/C):

```json
[
  {
    "name": "control",
    "scope": { "type": "percentage_rollout", "value": 0.33 }
  },
  {
    "name": "variantA",
    "scope": { "type": "percentage_rollout", "value": 0.66 }
  },
  {
    "name": "variantB",
    "scope": { "type": "percentage_rollout", "value": 1.0 }
  }
]
```

Bucketing is deterministic. The app computes `SHA256(metametricsId + flagName)` to get a threshold between 0-1, then picks the first variant whose `scope.value` is >= that threshold.

### 2. Create a config file

Add `*.abTestConfig.ts` next to the feature component:

```typescript
// FeaturedCarousel.abTestConfig.ts

export const FEATURED_CAROUSEL_AB_KEY = 'predictPRED533AbtestFeaturedCarousel';

export const FEATURED_CAROUSEL_VARIANTS = {
  control: { showCarousel: false },
  treatment: { showCarousel: true },
  // add more keys for A/B/C/D
};
```

The `control` key is required. It's the fallback when the flag is missing or invalid.

### 3. Use in your component

```typescript
import { useABTest } from '../../../../hooks';
import {
  FEATURED_CAROUSEL_AB_KEY,
  FEATURED_CAROUSEL_VARIANTS,
} from './FeaturedCarousel.abTestConfig';

const { variant, variantName, isActive } = useABTest(
  FEATURED_CAROUSEL_AB_KEY,
  FEATURED_CAROUSEL_VARIANTS,
);

// `variant` is typed to your config shape
// `isActive` is true when LD returned a valid variant
// `Experiment Viewed` fires to Segment automatically (once per session, deduplicated)
```

### 4. Attach experiment context to business events

Add `active_ab_tests` to any event where you need to know which variant the user was in:

```typescript
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const { trackEvent, createEventBuilder } = useAnalytics();

trackEvent(
  createEventBuilder(MetaMetricsEvents.SOME_PREDICT_EVENT)
    .addProperties({
      screen: 'predict_feed',
      ...(isActive && {
        active_ab_tests: [
          { key: FEATURED_CAROUSEL_AB_KEY, value: variantName },
        ],
      }),
    })
    .build(),
);
```

Multiple experiments on the same event:

```typescript
const carousel = useABTest(
  FEATURED_CAROUSEL_AB_KEY,
  FEATURED_CAROUSEL_VARIANTS,
);
const sportsUI = useABTest(SPORTS_UI_AB_KEY, SPORTS_UI_VARIANTS);

const activeTests = [
  ...(carousel.isActive
    ? [{ key: FEATURED_CAROUSEL_AB_KEY, value: carousel.variantName }]
    : []),
  ...(sportsUI.isActive
    ? [{ key: SPORTS_UI_AB_KEY, value: sportsUI.variantName }]
    : []),
];

trackEvent(
  createEventBuilder(MetaMetricsEvents.SOME_PREDICT_EVENT)
    .addProperties({
      screen: 'predict_feed',
      ...(activeTests.length > 0 && { active_ab_tests: activeTests }),
    })
    .build(),
);
```

### 5. (Optional) Add human-readable exposure metadata

The hook accepts an optional third argument that adds readable names to the `Experiment Viewed` event in Segment. Not required, but makes dashboards easier to parse:

```typescript
const { variant, variantName, isActive } = useABTest(
  FEATURED_CAROUSEL_AB_KEY,
  FEATURED_CAROUSEL_VARIANTS,
  {
    experimentName: 'Featured Carousel',
    variationNames: {
      control: 'No Carousel',
      treatment: 'Carousel Enabled',
    },
  },
);
```

This adds `experiment_name` and `variation_name` fields to the exposure event alongside the IDs.

## What Segment receives

**Exposure event (automatic, from the hook):**

```json
{
  "event": "Experiment Viewed",
  "properties": {
    "experiment_id": "predictPRED533AbtestFeaturedCarousel",
    "variation_id": "treatment"
  }
}
```

Fires once per experiment+variant combo per app session.

**Business events (from your code):**

```json
{
  "event": "Some Predict Event",
  "properties": {
    "screen": "predict_feed",
    "active_ab_tests": [
      { "key": "predictPRED533AbtestFeaturedCarousel", "value": "treatment" }
    ]
  }
}
```

`active_ab_tests` is already defined in the Segment global schema. No additional schema PRs needed.

## Local testing

The `RemoteFeatureFlagController` supports local overrides, so you can force a variant without configuring anything in LaunchDarkly. In the debug/dev settings, you can override any feature flag value locally. The selector merges local overrides on top of remote flags:

```typescript
// from app/selectors/featureFlagController/index.ts
return {
  ...remoteFeatureFlags,
  ...localOverrides, // local wins
};
```

If you need to quickly test a specific variant during development, you can also temporarily hardcode the flag value in Redux state or use the feature flag debug UI.

## Checklist

- [ ] LD JSON flag created with threshold array
- [ ] `*.abTestConfig.ts` with flag key and variants (must include `control`)
- [ ] `useABTest()` called in the feature component
- [ ] Business events include `active_ab_tests` when `isActive`
- [ ] Run compliance check: `bash .agents/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged`

## References

- Hook: `app/hooks/useABTest.ts`
- Framework docs: `docs/ab-testing.md`
- Example config: `app/components/UI/Bridge/components/TokenSelectorItem.abTestConfig.ts`
- Example multi-test event: `app/components/UI/Bridge/hooks/useTrackSwapPageViewed/index.ts`
- PRs: [#25541](https://github.com/MetaMask/metamask-mobile/pull/25541) (hook), [#26438](https://github.com/MetaMask/metamask-mobile/pull/26438) (exposure event), [#27690](https://github.com/MetaMask/metamask-mobile/pull/27690) (real example)
