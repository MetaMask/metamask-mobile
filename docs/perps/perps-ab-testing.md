# Perps A/B Testing

Perps A/B tests follow the canonical MetaMask Mobile standard. See:

- [A/B Testing Framework](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400743989262/A+B+Testing+Framework) — shared Mobile/Extension framework
- [`docs/ab-testing.md`](../ab-testing.md) — SSOT for implementation, LaunchDarkly setup, and analytics rules
- [`app/components/UI/Perps/abTestConfig.ts`](../../app/components/UI/Perps/abTestConfig.ts) — current Perps test configuration

Historical note: this doc previously described a Perps-local `usePerpsABTest` hook. That implementation was migrated to the shared `useABTest` standard in TAT-3308.

## Active tests

| Flag key (Redux / `useABTest`)   | Variants               | Purpose                                  |
| -------------------------------- | ---------------------- | ---------------------------------------- |
| `perpsTAT1937AbtestButtonColor`  | `control`, `colors`    | Long/short button color (TAT-1937)       |
| `perpsAbtestScreenVsBottomSheet` | `control`, `treatment` | Shared screen vs bottom-sheet experience |

`perpsTAT1937AbtestButtonColor` is version-gated to app version `8.3.0` and above using the `versions` + `thresholdVersion: 2` LaunchDarkly composition. See [`docs/perps/perps-feature-flags.md`](./perps-feature-flags.md).

## Screen vs bottom sheet (`perpsAbtestScreenVsBottomSheet`)

One experiment governs every Perps flow that is converting from a full page to a bottom sheet (Close Position — TAT-3552 — and later tickets under the same epic). Do **not** define a new experiment per conversion.

The flag key is intentionally semantic and ticket-independent because this is
a long-lived shared assignment consumed by multiple conversion tickets. This
is a deliberate exception to the ticket-based naming convention in
[`docs/ab-testing.md`](../ab-testing.md).

Assignment is **orthogonal to Lite/Pro mode**. Mode is still `selectPerpsProModeEnabledFlag` / `useIsPerpsProModeActive()` in `app/components/UI/Perps/utils/perpsModeSwitch.ts`. A Lite treatment user and a Pro treatment user each get **that mode's** new sheets; control users of either mode keep full-page flows.

### LaunchDarkly

Create a JSON flag named `perpsAbtestScreenVsBottomSheet`. Default targeting must serve **0% treatment** until product signs off:

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

These values are ordered cumulative thresholds: control occupies the full
`[0, 1.0]` range, leaving no range for treatment. For a 50/50 split, use `0.5`
for control and `1.0` for treatment. Missing or invalid flags fall back to
`control` in `useABTest`.

Create the flag with this safe value, but keep its production targeting rule
disabled until the first conversion router ships. This prevents conversion
events from carrying an assignment before any user can be exposed. Before
enabling the rule, version-gate it to the first app version that contains that
router so older clients cannot receive an unusable treatment. Keep treatment at
0% until product signs off.

The feature-flag registry records `'control'` as the safe metadata default and
keeps `inProd: false` until the flag exists in the production client-config
response. Once it is added there, sync the registry to the exact production
array and set `inProd: true`.

### Shared hook

Import `usePerpsScreenVsBottomSheetAbTest` from `app/components/UI/Perps/hooks`. Do not call `useABTest` with this flag from conversion tickets.

```typescript
const { useBottomSheet } = usePerpsScreenVsBottomSheetAbTest();
```

- `useBottomSheet` is `true` only for treatment.
- Route only on `useBottomSheet`. An active `control` assignment is still an active experiment assignment; it must continue to render the screen.
- `useABTest` emits `Experiment Viewed` once per `experiment_id` + `variation_id` per app session.

### Router-swap pattern (conversion tickets)

Keep **one route and the same params**. Swap the presented component from a thin router, the same way `PerpsMarketDetailsRouter` swaps `PerpsProMarketView` vs `PerpsMarketDetailsView` behind a flag without changing navigation.

Sketch (Close Position, TAT-3552). Control today is the existing `PerpsClosePositionView`. Treatment sheets are owned by the conversion ticket and do not exist in this PR:

```typescript
const ClosePositionRouter: React.FC = () => {
  const { useBottomSheet } = usePerpsScreenVsBottomSheetAbTest();
  const isProMode = useIsPerpsProModeActive();

  if (useBottomSheet) {
    return isProMode ? <ProClosePositionSheet /> : <LiteClosePositionSheet />;
  }

  return <PerpsClosePositionView />;
};
```

Rules:

- Register the existing route name (`Routes.PERPS.*`) on the router, not on a new treatment-only route.
- Do not branch on Lite/Pro for _whether_ the experiment applies — only for _which_ sheet/page that mode owns.
- Control (`useBottomSheet === false`) must keep today's full-page UI in both modes.

### Analytics

`SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING` in `abTestConfig.ts` is registered in `app/util/analytics/abTestAnalyticsRegistry.ts`. Close-position conversion events are emitted from Perps Core via `trackPerpsEvent`, which calls `analytics.trackEvent` and therefore still receives registry enrichment. The wrappers attach `active_ab_tests` to `Perp Position Close Transaction`, the conversion event for the first converted flow.

Do not add broad Perps screen, interaction, or trade events preemptively. When another flow adopts the shared hook, add only that flow's conversion event to the mapping and cover it with an enrichment test.

If a future conversion bypasses the shared analytics wrappers, wire its
assignment explicitly according to [`docs/ab-testing.md`](../ab-testing.md)
when that flow is added. Do not add speculative custom-tracker APIs to this
shared hook, and do not add new `ab_tests` payloads.
