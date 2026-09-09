# Cold-start instrumentation

How to measure a cold start on a real device, stage by stage, and what the stages currently cost.

`trace()` ([`app/util/trace.ts`](../../app/util/trace.ts)) remains the production instrumentation.
This page covers the **local** counterpart: `StartupTimeline`, which makes the same seams readable
over `adb logcat` on a release build, where `trace()` cannot help.

## Why a second channel exists

`trace()` spans buffer until the user grants metrics consent and then flush to Sentry, which needs
`MM_SENTRY_DSN`. Neither holds on a freshly onboarded test wallet, so startup numbers are invisible
exactly when you most need them.

`babel.config.js` also applies `transform-remove-console` in the `production` babel env, so every
`console.*` call is stripped from release builds — the only builds whose startup timings are worth
measuring. `global.nativeLoggingHook` writes straight to logcat and is a plain global call, so the
plugin leaves it alone. That is the channel `StartupTimeline` uses: no consent, no network, no DSN.

## Enabling it

Both switches are build-time. `LaunchArguments.value()` returns `{}` on Android
(see `shim.js`), so runtime toggles are not available on the platform that matters most.

```bash
# .js.env
export MM_STARTUP_TIMELINE="true"   # stage marks (cheap; safe for timing runs)
export MM_STARTUP_PROFILE="true"    # Hermes sampling profile (adds overhead — see below)
```

`process.env.MM_STARTUP_TIMELINE` is inlined by `transform-inline-environment-variables`, so in a
normal build the flag is a literal `false` and every function collapses to an empty body a minifier
can drop.

```bash
yarn build:android:main:prod
adb logcat -c && adb logcat -s ReactNativeJS | grep MM_STARTUP
```

**Do not use the profiled build for headline numbers.** Sampling overhead inflates stage marks. Use
a profiled run for _attribution_ (which functions dominate a stage) and an unprofiled run for
absolute durations. The one exception is the splash reveal tax, which is driven by `setTimeout`
durations and is therefore wall-clock and unaffected.

## The stages

| Mark                                   | Meaning                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `js_bundle_evaluated`                  | end of `index.js` — bundle prelude + entry evaluation done               |
| `controller_rehydrate_start` / `_end`  | reading every `persist:<Controller>` blob                                |
| `engine_init_start` / `_end`           | `Engine.init()` — synchronous construction of ~70 controllers            |
| `app_services_ready`                   | the gate that unblocks the whole UI                                      |
| `root_navigator_render_start` / `_end` | `AppFlow`'s first render                                                 |
| `splash_loader_done`                   | splash overlay fully removed                                             |
| `unlock_interactive`                   | unlock screen genuinely accepts input (fired from `onLayout`, not mount) |
| `homepage_ready`                       | homepage rendered a usable state                                         |

Native stages before JS come from `ReactMarker`, which React Native already records and
`react-native-performance` already bridges — they were invisible in release only because the sole
consumer logged them via `console.info`. `flushNativeStartupMarks()` emits whatever is present.
Note that only ~11 of the ~30 markers fire under bridgeless; `createReactContext*`,
`processCoreReactPackage*`, `createViewManagers*` and `buildNativeModuleRegistry*` are legacy-bridge
concepts. Sizing the pre-JS window fully needs a Perfetto capture.

## Build-variant traps

Measure **`production`** (or `beta`). Nothing else is valid:

| Variant              | Why it breaks measurement                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `exp`, `rc`          | disable `FLAG_SECURE` (`app/core/PreventScreenshot.js`), breaking screen-recording-based measurement               |
| `test`, `e2e`, `dev` | set `isTestEnvironment`, which triggers `waitForStore()` polling in `Root/index.tsx` and distorts the early stages |

Two more, learned the hard way:

- **Dependency and `node_modules` changes do not invalidate Gradle's bundle task.** A "clean" build
  can finish in under a minute and silently measure a stale bundle. Force regeneration by deleting
  `android/app/build/generated/assets/react/prodRelease/index.android.bundle` and touching a tracked
  file under `app/`. A real rebuild takes several minutes; treat any sub-minute build as suspect.
- **Metro needs a bigger heap than the default.** The bundle is ~19k modules; Node's default
  4,288 MB heap dies part-way through with **exit code 0, no error, and no output file**. Use
  `NODE_OPTIONS='--max-old-space-size=12288'`.

## Measurement hygiene

- Cold starts only, and dismiss the keyguard first (`adb shell wm dismiss-keyguard`) — with the
  activity not visible, `ON_NAVIGATION_READY` never fires and the startup saga stalls.
- Median of n≥5, and report p90 next to it.
- A mid-range physical device. Measured build-to-build variance on the unlock→homepage window is
  roughly **±120 ms**, so treat anything smaller than that as unmeasurable in isolation.
- The `UpdateNeeded` modal intercepts locally built cold starts, because the local build number is
  always below the production minimum. With it focused, `resolveColdHomepageReadyTrace` discards the
  homepage CUF, making cold-start-to-homepage structurally unmeasurable.

## Related

- [measuring.md](./measuring.md) — the power-user scenario and render-regression tests
- [tools.md](./tools.md) — symptom-first tool selection
- [native-crypto.md](./native-crypto.md) — the native secp256k1 patch and the invariant it depends on
- [`docs/readme/release-build-profiler.md`](../readme/release-build-profiler.md)
