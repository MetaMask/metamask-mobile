# Performance tools

Start from the **symptom**, not the tool. Always reproduce on **Android** with the [power-user scenario](./measuring.md).

## Step 0 — before you theorize

1. **Static sweep** the suspect feature dir for catalogued patterns (see the `rg` recipes in [anti-patterns.md](./anti-patterns.md)).
2. **Check for existing instrumentation** — many features already emit a load log or `TraceName`s; read those before adding new ones:
   ```bash
   DIR=app/components/UI/<Feature>
   rg "TraceName\.|use[A-Z].*Measurement|setMeasurement|DevLogger" "$DIR"
   ```
   (Feature `DevLogger` output only prints with `SDK_DEV=DEV` — run `SDK_DEV=DEV yarn watch:clean`.)

## Decision tree

```
"Opening / navigating to a screen is slow"
  slow EVERY time            → eager work on mount (anti-patterns.md)
  only first-open / after bg → connection/cache warm-vs-cold (streaming, anti-patterns.md)
  already optimized          → inherent data/connection latency, not a render bug

"A screen/interaction feels slow / janky"
  → Perf Monitor: JS thread or UI thread dropping?
      JS drops  → React Native DevTools Profiler → re-renders (selectors/redux/context) or heavy compute (hook deps)
      UI drops  → native rendering / layout animation
      both drop → start with JS profiling

"List scroll jank"        → Perf Monitor → RN DevTools Profiler → lists (anti-patterns.md)
"Too many re-renders"     → RN DevTools "why did this render?" → selectors / redux / unstable hook returns
"Search/filter input lag" → useDeferredValue + memo the expensive child
"Memory grows over time"  → DevTools Memory profiler / Xcode Leaks / Android Studio profiler
"Slow cold start (TTI)"   → trace() the startup → bundle analysis
"Prove a fix"             → Reassure (render count) + trace() (duration) [+ Flashlight FPS if installed]
"Production report"       → Sentry → Release Profiler on an RC build
"Can't isolate it"        → manual binary search (remove code until fast, bisect to the line)
```

## Tools

| Tool                        | Type                                                        | When                                             | Notes                                                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Perf Monitor**            | Built-in (React Native)                                     | Quick JS-vs-UI FPS check                         | Shake → Dev Menu → "Perf Monitor". <55 FPS = dropping frames.                                                                                                                                                     |
| **React Native DevTools**   | Built-in (React Native / Metro)                             | Re-renders, component timing, memory             | Press `j` in Metro / shake → "Open DevTools". Works on **both** platforms (Hermes is on iOS). Enable "Record why each component rendered".                                                                        |
| **Reactotron**              | Library                                                     | Network inspection on Android                    | The DevTools network tab doesn't work on Android.                                                                                                                                                                 |
| **Flashlight**              | Library _(external, not installed here)_                    | Automatable Android FPS score (before/after, CI) | Install separately from a verified release, then `flashlight measure` → `flashlight compare`.                                                                                                                     |
| **`trace()` / `TraceName`** | **Custom** ([`app/util/trace.ts`](../../app/util/trace.ts)) | Instrument a flow (local + Sentry)               | The in-repo measurement API. Components use a per-feature hook (e.g. `usePredictMeasurement`); core init uses raw `trace()/endTrace()`. See [measuring.md](./measuring.md).                                       |
| **Reassure**                | Library                                                     | Render-time regression gate before merge         | `*.perf-test.tsx` + `yarn test:reassure:baseline` / `:branch`. [reassure.md](../readme/reassure.md)                                                                                                               |
| **E2E performance gates**   | **Custom** (`tests/performance/`, `TimerHelper`)            | Flow-level timing in CI                          | `tests/performance/` + `tests/framework/TimerHelper.ts` (platform thresholds + 10% margin); see the `mms-performance-testing` skill to add a gate.                                                                |
| **Release Profiler**        | Library                                                     | Production-like CPU profile                      | RC build → shake → profile → analyze in SpeedScope / `chrome://tracing`, **or** hand the `.cpuprofile` to Claude Code / your AI agent of choice. [release-build-profiler.md](../readme/release-build-profiler.md) |
| **Sentry**                  | Library + **custom wrapper** (`trace()`)                    | Production monitoring                            | `#metamask-mobile-release-monitoring`; `trace()` spans/measurements flow here.                                                                                                                                    |
| **Bundle analysis**         | External tooling (not wired)                                | Startup / bundle size                            | Expo Atlas: `yarn expo install expo-atlas` → `EXPO_ATLAS=1 yarn expo export` → `yarn expo-atlas`.                                                                                                                 |
| **Rive**                    | Library                                                     | Performant animations (vs Lottie)                | Use for new animations; usage + in-app example in [animations.md](../readme/animations.md).                                                                                                                       |

Tool **walkthrough recordings** live in the internal _Performance Guide for Engineers_ (Confluence, TL1 space) — ask the Mobile Platform team.

## Interpreting Perf Monitor

| Symptom                     | Likely cause                                | Next                                                             |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| JS FPS drops, UI fine       | Expensive renders / selectors / computation | RN DevTools Profiler → [anti-patterns.md](./anti-patterns.md)    |
| UI FPS drops, JS fine       | Native rendering / layout animation         | layout animations → [animations.md](../readme/animations.md)     |
| Both drop, skeleton lingers | Data-bound (cold cache / fetch)             | streaming / eager-mount → [anti-patterns.md](./anti-patterns.md) |
