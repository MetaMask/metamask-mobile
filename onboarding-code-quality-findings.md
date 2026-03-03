# Onboarding-Focused Code Quality Findings

Scope: onboarding-related implementation and UX paths in `metamask-mobile`, including `app/components/Views/Onboarding/*`, `app/components/Views/OnboardingSheet/*`, and adjacent onboarding entry flows, plus dependency-level health signals from the broader mobile codebase that apply to onboarding behavior.
Focus: code quality, maintainability, React rendering patterns, Android reliability, and runtime performance risk, with onboarding as the primary lens.

## Dependency Findings Relevant to Onboarding

| Package                                             |        Popularity Signal | Last Meaningful Update | Android Risk Signal                                                  | Performance Risk Signal                                          | Recommendation                                                     |
| --------------------------------------------------- | -----------------------: | ---------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `react-native-elevated-view`                        |        ~157 GitHub stars | 2017                   | Old elevation abstraction; Android z-order/elevation quirks likely   | Custom shadow wrappers can increase overdraw/layout cost         | Replace with modern RN shadow support or maintained shadow lib     |
| `react-native-material-textfield`                   |               ~900 stars | 2019                   | Reported Android touch/placeholder issues; low active maintenance    | Extra animated/input wrapper overhead vs modern alternatives     | Plan migration to maintained input components                      |
| `react-native-background-timer`                     |              ~1.6k stars | 2020                   | Common Android background drift/stop behavior under lock/deep sleep  | Background timer patterns can affect battery and smoothness      | Reduce critical reliance; prefer timestamp/server/job-based timing |
| `react-native-swipe-gestures`                       |               ~600 stars | 2020                   | Legacy gesture handling can conflict with modern RN gesture stack    | JS-thread gesture handling may reduce smoothness                 | Gradually migrate to RNGH/Reanimated-native gestures               |
| `react-native-browser-polyfill`                     |                ~33 stars | 2017                   | Very old polyfill surface for modern RN runtime                      | Polyfill/global patching can increase startup and memory         | Audit usage and replace with narrowly-scoped polyfills             |
| `react-native-level-fs`                             |                ~27 stars | 2018                   | Storage behavior can be fragile in modern Android scoped-storage era | IO path may be less predictable vs modern maintained fs patterns | Isolate usage, test heavily, plan migration                        |
| `react-native-fade-in-image`                        |        Archived upstream | 2021                   | Archived/read-only project; no future platform fixes                 | Usually small, but dead dependency risk accumulates              | Replace when touching image stack                                  |
| `react-native-confetti-cannon`                      |        Popular but older | 2021                   | Known Android jank reports in some scenarios                         | Can cause frame drops when particle count is high                | Keep effect short/light or switch to lighter solution              |
| `react-native-i18n`                                 | Legacy ecosystem package | Deprecated path        | Compatibility drag over time                                         | Not major runtime cost, but long-term maintenance cost           | Migrate to `react-native-localize` + i18n framework                |
| React Navigation v5 stack (`@react-navigation/*@5`) |       Historically large | Legacy major           | Outdated major increases platform/regression risk                    | Indirect performance/maintenance drag                            | Roadmap migration to current supported major                       |

## Module Resolution and Import Hygiene

- Current state: the repo still mixes import styles, including many absolute-style imports.
- Recommendation: standardize on `babel-plugin-module-resolver` aliases for internal modules (for example `@app`, `@components`, `@core`, `@util`) and enforce consistency in lint rules.
- Why this helps:
  - More stable imports during file moves/refactors.
  - Lower cognitive load vs long relative paths.
  - Clear architectural boundaries by alias namespace.
  - Faster review/debugging because import intent is explicit.
- Suggested rollout:
  1. Define canonical alias map in Babel/TypeScript/Jest so all toolchains resolve identically.
  2. Add lint rule to prevent mixed patterns for internal imports.
  3. Migrate touched files first (incremental), then run codemod for remaining folders.
  4. Keep a short alias convention section in contributor docs.

## React Compiler Coverage Gap

- Finding: onboarding flow components are not currently in the React Compiler allowlist.
- Verified scope in `babel.config.js`: compiler `sources` currently include only:
  - `app/components/Nav`
  - `app/components/UI/DeepLinkModal`
- Impact: files like `app/components/Views/Onboarding/index.tsx` and `app/components/Views/OnboardingSheet/index.tsx` do not receive compiler optimizations yet.
- Guidance: continue using `useCallback`/`useMemo` where appropriate in onboarding flow until compiler coverage is expanded.
- Recommendation: add onboarding directories to compiler rollout plan after validating compatibility and performance baselines.

## Lower-Risk / Healthy Signals

- `react-native-mmkv`: active and typically a performance win.
- `react-native-keyboard-controller`: active, but keep versions aligned with RN/new architecture.
- `react-native-vision-camera`: active and capable; tune frame processors carefully on Android.
- `react-native-quick-crypto`: active and typically much faster than JS crypto shims.
- `react-native-ble-plx`: active but still needs defensive reconnect/error handling on Android.

## Suggested Priority

1. **P0 (replace soon):** `react-native-elevated-view`, `react-native-material-textfield`, `react-native-browser-polyfill`
2. **P1 (stabilize/phase out):** `react-native-background-timer`, `react-native-swipe-gestures`, `react-native-level-fs`
3. **P2 (roadmap):** `react-native-i18n` migration, React Navigation major upgrade, and module resolver standardization

## Notes

- This review is positioned as a code-quality and maintainability assessment for onboarding-related work, not a dependency vulnerability audit.
- Signals are based on maintainer activity, release recency, ecosystem trajectory, Android issue patterns, and perf characteristics.

## Additional Onboarding Findings (Code Quality)

1. **P0: Large, mixed-responsibility onboarding screens**
   - `app/components/Views/Onboarding/index.tsx` and `app/components/Views/ImportFromSecretRecoveryPhrase/index.js` centralize UI rendering, navigation, analytics, tracing, async auth flow handling, and error presentation in single files.
   - Risk: high cognitive load and regression surface during onboarding updates.
   - Recommendation: extract domain hooks and flow utilities (social auth, trace lifecycle, error mapping) and keep screen files mostly orchestration + UI composition.

2. **P1: Unmanaged timeout-based UX delays in onboarding auth flow**
   - Multiple `setTimeout` calls are used to delay loading state teardown.
   - Risk: delayed state updates can fire after navigation changes/unmount and create race-prone UX.
   - Recommendation: prefer explicit async flow completion signals; if timeout is retained, track and clear on cleanup/unmount.

3. **P1: Hook dependency suppression in onboarding-critical files**
   - `react-hooks/exhaustive-deps` is explicitly disabled in onboarding components.
   - Risk: stale closures and behavior drift during refactors.
   - Recommendation: reduce suppression scope and align effects with explicit data dependencies.

4. **P1: Production console logging in user-facing onboarding paths**
   - `console.warn` / `console.error` are present in onboarding interaction paths.
   - Risk: inconsistent observability and noisy logs.
   - Recommendation: route through project logging/telemetry patterns for structured diagnostics.

5. **P1: Hardcoded user-facing copy**
   - At least one user-facing security alert string in import flow is hardcoded.
   - Risk: localization inconsistency and translation drift.
   - Recommendation: move all user-visible copy to localization keys.

6. **P2: Legacy styling approach in onboarding sheet**
   - `app/components/Views/OnboardingSheet/index.tsx` still uses `View` + `StyleSheet`.
   - Risk: styling inconsistency with ongoing design-system/tailwind migration.
   - Recommendation: migrate to design-system primitives and tailwind-based styling approach.

7. **P2: Route string literals still used in onboarding transitions**
   - Some transitions rely on raw route names.
   - Risk: brittle navigation refactors and typo risk.
   - Recommendation: centralize route usage through constants/enums.

## TypeScript Standardization Recommendation

- Onboarding flow should move to a TypeScript-first standard: new onboarding files in `.ts/.tsx`, and staged migration for remaining `.js` files (starting with `app/components/Views/ImportFromSecretRecoveryPhrase/index.js`).
- Avoid `any`; prefer explicit types for:
  - onboarding route params,
  - social login provider/result payloads,
  - view-local reducer/state shapes,
  - analytics payload builders and trace context objects.
- Add/strengthen lint gates for onboarding directories to prevent new JS or untyped public interfaces.

## `useEffect` Pattern for Onboarding (Decision Rule)

- Apply this rule: use effects only for synchronization with external systems (navigation side effects, native APIs, subscriptions, storage/network synchronization).
- If logic can be derived from props/state during render, calculate it in render.
- If logic is caused by user interaction (button tap, submit), keep it in the event handler.
- Prefer removing redundant effect-driven state and reduce effect chaining.
- This aligns with React guidance: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
