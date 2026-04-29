# MetaMask Mobile — CDP Summary

Quick-reference parity matrix for the mobile agentic runner. Detailed rationale lives in [CDP-capabilities-mobile.md](./CDP-capabilities-mobile.md).

## Validated capability matrix

| Family | Slice | Substrate | Canonical recipe |
| --- | --- | --- | --- |
| `runtime` | sync / async / ref evaluation | Hermes `Runtime.evaluate` | any `benchmark/*.json` |
| `page` | navigate / press / scroll / set_input | `__AGENTIC__` + React DevTools hook | `benchmark/perps-position-market-buy.json` |
| `page` | `wait_for` route / testID / expression | bridge + fiber walk | same |
| `lifecycle` | background / foreground / restart | `xcrun simctl` (iOS) / `adb` (Android) | `benchmark/perps-app-restart-preserves-state.json` |
| `app_state` | testnet / provider / account | Redux + `Engine.context.*` | `benchmark/perps-position-market-buy.json` |
| `evidence` | screenshot | `screenshot.sh` | any |
| `evidence` | automatic issue review (warnings/errors/exceptions) | Metro log + in-app console hook | `capabilities/recipe-issues-smoke.json` |
| `performance` | metrics snapshot | `HermesInternal.getInstrumentedStats()` | `capabilities/performance-metrics-smoke.json` |
| `trace` | sampling CPU profile (.cpuprofile) | Hermes `Profiler` domain | `capabilities/profiler-trace-smoke.json` |

## Structurally absent (do not force)

| Family | Why | Workaround if needed |
| --- | --- | --- |
| `network` | no Hermes Network domain; iOS NLC is device-wide | XHR/fetch monkey-patch via `eval_sync` |
| `emulation` CPU | no Hermes Emulation | synthetic JS burn loop (not equivalent) |
| `emulation` media/timezone | no Hermes Emulation | `xcrun simctl status_bar` + appearance |
| `storage` web | no Hermes Storage | MMKV/Redux clear via `eval_ref` |
| `service_worker` | no RN analog | `app_background` / `app_foreground` |
| `target` multi-page | one Hermes target per sim | N/A |
| `browser` permissions | no Browser CDP | `xcrun simctl privacy` (deferred) |
| `fetch` request failure | no Hermes Fetch | `global.fetch` / XHR monkey-patch |

## Directory convention

- `teams/<team>/recipes/benchmark/` — migrated Detox specs
- `teams/<team>/recipes/capabilities/` — generic capability proofs
- `teams/<team>/recipes/` — other product recipes

Product behavior stays separate from capability proofs.

## Validation stance

Smallest trustworthy proof per slice:

- Hermes-layer (Profiler, getInstrumentedStats): CDP response shape + artifact size
- Device-layer (simctl/adb): before/after probe of page-visible effect
- App-layer (Redux, Engine.context, `__AGENTIC__`): direct `eval_ref`
- Structurally absent families: documented as gaps, no synthetic equivalents

## References

- [CDP-capabilities-mobile.md](./CDP-capabilities-mobile.md)
- [validate-recipe.js](./validate-recipe.js) — runner
- [cdp-bridge.js](./cdp-bridge.js) — CDP dispatcher
- [lib/workflow.js](./lib/workflow.js) — action allowlist
