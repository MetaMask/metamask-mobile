# Perps A/B Testing

Perps A/B tests follow the canonical MetaMask Mobile standard. See:

- [`docs/ab-testing.md`](../ab-testing.md) — SSOT for implementation, LaunchDarkly setup, and analytics rules
- [`app/components/UI/Perps/abTestConfig.ts`](../../app/components/UI/Perps/abTestConfig.ts) — current Perps test configuration

Historical note: this doc previously described a Perps-local `usePerpsABTest` hook. That implementation was migrated to the shared `useABTest` standard in TAT-3308.

## Active tests

| Flag key (Redux / `useABTest`)   | Variants               | Purpose                                             |
| -------------------------------- | ---------------------- | --------------------------------------------------- |
| `perpsTAT1937AbtestButtonColor`  | `control`, `colors`    | Long/short button color (TAT-1937)                  |
| `perpsTAT3938AbtestBottomSheets` | `control`, `treatment` | Shared full-page vs bottom-sheet rollout (TAT-3938) |

`perpsTAT1937AbtestButtonColor` is version-gated to app version `8.3.0` and above using the `versions` + `thresholdVersion: 2` LaunchDarkly composition. See [`docs/perps/perps-feature-flags.md`](./perps-feature-flags.md).

## Bottom-sheet rollout (`perpsTAT3938AbtestBottomSheets`)

One experiment governs every Perps flow that is converting from a full page to a bottom sheet (Close Position — TAT-3552 — and later tickets under the same epic). Do **not** define a new experiment per conversion.

Assignment is **orthogonal to Lite/Pro mode**. Mode is still `selectPerpsProModeEnabledFlag` / `useIsPerpsProModeActive()` in `app/components/UI/Perps/utils/perpsModeSwitch.ts`. A Lite treatment user and a Pro treatment user each get **that mode's** new sheets; control users of either mode keep full-page flows.

### LaunchDarkly

Create a JSON flag named `perpsTAT3938AbtestBottomSheets`. Default targeting must serve **0% treatment** until product signs off:

```json
[
  {
    "name": "control",
    "scope": { "type": "percentage_rollout", "value": 1.0 }
  },
  {
    "name": "treatment",
    "scope": { "type": "percentage_rollout", "value": 1.0 }
  }
]
```

Control occupies the full `[0, 1.0]` bucket, so treatment is unused. Raise treatment later by lowering the control threshold (for example `0.5` / `1.0` for a 50/50 split). Missing or invalid flags fall back to `control` in `useABTest`.

E2E / client-config default is the resolved string `'control'` (`tests/feature-flags/feature-flag-registry.ts`).

### Shared hook

Import `usePerpsBottomSheetAbTest` from `app/components/UI/Perps/hooks`. Do not call `useABTest` with this flag from conversion tickets.

```typescript
const { useBottomSheet, variantName, isActive } = usePerpsBottomSheetAbTest();
```

- `useBottomSheet` is `true` only for treatment (`presentation: 'bottomSheet'`).
- `useABTest` emits `Experiment Viewed` once per `experiment_id` + `variation_id` per app session. Pass `{ trackExposure: false }` only for assignment-only reads off the experiment surface.

### Router-swap pattern (conversion tickets)

Keep **one route and the same params**. Swap the presented component from a thin router, the same way `PerpsMarketDetailsRouter` swaps `PerpsProMarketView` vs `PerpsMarketDetailsView` behind a flag without changing navigation.

Sketch (Close Position, TAT-3552, and later conversions):

```typescript
const ClosePositionRouter: React.FC = () => {
  const { useBottomSheet } = usePerpsBottomSheetAbTest();
  const isProMode = useIsPerpsProModeActive();

  if (useBottomSheet) {
    return isProMode ? <ProClosePositionSheet /> : <LiteClosePositionSheet />;
  }

  return isProMode ? <ProClosePositionView /> : <LiteClosePositionView />;
};
```

Rules:

- Register the existing route name (`Routes.PERPS.*`) on the router, not on a new treatment-only route.
- Do not branch on Lite/Pro for _whether_ the experiment applies — only for _which_ sheet/page that mode owns.
- Control (`useBottomSheet === false`) must keep today's full-page UI in both modes.

### Analytics

`BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING` in `abTestConfig.ts` is registered in `app/util/analytics/abTestAnalyticsRegistry.ts`. Shared-wrapper events (`analytics.trackEvent`, `useAnalytics().trackEvent`, `usePerpsEventTracking`, and `trackPerpsEvent` via `mobileInfrastructure`) auto-attach `active_ab_tests` for:

- `Perp Screen Viewed`
- `Perp UI Interaction`
- `Perp Position Close Transaction`
- `Perp Trade Transaction`

If a conversion path bypasses those wrappers, attach assignment with `createActiveABTestAssignment(PERPS_BOTTOM_SHEET_AB_TEST_KEY, variantName)` from `app/util/analytics/activeABTestAssignments.ts`. Do not add new `ab_tests` payloads.
