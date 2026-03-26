# Perps A/B/X Testing: Segment Integration

## Background

Perps has `usePerpsABTest` for reading LD string flags and mapping them to variant data, and `usePerpsEventTracking` for firing events. Both work fine.

Two gaps exist on the Segment side:

1. No `Experiment Viewed` exposure event. Data science needs this to measure who saw each variant.
2. Flat `ab_test_*` event properties require a Segment schema PR per experiment. This is the `protocols.omitted` problem from `perps-ab-testing.md`.

## Recommendation

Use the canonical `useABTest` hook (`app/hooks/useABTest.ts`) for new experiments. It handles both gaps:

- Fires `Experiment Viewed` automatically, deduplicated once per session
- Uses the `active_ab_tests` array, which is already a global field in the Segment schema (`metamask-mobile-globals`). No per-experiment schema PRs.

Existing experiments on `usePerpsABTest` can stay as-is.

## Steps per experiment

### 1. Create the LaunchDarkly flag

Create a **JSON** flag (not string, which is the main difference from the current Perps pattern).

Name format: `perps{TICKET_ID}Abtest{TestName}`, e.g. `perpsPRED533AbtestFeaturedCarousel`

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

export const FEATURED_CAROUSEL_AB_KEY = 'perpsPRED533AbtestFeaturedCarousel';

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
const { track } = usePerpsEventTracking();

track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
  screen_type: 'predict_feed',
  ...(isActive && {
    active_ab_tests: [{ key: FEATURED_CAROUSEL_AB_KEY, value: variantName }],
  }),
});
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

track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
  screen_type: 'predict_feed',
  ...(activeTests.length > 0 && { active_ab_tests: activeTests }),
});
```

## What Segment receives

**Exposure event (automatic, from the hook):**

```json
{
  "event": "Experiment Viewed",
  "properties": {
    "experiment_id": "perpsPRED533AbtestFeaturedCarousel",
    "variation_id": "treatment"
  }
}
```

Fires once per experiment+variant combo per app session.

**Business events (from your code):**

```json
{
  "event": "Perps Screen Viewed",
  "properties": {
    "screen_type": "predict_feed",
    "active_ab_tests": [
      { "key": "perpsPRED533AbtestFeaturedCarousel", "value": "treatment" }
    ]
  }
}
```

`active_ab_tests` is already defined in the Segment global schema. No additional schema PRs needed.

## Differences from `usePerpsABTest`

|                  | `usePerpsABTest` (current)      | `useABTest` (canonical)         |
| ---------------- | ------------------------------- | ------------------------------- |
| LD flag type     | String                          | JSON threshold array            |
| Exposure event   | None                            | Automatic (`Experiment Viewed`) |
| Event properties | Flat `ab_test_*` per experiment | `active_ab_tests` array         |
| Segment schema   | PR per experiment               | Already global                  |
| Multi-variant    | Yes                             | Yes                             |
| Fallback         | First variant key               | `control` key                   |

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
