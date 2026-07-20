# Measuring & gating performance

## The power-user scenario (always)

A feature that's fast with 1 account and 5 tokens can be unusable at scale — MetaMask perf problems scale **superlinearly** with user data. So every measurement uses a realistic heavy profile on the more sensitive platform:

1. **Android**, with **JS Dev Mode OFF** (dev mode is artificially slow; the iOS simulator hides re-render storms).
2. **~30 accounts / ~90 assets** as the working baseline.

The scaling axis is **feature-dependent** — push the axis the feature actually grows on: accounts/assets for the wallet, **market count** for perps, transaction count for activity, notification count for notifications, positions for DeFi.

Ready-made power-user wallets exist on the internal **Power-user SRPs** page (ask the Mobile Platform team). Treat those SRPs as test-only credentials — never reuse them for anything holding real funds.

## Instrumenting a flow — `trace()`

`react-native-performance` is wrapped by [`app/util/trace.ts`](../../app/util/trace.ts). Use it (don't hand-roll markers or add new perf libraries):

```ts
import { trace, endTrace, TraceName, TraceOperation } from '../../util/trace';

// Callback form (auto-ends on resolve/reject)
const data = trace(
  { name: TraceName.Tokens, op: TraceOperation.UIStartup },
  () => build(),
);

// Manual form (span ends in a later render/effect)
trace({ name: TraceName.AssetDetails, op: TraceOperation.UIStartup });
// ...when the screen is actually interactive...
endTrace({ name: TraceName.AssetDetails });
```

- New flow → add a `TraceName` (and `TraceOperation` if needed) to `app/util/trace.ts`, then wrap it.
- Numeric `tags` become Sentry **measurements**; spans nest via `parentContext`; traces buffer until metrics consent then flush.
- ⚠️ **End the trace on _data-loaded / interactive_, not _mounted_.** A condition that's already `true` on first render (e.g. `!isSearchVisible`, `isMounted`) closes the span at mount and measures ~zero.

### Component-level: use a per-feature measurement hook

The raw form above is what core init uses (`EngineService.ts`, `Vault.ts`). For screens/components, follow the in-repo convention of a declarative `useXMeasurement` hook that starts/ends on conditions — which structurally enforces the "end on data-loaded, not mount" rule:

```ts
// e.g. app/components/UI/Predict/hooks/usePredictMeasurement.ts
usePredictMeasurement({
  traceName: TraceName.PredictMarketDetailsView,
  conditions: [dataLoaded, !isLoading], // starts on mount, ends when ALL are true
});
```

Mirror this per feature (`usePerpsMeasurement`, `useSectionPerformance`, …) rather than scattering `useEffect` + `trace()` calls.

### TTI targets

Measure **cold starts only** (warm/hot/iOS-prewarmed are misleading). Rough targets: TTI < 2s good · 2–4s acceptable · > 4s needs work.

## Guarding against regressions — Reassure

Render-time regression tests are installed. Write a `*.perf-test.tsx` next to a re-render-heavy component, then:

```bash
yarn test:reassure:baseline   # on main
yarn test:reassure:branch     # on your branch — fails on significant regression
```

See [reassure.md](../readme/reassure.md) for setup, examples, and CI gating.

## Benchmarking FPS — Flashlight (optional, external)

Flashlight is **not installed in this repo** — it's an external Callstack tool. If you want an automatable Android FPS score, install it separately (from a verified release), then:

```bash
flashlight measure --output results.json
flashlight compare baseline.json current.json
```

For day-to-day FPS checks without it, use the in-app Perf Monitor and the RN DevTools Profiler ([tools.md](./tools.md)).

## CI flow gates — E2E performance tests

Core flows have timing budgets enforced in CI. The framework lives in `tests/performance/` (specs grouped by `login` / `onboarding`; MMConnect Appium smoke lives under `tests/smoke-appium/mm-connect/`) on top of `tests/framework/TimerHelper.ts` (platform-specific thresholds with a 10% margin). Add a gate for your flow following the **`mms-performance-testing`** skill.

## Production — Sentry & Release Profiler

- **Sentry** surfaces real-device metrics and alerts (`#metamask-mobile-release-monitoring`); `trace()` spans/measurements flow here.
- When a report points at a flow, profile a **release build** with the [Release build profiler](../readme/release-build-profiler.md) and open the trace in `chrome://tracing`.

## Acceptance-criteria template (Planning)

```
- [ ] No FPS drop below ~55 on a mid-range Android during [interactions], power-user data
- [ ] [Flow] completes within [X] ms under the power-user scenario (measured via trace())
- [ ] Memory stays flat over an [N]-minute session with power-user data
- [ ] Reassure perf-test added for [component] / E2E perf gate added for [flow] (if applicable)
```
