# MetaMask Mobile Farm — CDP Capabilities and Validation Notes

## Purpose

This document is the mobile mirror of the extension farm's CDP capabilities study. It records:

- which runner capabilities are intended to be exposed through the mobile agentic runner
- how those capabilities should be validated
- what has already been validated live
- which capability families are structurally absent on mobile vs. extension and why
- which gaps are still worth closing

On extension, the substrate is Chrome/CDP against a browser tab + extension worker. On mobile, the substrate is:

- **Hermes CDP** (via Metro's inspector-proxy) against the React Native JS runtime
- **Device-layer controls** via `xcrun simctl` (iOS) and `adb` (Android)
- **In-app bridges**: `globalThis.__AGENTIC__`, Redux `store`, `Engine.context.*`, React DevTools hook

Those three layers together are what the recipe runner composes. The split between "can the platform apply the condition" and "can a meaningful app-level signal reflect that condition" applies here exactly as it does on extension.

## Current Position

The mobile runner exposes recipe-facing intent, not raw CDP plumbing. Validated slices are:

- `eval_sync`, `eval_async`, `eval_ref` — page/runtime-only evaluation
- `navigate`, `press`, `scroll`, `set_input`, `type_keypad`, `clear_keypad` — UI interaction
- `wait`, `wait_for` — synchronization
- `screenshot` — evidence capture
- `select_account`, `toggle_testnet`, `switch_provider` — app-surface operations
- `app_background`, `app_foreground`, `app_restart` — lifecycle control (iOS simctl / Android adb)
- `trace_start`, `trace_stop` — Hermes sampling profiler (added in this PR; awaiting live validation, see below)

The important split on mobile:

- **control primitive**: Hermes CDP or simctl/adb applies the condition
- **proof primitive**: a recipe or direct probe observes a meaningful difference

For capabilities that Chrome/CDP makes trivial on extension (network, storage, fetch, emulation), the Hermes runtime on mobile does not support the equivalent CDP domain. When that gap exists we document it rather than forcing a synthetic equivalent.

## Validated Live (pre-existing)

The 8 benchmark recipes under `teams/perps/recipes/benchmark/` already prove the following slices live on `mm-2`:

- `eval_sync` / `eval_ref` — direct Redux + `Engine.context.*` reads and writes
- `navigate` — nested route navigation (parent/child) via `__AGENTIC__.navigate`
- `press` / `set_input` / `type_keypad` — fiber-tree-driven interactions
- `wait_for` — route/testID/expression-based synchronization
- `app_background` / `app_foreground` / `app_restart` — iOS simctl lifecycle

Benchmark comparison (from `e2e-recipe-benchmark.md`):

| Spec | Detox (s) | Agentic (s) | Speedup |
| --- | --- | --- | --- |
| perps-position | 133 | 37 | 3.59x |
| perps-position-stop-loss | 119 | 31 | 3.83x |
| perps-limit-long-fill | 116 | 28 | 4.14x |
| **Total** | **368** | **96** | **3.83x** |

That proves the runner contract on UI flows. The capability parity work below extends the same contract to browser-style capability families so the mobile story matches the extension story.

## Added in this PR (live-validated 2026-04-17 on mm-2)

### Performance — metrics snapshot

Mobile mirror of extension's `performance` capability. Uses existing `eval_sync` to snapshot:

- `global.performance.now()` (Hermes high-resolution timer)
- `HermesInternal.getInstrumentedStats()` — GC counters, heap/allocation stats, RN bridge counters

Validation shape:

1. navigate to a stable Perps screen
2. capture a baseline snapshot
3. run a bounded UI workload (press market list item → wait for market detail route)
4. capture another snapshot
5. verify both snapshots are returned successfully (`hasHermes`, `statCount > 0`, `ts > 0`)

Canonical smoke recipe:
- `scripts/perps/agentic/teams/perps/recipes/capabilities/performance-metrics-smoke.json`

Expected conclusion after live run:
- the mobile runner exposes a lightweight perf snapshot surface via existing `eval_sync`
- no new primitive needed — `HermesInternal.getInstrumentedStats()` is the direct Hermes analog to Chrome's `Metrics.Timestamp`
- differs from extension only in the exact metric keys (Hermes `js_*` stats vs. Chrome `Metrics.*`)

### Tracing — Hermes sampling profiler

Mobile mirror of extension's `trace_start`/`trace_stop` capability. Hermes exposes the CDP `Profiler` domain (sampling profiler); the output is a Chrome-compatible `.cpuprofile` that loads directly in Chrome DevTools Performance panel.

Runner additions in this PR:

- `cdp-bridge.js`: new `profiler-start` + `profiler-stop` commands that call `Profiler.enable` + `Profiler.start` / `Profiler.stop` over the existing ws-client, then dump the returned `profile` object to disk
- `validate-recipe.js`: new `trace_start` and `trace_stop` action cases; `trace_stop` routes the artifact to `artifacts.tracesDir/trace-<label>.cpuprofile`
- `lib/workflow.js`: `trace_start`, `trace_stop` added to `EXECUTABLE_ACTIONS`

Validation shape:

1. navigate to a stable Perps screen
2. `trace_start` with a label
3. run a bounded UI workload (press market list item → wait for market detail route)
4. `trace_stop` with the same label
5. verify `sizeBytes > 0` and `path` is non-null

Canonical smoke recipe:
- `scripts/perps/agentic/teams/perps/recipes/capabilities/profiler-trace-smoke.json`

Artifact location:
- `artifacts.tracesDir/trace-<label>.cpuprofile` (under the per-run artifact directory, `.agent/recipe-runs/<timestamp>_<recipe>/traces/`)

Expected conclusion after live run:
- Hermes sampling profiler is reachable through Metro's inspector-proxy via the `Profiler` domain
- the runner-side trace path works for starting/stopping a bounded profile
- the artifact is Chrome-DevTools-compatible (`.cpuprofile`)

Live-validation note (2026-04-17, mm-2, iOS 26.3, Hermes via Metro inspector-proxy):

- `Profiler.enable` is **not supported** on Hermes (`-32601 Unsupported method 'Profiler.enable'`). This is a Hermes-specific divergence from standard CDP — the bridge calls `Profiler.start`/`stop` directly without `enable`.
- `Profiler.start` returns `{}` successfully.
- `Profiler.stop` returns a complete `.cpuprofile` (keys: `startTime`, `endTime`, `nodes`, `samples`, `timeDeltas`). Observed smoke run: 7,539 call-graph nodes, 198 samples over a 2.2 s window, 2.4 MB artifact.
- Artifact loads in Chrome DevTools → Performance → Load profile.

## Important Distinction

There are two different validation questions, same as on extension:

1. **Can the mobile substrate apply the condition?**
   - For Hermes profiling: yes, Hermes exposes `Profiler` domain
   - For `HermesInternal.getInstrumentedStats()`: yes, always present in Hermes-built RN apps
   - For browser-style network/fetch/storage control: no, Hermes has no Network/Fetch/Storage CDP domain

2. **Does a chosen app-level signal reflect that condition reliably?**
   - For the profiler: the `.cpuprofile` itself is the signal, independent of app code
   - For perf metrics: `HermesInternal.getInstrumentedStats()` returns deterministic counters

## Recommended Capability Families — Mobile Status

### Supported today (with or after this PR)

| Family | Recipe-facing shape | Mobile path | Status |
| --- | --- | --- | --- |
| Runtime / Eval | `eval_sync`, `eval_async`, `eval_ref` | Hermes `Runtime.evaluate` | validated (pre-existing) |
| Page / Route | `navigate`, `wait_for`, `press`, `scroll`, `set_input` | `__AGENTIC__` bridge + React DevTools hook fiber walk | validated (pre-existing) |
| Page lifecycle | `app_background`, `app_foreground`, `app_restart` | `xcrun simctl launch` / terminate, `adb shell monkey` | validated (pre-existing) |
| Screenshot | `screenshot` | `screenshot.sh` wrapper | validated (pre-existing) |
| Performance (metrics snapshot) | `eval_sync` on `HermesInternal.getInstrumentedStats()` | Hermes built-in | validated live (2026-04-17) |
| Tracing (sampling CPU profile) | `trace_start`, `trace_stop` | Hermes `Profiler` domain via CDP | validated live (2026-04-17) |

### Structurally absent (document as gap, do not force)

| Family | Why absent | Workaround path |
| --- | --- | --- |
| Network (offline/throttling) | Hermes has no Network CDP domain. iOS Network Link Conditioner is system-wide, not app-scoped. | If needed: XHR/fetch monkey-patch via `eval_sync` for targeted request failure (narrow). System-wide NLC via `xcrun simctl` for whole-device throttling (blunt). |
| Emulation — CPU throttling | Hermes has no Emulation CDP domain. | Synthetic: tight JS loop via `eval_sync` to burn main-thread cycles (not equivalent to real CPU throttling). |
| Emulation — media / timezone | No Hermes Emulation domain. | `xcrun simctl status_bar` + Appearance preferences; requires simulator manipulation outside Hermes. |
| Storage — web storage | Hermes has no Storage CDP domain. | MMKV / Redux can be cleared via `eval_ref` targeting `Engine.context.*` + `store.dispatch(purge)`. Document as `eval_ref`-based pattern rather than a new capability. |
| Service worker | No web worker concept in RN. | Closest analog = `app_background` / `app_foreground` (already exposed). |
| Target (multi-page switching) | Single app target per device. | N/A — mobile has one Hermes target per booted simulator. |
| Browser permissions (grant/reset) | No Browser CDP domain. | `xcrun simctl privacy` can grant/reset camera, photos, location, contacts at the OS level. Deferred; not included in this PR. |
| Fetch — deterministic request failure | No Fetch CDP domain. | XHR / global fetch monkey-patch via `eval_sync` (scoped to JS-side). Does not cover native network layer. |

## Recipe Runner Vocabulary (mobile)

After this PR, the full set of recipe-facing verbs is:

**UI interaction**: `navigate`, `wait`, `wait_for`, `press`, `scroll`, `set_input`, `type_keypad`, `clear_keypad`

**Evaluation**: `eval_sync`, `eval_async`, `eval_ref`

**App state**: `select_account`, `toggle_testnet`, `switch_provider`

**Lifecycle**: `app_background`, `app_foreground`, `app_restart`

**Evidence**: `screenshot`, `log_watch`, `manual`

**Profiling (new)**: `trace_start`, `trace_stop`

**Control**: `switch`, `end`, `call`

This vocabulary intentionally converges with the extension runner where semantics align (`trace_start`/`trace_stop` match extension verb names) and diverges where mobile has no equivalent primitive (no `network`, `fetch`, `storage`, `emulation`, `service_worker`, `target`, `browser`).

## Validation Stance

Mobile parity proofs use the smallest trustworthy validation contract for each slice, same as extension:

- For Hermes-layer controls (profiler, getInstrumentedStats), the Hermes runtime itself is the source of truth — the proof is that the CDP call returns a well-formed result and, for tracing, that the `.cpuprofile` file is non-empty and parseable by Chrome DevTools.
- For device-layer controls (simctl), when they are eventually added, the proof is a before/after probe of the page-visible effect.
- For capability families that are structurally absent, we do not manufacture a pseudo-equivalent; we document the gap.

## Suggested Next Steps

1. Run the two new capability smokes live on `mm-2` (see verification section of the accompanying plan).
2. If `trace_start`/`trace_stop` passes live, lock in `trace_stop` artifacts as part of the default run artifact set (include in `.agent/recipe-runs/<run>/traces/`).
3. Consider adding a thin `xcrun simctl privacy` wrapper (`permission_grant` / `permission_reset`) — this is the smallest useful gap to close for the "controlled experiment" story on mobile.
4. Consider exposing a `fetch` fault-injection primitive via an `eval_ref` that monkey-patches `global.fetch` / `XMLHttpRequest` — scoped, reversible, explicit. Defer until a concrete recipe demand surfaces.
5. Do **not** attempt a synthetic network-throttling primitive on mobile. The honest story is that mobile runs against real testnet; network conditioning belongs to a different test substrate (Detox mock servers or whole-device NLC) and forcing a fake equivalent weakens the parity claim.

## Practical Rule

Same as on extension:

- If recipes need a capability often, give it a recipe-facing abstraction.
- If it is mainly diagnostic, keep it explicit and separate.
- Validate it with the smallest differential probe that shows it really works.

When the mobile substrate cannot support a capability, document the gap rather than force an inaccurate analog.

## References

- [CDP-summary-mobile.md](./CDP-summary-mobile.md) — quick-reference matrix
- [e2e-recipe-benchmark.md](./e2e-recipe-benchmark.md) — Detox → agentic migration benchmark
- [validate-recipe.js](./validate-recipe.js) — recipe runner entry (action dispatch at ~L1223)
- [cdp-bridge.js](./cdp-bridge.js) — CDP command dispatcher (profiler commands at ~L561)
- [lib/workflow.js](./lib/workflow.js) — action allowlist
- [teams/perps/recipes/capabilities/performance-metrics-smoke.json](./teams/perps/recipes/capabilities/performance-metrics-smoke.json)
- [teams/perps/recipes/capabilities/profiler-trace-smoke.json](./teams/perps/recipes/capabilities/profiler-trace-smoke.json)
