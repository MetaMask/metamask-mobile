# A/B Testing in MetaMask Mobile

This is the canonical guide for implementing A/B tests in MetaMask Mobile.

If you are adding a new test, start with the quickstart and the end-to-end example. The rest of the document explains the rules behind that workflow.

## Quickstart

Use this order every time:

1. Create a LaunchDarkly JSON flag named `{team}{TICKET}Abtest{TestName}`.
2. Add a feature-local config module that exports:
   - the flag key
   - the variant enum
   - the variant config map
   - the analytics mapping for business events
3. In the feature, call `useABTest(flagKey, variants)`.
4. If the feature sends business events through shared analytics wrappers, register the analytics mapping in `app/util/analytics/abTestAnalyticsRegistry.ts`.
5. If the feature uses a custom tracker path that bypasses shared wrappers, attach `active_ab_tests` manually on that event.
6. Run targeted tests and the compliance check before shipping.

## What You Need to Touch

Most A/B tests change only these places:

- Feature config module, for example `app/components/.../abTestConfig.ts`
- Feature component or hook that consumes `useABTest`
- `app/util/analytics/abTestAnalyticsRegistry.ts` if business events should be auto-enriched
- Tests for the feature, analytics enrichment, or hook behavior when the change affects behavior or instrumentation

## Definition of Done

An A/B test is ready when all of these are true:

- LaunchDarkly JSON flag exists and uses the threshold array format shown below
- The feature reads assignment through `useABTest`
- The variants object includes a `control` variant
- Shared-wrapper events are registered in `app/util/analytics/abTestAnalyticsRegistry.ts`
- Custom tracker events attach `active_ab_tests` manually when active
- Relevant tests were added or updated when behavior or analytics wiring changed
- The compliance checker passes

## End-to-End Example

This is the smallest complete pattern for a new A/B test.

### 1. Create the config module

Keep the test definition in one place. This keeps the flag key, variants, and analytics mapping in sync.

```typescript
import { EVENT_NAME } from '../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../util/analytics/abTestAnalytics.types';

export const FEATURE_AB_TEST_KEY = 'swapsSWAPS4135AbtestButtonColor';

export enum FeatureVariant {
  Control = 'control',
  Treatment = 'treatment',
}

type FeatureVariantConfig = {
  color: string;
};

export const FEATURE_VARIANTS: Record<FeatureVariant, FeatureVariantConfig> = {
  [FeatureVariant.Control]: { color: 'green' },
  [FeatureVariant.Treatment]: { color: 'blue' },
};

export const FEATURE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping = {
  flagKey: FEATURE_AB_TEST_KEY,
  validVariants: Object.values(FeatureVariant),
  eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED],
};
```

### 2. Use `useABTest` in the feature

`useABTest` is the only supported way to resolve the assignment in UI code.

```typescript
const { variant, variantName, isActive } = useABTest(
  FEATURE_AB_TEST_KEY,
  FEATURE_VARIANTS,
  {
    experimentName: 'Button Color Test',
    variationNames: {
      control: 'Green button color',
      treatment: 'Blue button color',
    },
  },
);

const buttonColor = variant.color;
```

Important behavior:

- `control` is the fallback when the flag is missing, invalid, or unresolved
- `isActive` is `true` only when the remote assignment matches a declared variant
- `useABTest` automatically emits `Experiment Viewed` once per `experiment_id + variation_id` per app session

### 3. Register business-event auto-enrichment

If the feature tracks business events through the shared analytics wrappers, add the mapping to the registry:

```typescript
import { FEATURE_AB_TEST_ANALYTICS_MAPPING } from '../../components/.../abTestConfig';

export const AB_TEST_ANALYTICS_MAPPINGS: readonly ABTestAnalyticsMapping[] = [
  FEATURE_AB_TEST_ANALYTICS_MAPPING,
];
```

After this, shared-wrapper events are enriched automatically:

```typescript
trackEvent(createEventBuilder(EVENT_NAME.SWAP_PAGE_VIEWED).build());
```

### 4. Handle custom tracker paths manually

If an event bypasses the shared wrappers and calls the analytics controller directly, add `active_ab_tests` yourself:

```typescript
Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
  UnifiedSwapBridgeEventName.InputChanged,
  {
    input: 'token_amount_source',
    ...(isActive && {
      active_ab_tests: [
        {
          key: FEATURE_AB_TEST_KEY,
          value: variantName,
        },
      ],
    }),
  },
);
```

## The Rules That Matter

### 1. Use `useABTest`

Do this:

- Call `useABTest(flagKey, variants)` from the feature code
- Always provide a `control` variant
- Use the returned `variant`, `variantName`, and `isActive` to drive UI behavior

Do not do this:

- Do not read raw flag values directly in feature code
- Do not manually emit `Experiment Viewed` when using `useABTest`

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

### 2. Use `active_ab_tests` for business events

There are two analytics mechanisms, and new tests usually need both:

1. Exposure event: `Experiment Viewed`
2. Business-event context: `active_ab_tests`

Shared-wrapper events are auto-enriched when:

- the event is sent through `analytics.trackEvent`, `useAnalytics().trackEvent`, or the `trackEvent()` util in `app/core/Engine/utils/analytics.ts`
- and the event name is registered in `app/util/analytics/abTestAnalyticsRegistry.ts`

If an event bypasses those wrappers, attach `active_ab_tests` manually.

### 3. Do not add new `ab_tests` payloads

`ab_tests` is legacy and should not be used for new payload additions.

Use this shape instead:

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

Correct:

```typescript
active_ab_tests: [{ key: FEATURE_AB_TEST_KEY, value: variantName }];
```

Incorrect:

```typescript
ab_tests: {
  swapsSWAPS4135AbtestButtonColor: 'control',
};
```

For rare legacy touchpoints that cannot be migrated in the same change, mark the changed `ab_tests` line with `LEGACY_AB_TEST_ALLOWED` and explain why in the PR or agent output.

## LaunchDarkly Setup

### Flag naming

Use this format:

`{team name}{ticket ID}Abtest{test name}`

Example:

`swapsSWAPS4135AbtestButtonColor`

Rules:

- Team name: lower camel team token, for example `swaps`
- Ticket ID: uppercase project key plus number, for example `SWAPS4135`
- Literal segment: exact `Abtest`
- Test name: PascalCase semantic name, for example `ButtonColor`

### Flag value

Create a JSON flag and use the threshold array format:

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

Use the default targeting rule to serve this value.

### How assignment works

You usually do not need to implement assignment logic yourself. The app resolves the LaunchDarkly value into `RemoteFeatureFlagController.remoteFeatureFlags`, and `useABTest` reads the resolved variant name from there.

## Testing and Validation

Use risk-based scope:

- If behavior changed, add or update feature tests
- If analytics wiring changed, add or update analytics tests
- If the change is copy-only or config-only, you may skip new tests with a brief rationale

Recommended commands:

```bash
yarn jest <changed-test-file> --collectCoverage=false
bash .agents/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged
```

If you changed behavior and analytics wiring, run both the relevant feature test and the relevant analytics test.

Helpful existing files:

- `app/hooks/useABTest.ts`
- `app/hooks/useABTest.test.ts`
- `app/util/analytics/abTestAnalyticsRegistry.ts`
- `app/util/analytics/enrichWithABTests.ts`
- `app/core/Engine/utils/analytics.ts`

## FAQ

**Do I manually emit `Experiment Viewed`?**  
No. Not when you use `useABTest`.

**Do I manually attach `active_ab_tests` to every event?**  
No. Register shared-wrapper events in the analytics registry. Add `active_ab_tests` manually only for custom tracker paths.

**What is the fallback variant?**  
`control`.

**Do I need a per-test Segment schema key?**  
No. Use the shared `active_ab_tests` array of `{ key, value }`.

**Can multiple tests enrich the same event?**  
Yes. Multiple mappings can point at the same event name.

## Reference Implementations

These are good examples to copy from:

- `app/components/UI/Bridge/components/GaslessQuickPickOptions/abTestConfig.ts`
- `app/components/UI/Card/components/CardButton/abTestConfig.ts`
- `app/components/UI/Bridge/components/TokenSelectorItem.abTestConfig.ts`

## Agent Appendix

For agent implementation and review tasks, this document is also the SSOT.

Supporting entrypoints:

- Codex skill: `.agents/skills/ab-testing-implementation/SKILL.md` (`$ab-testing-implementation`)
- Claude skill: `.claude/skills/ab-testing-implementation/SKILL.md`
- Compliance check: `bash .agents/skills/ab-testing-implementation/scripts/check-ab-testing-compliance.sh --staged`

Agent workflow:

1. Run discovery before edits:

```bash
rg -n "useABTest\\(|active_ab_tests|ab_tests|Abtest|abTestConfig" app docs tests
rg -n "Experiment Viewed|EXPERIMENT_VIEWED" app
```

2. Keep test config centralized in a dedicated config module using the `abTestConfig.ts` pattern.
3. Use `useABTest(flagKey, variants)` and normalize unresolved assignments to `control`.
4. Do not manually emit `Experiment Viewed` when using `useABTest`.
5. For business events, use registry-based injection on the shared wrapper path, or attach `active_ab_tests` manually on custom tracker paths.
6. Do not add new payloads under `ab_tests`.
7. Use risk-based test scope.
8. Run the compliance check before finishing.

Required agent response sections:

1. `Implementation Checklist`
2. `Files To Modify`
3. `Analytics Payload Changes`
4. `Tests To Run`
5. `Compliance Check Result`

## References

- [Remote Feature Flags Documentation](https://github.com/MetaMask/contributor-docs/blob/main/docs/remote-feature-flags.md)
