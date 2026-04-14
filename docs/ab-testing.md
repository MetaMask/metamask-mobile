# A/B Testing Framework

Generic A/B testing guidance for MetaMask Mobile.

## Current Analytics Standard

Use these two mechanisms together:

1. **Exposure event (automatic):** `Experiment Viewed`
2. **Business events context (manual):** `active_ab_tests`

`ab_tests` is legacy and should not be used for new payload additions.

## References

- [Remote Feature Flags Documentation](https://github.com/MetaMask/contributor-docs/blob/main/docs/remote-feature-flags.md)
- [Perps A/B Testing Guide](./perps/perps-ab-testing.md)

## Agent Skill Entrypoint

Use these entrypoints:

- SSOT policy + execution standard: this document
- Codex skill entrypoint: `.agents/skills/ab-testing-implementation/SKILL.md` (`$ab-testing-implementation`)
- Claude skill entrypoint: `.claude/skills/ab-testing-implementation/SKILL.md`
- Claude command entrypoint: `.claude/commands/create-ab-test.md`
- Cursor command entrypoint: `.cursor/commands/create-ab-test.md`
- Compliance check: `bash .agents/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged`
- If no files are staged, the checker automatically falls back to changed working-tree files.

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
5. For business events, use `active_ab_tests: [{ key, value }]` only when assignment is active.
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
      control: 'Control',
      treatment: 'Treatment',
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
- When active, the hook emits `Experiment Viewed` once per `experiment_id + variation_id` per app session.

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

For feature/business events (page view, click, submit, conversion), add active test assignments via `active_ab_tests`.

Shape:

```typescript
active_ab_tests: Array<{ key: string; value: string }>;
```

Single test example:

```typescript
const abAssignments = isActive
  ? [{ key: flagKey, value: variantName }]
  : undefined;

trackEvent(
  createEventBuilder(MetaMetricsEvents.SCREEN_VIEWED)
    .addProperties({
      screen: 'details',
      ...(abAssignments && { active_ab_tests: abAssignments }),
    })
    .build(),
);
```

Multiple concurrent tests:

```typescript
const activeABTests = [
  ...(buttonTest.isActive
    ? [{ key: 'teamTEAM1234AbtestButtonColor', value: buttonTest.variantName }]
    : []),
  ...(ctaTest.isActive
    ? [{ key: 'teamTEAM1234AbtestCtaText', value: ctaTest.variantName }]
    : []),
];

trackEvent(
  createEventBuilder(MetaMetricsEvents.SCREEN_VIEWED)
    .addProperties({
      ...(activeABTests.length > 0 && { active_ab_tests: activeABTests }),
    })
    .build(),
);
```

Do not add new payloads under `ab_tests`.

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
2. Emit `active_ab_tests: [{ key, value }]` only when assignment is active.
3. Keep `Experiment Viewed` exposure sourced from `useABTest` (do not manually emit duplicates).
4. Validate no payload contains `ab_tests.<experiment_key>`.
5. Validate each `active_ab_tests` item always contains both `key` and `value` strings.

Before/after payload example:

```typescript
// Before
ab_tests: {
  swapsSWAPS4135AbtestNumpadQuickAmounts: 'control';
}

// After
active_ab_tests: [
  { key: 'swapsSWAPS4135AbtestNumpadQuickAmounts', value: 'control' },
];
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

## SWAPS4135 Example

- Flag key: `swapsSWAPS4135AbtestNumpadQuickAmounts`
- `Experiment Viewed`:
  - `experiment_id = "swapsSWAPS4135AbtestNumpadQuickAmounts"`
  - `variation_id = "control" | "treatment"`
- Business events:

```typescript
active_ab_tests: [
  { key: 'swapsSWAPS4135AbtestNumpadQuickAmounts', value: variantName },
];
```

---

## Config Module Pattern (Best Practice)

For any new A/B test, keep test configuration in a dedicated module (for example `abTestConfig.ts`) and import it in both feature UI and tracking hooks.

```typescript
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
```

Consumption pattern:

1. Resolve assignment via `useABTest(FEATURE_AB_TEST_KEY, FEATURE_VARIANTS)`.
2. Normalize unknown/fallback assignments to `control` and use the chosen variant map for rendering.
3. If UI state changes available options, select from an alternate variant map (`*_ALT_STATE`) with the same variant key.
4. Reuse the same key and variant source in analytics hooks and emit:

```typescript
active_ab_tests: [{ key: FEATURE_AB_TEST_KEY, value: variantName }];
```

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

Example: single-test analytics event

```typescript
trackEvent(
  createEventBuilder(MetaMetricsEvents.SCREEN_VIEWED)
    .addProperties({
      screen: 'feature-screen',
      ...(isActive && {
        active_ab_tests: [{ key: FEATURE_AB_TEST_KEY, value: variantName }],
      }),
    })
    .build(),
);
```

Example: multiple concurrent tests in one event

```typescript
const activeABTests = [
  ...(layoutTest.isActive
    ? [{ key: LAYOUT_TEST_KEY, value: layoutTest.variantName }]
    : []),
  ...(ctaTest.isActive
    ? [{ key: CTA_TEST_KEY, value: ctaTest.variantName }]
    : []),
];

trackEvent(
  createEventBuilder(MetaMetricsEvents.BUTTON_CLICKED)
    .addProperties({
      button_id: 'continue',
      ...(activeABTests.length > 0 && { active_ab_tests: activeABTests }),
    })
    .build(),
);
```

This standard keeps flag key, variant labels, UI behavior, and analytics payloads in sync across feature code and events.

---

## Checklist

- [ ] LaunchDarkly JSON flag created with threshold array
- [ ] `useABTest` added in feature component
- [ ] Relevant business events include `active_ab_tests`

---

## FAQ

**Q: Should I send both `ab_tests` and `active_ab_tests`?**  
No. Use `active_ab_tests`.

**Q: Do I manually emit `Experiment Viewed`?**  
No, not when using `useABTest`. The hook emits it automatically for active assignments.

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
