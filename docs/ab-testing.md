# A/B Testing Framework

Generic A/B testing guidance for MetaMask Mobile.

## Current Analytics Standard

Use these two mechanisms together:

1. **Exposure event (automatic):** `Experiment Viewed`
2. **Business events context (automatic on allowlisted events):** `active_ab_tests`

- Events sent through `analytics.trackEvent`, `useAnalytics().trackEvent`, or the `trackEvent()` util in `app/core/Engine/utils/analytics.ts` are auto-enriched. If an event bypasses those wrappers, attach `active_ab_tests` manually. See example below in the "Concrete Example" section.

`ab_tests` is legacy and should not be used for new payload additions.

## References

- [Remote Feature Flags Documentation](https://github.com/MetaMask/contributor-docs/blob/main/docs/remote-feature-flags.md)

## Agent Skill Entrypoint

For agent workflows, this document is the SSOT. Supporting entrypoints:

- Codex skill: `.agents/skills/ab-testing-implementation/SKILL.md` (`$ab-testing-implementation`)
- Claude skill: `.claude/skills/ab-testing-implementation/SKILL.md`
- Compliance check: `bash .agents/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged`

## Agent Execution Standard (SSOT)

For agent implementation/review tasks, follow this workflow exactly:

1. Run discovery before edits:

```bash
rg -n "useABTest\\(|active_ab_tests|ab_tests|Abtest|abTestConfig" app docs tests
rg -n "Experiment Viewed|EXPERIMENT_VIEWED" app
```

2. Keep test config centralized in a dedicated config module (`abTestConfig.ts` pattern).
3. Use `useABTest(flagKey, variants)` and normalize unresolved assignments to `control`.
4. Do not manually emit `Experiment Viewed` when using `useABTest`.
5. For business events, follow the path defined in Current Analytics Standard: use allowlisted registry-based injection on the shared wrapper path, or attach `active_ab_tests` manually on the custom tracker path.
6. Do not add new payloads under `ab_tests`.
   - Compliance checker behavior is strict at diff-line level: adding any `ab_tests:` line in changed code fails by default.
   - For rare legacy touchpoints that cannot be migrated in the same change, use `LEGACY_AB_TEST_ALLOWED` on the line and include rationale in PR/agent output.
7. Use risk-based test scope:
   - If behavior or analytics integration changed, add/update tests.
   - If change is copy/config-only, you may skip new tests with a brief rationale.
8. Run compliance check:

```bash
bash .agents/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged
```

Required agent response sections:

1. `Implementation Checklist`
2. `Files To Modify`
3. `Analytics Payload Changes`
4. `Tests To Run`
5. `Compliance Check Result`

---

## How Variant Assignment Works

MetaMask Mobile does not use LaunchDarkly native percentage rollout rules for assignment. The app buckets users from a JSON array value:

1. LaunchDarkly returns an array where each item has `scope.value` (0-1).
2. App computes `sha256(metametricsId + flagName)` to get deterministic threshold 0-1.
3. App picks first variant where `userThreshold <= scope.value`.

Flag value example:

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

The controller stores `{ name, value }` in `RemoteFeatureFlagController.remoteFeatureFlags`. `useABTest` reads `name`.

---

## `useABTest` Hook

Generic examples below use template-style keys; see SWAPS4135 section for a concrete implementation.

```typescript
import { useABTest } from '../hooks';

const { variant, variantName, isActive } = useABTest(
  'teamTEAM1234AbtestButtonColor',
  {
    control: { color: 'green' },
    treatment: { color: 'blue' },
  },
  {
    experimentName: 'Button Color Test',
    variationNames: {
      control: 'Green button color',
      treatment: 'Blue button color',
    },
  },
);
```

API:

```typescript
function useABTest<T extends { control: unknown } & Record<string, unknown>>(
  flagKey: string,
  variants: T,
  exposureMetadata?: {
    experimentName?: string;
    variationNames?: Partial<Record<Extract<keyof T, string>, string>>;
  },
): {
  variant: T[keyof T];
  variantName: string;
  isActive: boolean;
};
```

Behavior:

- Fallback is always `control` when flag is missing/invalid.
- `isActive` is `true` only when flag value matches a defined variant.
- When active, the hook automatically emits `Experiment Viewed` once per `experiment_id + variation_id` per app session.

---

## Automatic Exposure Event (`Experiment Viewed`)

The hook emits:

- `event`: `Experiment Viewed`
- Required props:
  - `experiment_id` (flag key)
  - `variation_id` (`control`, `treatment`, etc.)
- Optional props:
  - `experiment_name`
  - `variation_name`

You do not need to manually track this event when using `useABTest`.

---

## Business Event Instrumentation (`active_ab_tests`)

For feature/business events (page view, click, submit, conversion): declare attributable event names in the test config module, add that mapping to the shared analytics registry, and let the wrappers inject active assignments automatically.

```typescript
import { EVENT_NAME } from '../core/Analytics/MetaMetrics.events';

export const FEATURE_AB_TEST_ANALYTICS_MAPPING = {
  flagKey: FEATURE_AB_TEST_KEY,
  validVariants: Object.values(FeatureVariant),
  eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED, EVENT_NAME.ACTION_BUTTON_CLICKED],
} as const;
```

---

## Segment Schema Contract

Canonical global field is `active_ab_tests` (from `metamask-mobile-globals`):

```yaml
active_ab_tests:
  type: array
  required: false
  items:
    type: object
    required: [key, value]
    properties:
      key:
        type: string
      value:
        type: string
```

Implication:

- No explicit per-test key like `ab_tests.someTest` should be emitted.
- New tests should use the generic `active_ab_tests` array shape.

---

## Migration from legacy `ab_tests`

1. Remove per-test `ab_tests.*` emits from business events.
2. Replace manual business-event A/B payload wiring with the correct path from Current Analytics Standard: registry-based auto-injection (or manual property addition for events that don't use shared analytics wrappers)
3. Keep `Experiment Viewed` exposure sourced from `useABTest` (do not manually emit duplicates).
4. Validate no payload contains `ab_tests.<experiment_key>`.
5. Validate each `active_ab_tests` item always contains both `key` and `value` strings.

Before/after payload example:

```typescript
// Before
trackEvent(
  createEventBuilder(EVENT_NAME.SWAP_PAGE_VIEWED)
    .addProperties({
      ab_tests: {
        swapsSWAPS4135AbtestNumpadQuickAmounts: 'control',
      },
    })
    .build(),
);

// After
export const NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING = {
  flagKey: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
  validVariants: ['control', 'treatment'],
  eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED],
} as const;

trackEvent(
  createEventBuilder(EVENT_NAME.SWAP_PAGE_VIEWED)
    .addProperties({
      view: 'swap',
    })
    .build(),
);
```

Note: legacy historical docs/tests may still mention `ab_tests`; the goal is no new payload additions using it.

If you must touch a legacy `ab_tests` line before full migration, mark it with `LEGACY_AB_TEST_ALLOWED` and include a migration rationale.

---

## LaunchDarkly Setup

1. Create JSON flag.
2. Name format: `{team name}{ticket ID}Abtest{test name}`.
   - Team name prefix: lower camel team token (for example `swaps`).
   - Ticket ID: uppercase project key + number (for example `SWAPS4135`).
   - Literal segment: exact `Abtest`.
   - Test name: PascalCase semantic name (for example `NumpadQuickAmounts`).
   - Example: `swapsSWAPS4135AbtestButtonColor`
3. Enable mobile SDK availability.
4. Configure variation value as threshold array:

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

Use default targeting rule to serve this variation value.

---

## Concrete Example

- Flag key: `swapsSWAPS4135AbtestNumpadQuickAmounts`
- `Experiment Viewed`:
  - `experiment_id = "swapsSWAPS4135AbtestNumpadQuickAmounts"`
  - `variation_id = "control" | "treatment"`
- Business events use mixed attribution paths:
  - `SWAP_PAGE_VIEWED` is allowlisted and auto-enriched through the shared wrappers.
  - `Unified SwapBridge Input Changed` bypasses the shared wrappers because it exists in the bridge controller, so it still attaches `active_ab_tests` manually.

```typescript
export const NUMPAD_QUICK_ACTIONS_AB_TEST_ANALYTICS_MAPPING = {
  flagKey: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
  validVariants: Object.values(NumpadQuickActionsVariant),
  eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED],
} as const;

trackEvent(createEventBuilder(EVENT_NAME.SWAP_PAGE_VIEWED).build());

/* trackUnifiedSwapBridgeEvent() calls AnalyticsController:trackEvent directly, rather
than using a shared analytics wrapper, so active_ab_tests must be added manually */
Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
  UnifiedSwapBridgeEventName.InputChanged,
  {
    input: 'token_amount_source',
    ...(isActive && {
      active_ab_tests: [
        {
          key: 'swapsSWAPS4135AbtestNumpadQuickAmounts',
          value: variantName,
        },
      ],
    }),
  },
);
```

---

## Config Module Pattern (Best Practice)

For any new A/B test, keep test configuration in a dedicated module (for example `abTestConfig.ts`) and export the analytics mapping from that same module.

```typescript
import { EVENT_NAME } from '../core/Analytics/MetaMetrics.events';

export const FEATURE_AB_TEST_KEY = 'teamTEAM1234AbtestFeatureName';

export enum FeatureVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export type FeatureVariantConfig = {
  /* test-specific config shape */
};

export const FEATURE_VARIANTS: Record<FeatureVariant, FeatureVariantConfig> = {
  [FeatureVariant.Control]: {
    /* control config */
  },
  [FeatureVariant.Treatment]: {
    /* treatment config */
  },
};

// Optional: additional maps for state-dependent rendering while preserving
// the same variant keys (control/treatment/etc.)
export const FEATURE_VARIANTS_ALT_STATE: Record<
  FeatureVariant,
  FeatureVariantConfig
> = {
  [FeatureVariant.Control]: {
    /* control alt-state config */
  },
  [FeatureVariant.Treatment]: {
    /* treatment alt-state config */
  },
};

export const FEATURE_AB_TEST_ANALYTICS_MAPPING = {
  flagKey: FEATURE_AB_TEST_KEY,
  validVariants: Object.values(FeatureVariant),
  eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED, EVENT_NAME.ACTION_BUTTON_CLICKED],
} as const;
```

Consumption pattern:

1. Resolve assignment via `useABTest(FEATURE_AB_TEST_KEY, FEATURE_VARIANTS)`.
2. Normalize unknown/fallback assignments to `control` and use the chosen variant map for rendering.
3. If UI state changes available options, select from an alternate variant map (`*_ALT_STATE`) with the same variant key.
4. Export `FEATURE_AB_TEST_ANALYTICS_MAPPING` from the same config module and include it in the shared analytics registry (`app/util/analytics/abTestAnalyticsRegistry.ts`).

Example: feature/UI consumption

```typescript
const { variantName, isActive } = useABTest(
  FEATURE_AB_TEST_KEY,
  FEATURE_VARIANTS,
);

const selectedVariant =
  variantName === FeatureVariant.Treatment
    ? FeatureVariant.Treatment
    : FeatureVariant.Control;

const config = isInAltState
  ? FEATURE_VARIANTS_ALT_STATE[selectedVariant]
  : FEATURE_VARIANTS[selectedVariant];
```

Example: tracked event with automatic enrichment

```typescript
trackEvent(createEventBuilder(EVENT_NAME.SWAP_PAGE_VIEWED).build());
```

Example: allowlisting one event for multiple tests

```typescript
export const LAYOUT_TEST_ANALYTICS_MAPPING = {
  flagKey: LAYOUT_TEST_KEY,
  validVariants: Object.values(LayoutVariant),
  eventNames: [EVENT_NAME.ACTION_BUTTON_CLICKED],
} as const;

export const CTA_TEST_ANALYTICS_MAPPING = {
  flagKey: CTA_TEST_KEY,
  validVariants: Object.values(CtaVariant),
  eventNames: [EVENT_NAME.ACTION_BUTTON_CLICKED],
} as const;
```

This standard keeps flag key, variant labels, UI behavior, and business-event attribution in sync across feature code and analytics.

---

## Checklist

- [ ] LaunchDarkly JSON flag created with threshold array
- [ ] `useABTest` added in feature component
- [ ] Relevant business events listed in the config module analytics mapping
- [ ] Analytics mapping added to `app/util/analytics/abTestAnalyticsRegistry.ts`
- [ ] Each attributed business event uses the correct path: shared wrapper + registry, or manual `active_ab_tests` on a custom tracker (see "Concrete Example" section)

---

## FAQ

**Q: Should I send both `ab_tests` and `active_ab_tests`?**  
No. Use `active_ab_tests`.

**Q: Do I manually emit `Experiment Viewed`?**  
No, not when using `useABTest`. The hook emits it automatically for active assignments.

**Q: Do I manually attach `active_ab_tests` to every event?**  
No. Use registry-based auto-injection on the shared wrapper path, and manual `active_ab_tests` only on the custom tracker path (see "Concrete Example" section).

**Q: What is the fallback variant?**  
`control`.

**Q: Do I need a per-test Segment schema key?**  
No. Use the shared `active_ab_tests` array of `{ key, value }`.

**Q: Do copy-only or config-only A/B changes need new unit tests?**  
Not always. Use risk-based scope: add tests when behavior or analytics wiring changes; for copy/config-only changes, you can skip new tests and include a brief rationale in your PR/agent response.

---

## Related Files

- `app/hooks/useABTest.ts`
- `app/hooks/useABTest.test.ts`
- `app/core/Analytics/MetaMetrics.events.ts`
- `app/selectors/featureFlagController/index.ts`
