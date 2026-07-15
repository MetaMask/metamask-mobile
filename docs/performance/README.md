# Performance

Mobile is highly sensitive to poorly performing code — a feature implemented inefficiently can slow down even the most performant app. Performance is therefore something we design for at **every stage**, not a clean-up pass at the end.

This folder is the **human guide** to performance on MetaMask Mobile. For AI-assisted work (planning, review, debugging, auditing) the `mms-performance` skill — installed via `yarn skills` and used by Claude/Cursor — carries the codebase-verified, file-level playbook. The two are kept at different altitudes on purpose: **this guide owns the principles, the catalogue, and the tooling; the skill owns the drift-prone, code-specific instances.** Keep them in sync conceptually.

## The one rule: Measure → Optimize → Re-measure → Validate

Never optimize blind:

1. **Measure** a baseline on the _target interaction_ (FPS, re-render count, `trace()` duration, render time). Component-tree depth/count is context, not evidence.
2. **Optimize** with a targeted fix.
3. **Re-measure** the same thing.
4. **Validate** the metric actually moved (e.g. account-switch re-renders 97 → 18, FPS 42 → 60). If it didn't, revert and try the next hypothesis.

Always measure on **Android** (more sensitive, more representative) with the **power-user scenario** (~30 accounts / ~90 assets — see [measuring.md](./measuring.md)).

> If you can't measure in the moment (no device handy), do the static analysis, form a code-evidence hypothesis, and treat it as **unvalidated** until measured. Don't present a hypothesis as a measured fact.

## Environment facts that shape the advice

| Fact                                                                           | Consequence                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| React Native 0.81, **New Architecture on**, **Hermes on both iOS and Android** | React Native DevTools works on **both** platforms (the old "iOS is JSC, use React DevTools" note is obsolete) |
| Reanimated **v3**                                                              | Use `useSharedValue`/`useAnimatedStyle`/`runOnJS` — not the v4 `react-native-worklets`/`scheduleOn*` APIs     |
| FlashList **v2**                                                               | `estimatedItemSize` is deprecated; use stable keys + `getItemType`                                            |
| `app/util/trace.ts` (`trace()` + `TraceName`)                                  | The first-class way to instrument a flow — already wired to Sentry                                            |
| Reassure installed                                                             | Guard render-time regressions with `*.perf-test.tsx`                                                          |
| React Compiler                                                                 | Opt-in per directory in `babel.config.js` (`target:'18'`)                                                     |
| Redux + reselect                                                               | The committed state architecture — move transient state to local state, not a new lib                         |

## Performance across the lifecycle

| Stage              | What to do                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Planning**       | Identify data-shape risks (real-time data, unbounded lists, heavy compute, many API calls) and set perf acceptance criteria. → [anti-patterns.md](./anti-patterns.md) |
| **System design**  | Decide state shape, selector memoization, list strategy, subscription lifecycle, instrumentation up front                                                             |
| **Development**    | Follow the anti-pattern catalogue; develop on Android with power-user data                                                                                            |
| **Review / audit** | Run the catalogue checks against the diff/feature → [anti-patterns.md](./anti-patterns.md)                                                                            |
| **Testing**        | Add Reassure tests / E2E perf gates where it matters → [measuring.md](./measuring.md)                                                                                 |
| **Debugging**      | Symptom-first triage with the right tool → [tools.md](./tools.md)                                                                                                     |
| **Fixing**         | Apply the fix, then re-measure and validate                                                                                                                           |
| **Production**     | Watch Sentry; profile release builds when a regression is reported                                                                                                    |

## In this folder

- **[anti-patterns.md](./anti-patterns.md)** — the catalogue: selectors, Redux/`useSelector`, Context, hook deps, unstable hook returns, lists, layout animations, eager-work-on-mount, streaming, bundle/barrel, memory.
- **[tools.md](./tools.md)** — symptom-first decision tree + when/how to use each tool (Perf Monitor, RN DevTools, Flashlight, `trace()`, Reassure, E2E gates, Release Profiler, Sentry).
- **[measuring.md](./measuring.md)** — the power-user scenario, TTI via `trace()`, render-regression tests, FPS benchmarking, CI gates.
- **[react-compiler.md](./react-compiler.md)** — automatic memoization: how it's set up here and how to opt a feature in.

## Deep dives & references

- [Reassure (render-regression testing)](../readme/reassure.md)
- [Release build profiler](../readme/release-build-profiler.md)
- [Animations](../readme/animations.md)
- [`app/util/trace.ts`](../../app/util/trace.ts) — the `trace()`/`TraceName` instrumentation API
- The `mms-performance` AI skill (via `yarn skills`) — the codebase-verified playbook
- Internal: the **Performance Guide for Engineers** (Confluence, TL1 space) for tool walkthrough recordings, and the **Power-user SRPs** page for ready-made test wallets — ask the Mobile Platform team
- [Callstack — The Ultimate Guide to React Native Optimization](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-optimization)
