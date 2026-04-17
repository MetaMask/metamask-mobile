# MetaMask Mobile Farm — CDP Summary

## Purpose

Quick reference for the CDP / device / in-app capability slices that are currently exposed by the mobile agentic runner, and which are structurally absent compared to the extension farm.

For the detailed rationale, validation notes, and capability-family discussion, see [CDP-capabilities-mobile.md](./CDP-capabilities-mobile.md).

## Validated Capability Matrix (mobile)

| Family | Slice | Canonical Recipe | Substrate | Live Status |
| --- | --- | --- | --- | --- |
| `runtime` | sync / async / ref evaluation | any `teams/perps/recipes/benchmark/*.json` | Hermes `Runtime.evaluate` | validated |
| `page` | route navigate + synchronize | `teams/perps/recipes/benchmark/perps-position-market-buy.json` | `__AGENTIC__` bridge + fiber walk | validated |
| `page` | interaction (press/scroll/set_input) | `teams/perps/recipes/benchmark/perps-position-market-buy.json` | `__AGENTIC__` + React DevTools hook | validated |
| `lifecycle` | background / foreground / restart | `teams/perps/recipes/benchmark/perps-app-restart-preserves-state.json` | `xcrun simctl` (iOS) / `adb` (Android) | validated |
| `app_state` | testnet toggle / provider / account | `teams/perps/recipes/benchmark/perps-position-market-buy.json` | Redux + `Engine.context.*` | validated |
| `evidence` | screenshot | any benchmark recipe | `screenshot.sh` wrapper | validated |
| `performance` | metrics snapshot | `teams/perps/recipes/capabilities/performance-metrics-smoke.json` | `HermesInternal.getInstrumentedStats()` via `eval_sync` | validated |
| `trace` | sampling CPU profile (.cpuprofile) | `teams/perps/recipes/capabilities/profiler-trace-smoke.json` | Hermes `Profiler` domain via CDP | validated |

## Structurally Absent (documented gaps)

| Family | Extension status | Mobile status | Reason |
| --- | --- | --- | --- |
| `network` | validated | absent | Hermes has no Network CDP domain. iOS NLC is system-wide, not app-scoped. |
| `emulation` (CPU) | validated | absent | Hermes has no Emulation CDP domain. |
| `emulation` (media / timezone) | validated | absent | No Hermes Emulation; simctl possible but out of scope. |
| `storage` (web storage) | validated | partial | No Hermes Storage domain. MMKV/Redux clear is available via `eval_ref` instead. |
| `service_worker` | validated | N/A | No worker concept in RN. Closest = `app_background`/`app_foreground`. |
| `target` (multi-page) | validated | N/A | One Hermes target per simulator. |
| `browser` (permissions) | validated | partial | No Browser CDP domain. `xcrun simctl privacy` possible; deferred. |
| `fetch` (request failure) | validated | absent | No Hermes Fetch domain. XHR / `global.fetch` monkey-patch possible via `eval_sync`; deferred. |
| `page` (reload) | validated | partial | `app_restart` is the mobile analog; already exposed. |

## Structure

Mobile uses the same namespacing convention as extension:

- MetaMask / domain-specific recipes:
  - `teams/perps/recipes/benchmark/...` — migrated Detox e2e specs
  - `teams/perps/recipes/...` — other perps-domain recipes
- Capability / CDP-generic recipes:
  - `teams/perps/recipes/capabilities/...`

This keeps product behavior separate from generic capability proofs.

## Validation Stance

Same contract as extension: smallest trustworthy proof per slice.

- Hermes-layer controls (Profiler, getInstrumentedStats): the CDP response is the source of truth; artifact existence + size is the proof.
- Device-layer controls (simctl/adb): before/after probe of the page-visible effect.
- App-layer controls (Redux, Engine.context, `__AGENTIC__`): direct eval of state or bridge function.
- Structurally absent families are documented as gaps; no synthetic equivalents are forced.

## Current Gaps (beyond structural)

- `xcrun simctl privacy` permission grant/reset is not yet wrapped in a runner verb.
- `global.fetch` / `XMLHttpRequest` monkey-patch is not yet exposed as a first-class `fetch_fail` primitive.

## References

- [CDP-capabilities-mobile.md](./CDP-capabilities-mobile.md) — detailed writeup
- [e2e-recipe-benchmark.md](./e2e-recipe-benchmark.md) — Detox → agentic benchmark
- [validate-recipe.js](./validate-recipe.js) — runner entry
- [cdp-bridge.js](./cdp-bridge.js) — CDP command dispatcher
- [lib/workflow.js](./lib/workflow.js) — action allowlist
