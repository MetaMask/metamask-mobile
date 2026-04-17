# MetaMask Mobile — CDP Capabilities

Mobile mirror of the extension's CDP capabilities study. Records which runner capabilities are exposed, how they're validated, and which families are structurally absent.

Substrate:

- **Hermes CDP** via Metro inspector-proxy (Runtime.evaluate, Profiler)
- **Device layer** via `xcrun simctl` (iOS) / `adb` (Android)
- **In-app bridges**: `globalThis.__AGENTIC__`, Redux `store`, `Engine.context.*`, React DevTools hook

## Supported families

| Family | Recipe verbs | Mobile path | Status |
| --- | --- | --- | --- |
| Runtime / eval | `eval_sync`, `eval_async`, `eval_ref` | `Runtime.evaluate` | validated |
| UI interaction | `navigate`, `press`, `scroll`, `set_input`, `type_keypad`, `wait_for` | `__AGENTIC__` + fiber walk | validated |
| Lifecycle | `app_background`, `app_foreground`, `app_restart` | simctl / adb | validated |
| App surface | `select_account`, `toggle_testnet`, `switch_provider` | Redux + `Engine.context.*` | validated |
| Evidence (manual) | `screenshot`, `log_watch`, `manual` | `screenshot.sh` / Metro log | validated |
| Evidence (automatic) | built-in run-wide issue review | Metro log + in-app console hook | validated 2026-04-17 |
| Performance | `eval_sync` on `HermesInternal.getInstrumentedStats()` | Hermes built-in | validated 2026-04-17 |
| Tracing | `trace_start`, `trace_stop` | Hermes `Profiler` via CDP | validated 2026-04-17 |

The runner exposes intent, not raw CDP plumbing. Canonical recipes live in `teams/perps/recipes/capabilities/`.

## Structurally absent (document, don't force)

| Family | Why | Workaround |
| --- | --- | --- |
| Network (offline/throttling) | no Hermes Network domain; iOS NLC is device-wide | XHR/fetch monkey-patch via `eval_sync` (narrow); simctl NLC (blunt) |
| Emulation — CPU | no Hermes Emulation domain | synthetic JS burn loop (not equivalent) |
| Emulation — media / timezone | no Hermes Emulation domain | `xcrun simctl status_bar` + appearance |
| Storage (web) | no Hermes Storage domain | MMKV / Redux clear via `eval_ref` |
| Service worker | no RN analog | `app_background` / `app_foreground` |
| Target (multi-page) | one Hermes target per simulator | N/A |
| Browser permissions | no Browser CDP domain | `xcrun simctl privacy` (deferred) |
| Fetch (request failure) | no Hermes Fetch domain | `global.fetch` / XHR monkey-patch |

## Capability details

### Performance metrics snapshot

`eval_sync` on `HermesInternal.getInstrumentedStats()` — GC counters, heap/allocation stats, RN bridge counters — plus `global.performance.now()` for timestamps. Direct Hermes analog to Chrome's `Metrics.Timestamp`. Canonical: `capabilities/performance-metrics-smoke.json`.

### Hermes sampling profiler

`trace_start` / `trace_stop` call the CDP `Profiler` domain. Output is a Chrome-compatible `.cpuprofile` under `.agent/recipe-runs/<run>/traces/trace-<label>.cpuprofile`. Hermes quirk: `Profiler.enable` is unsupported (`-32601`); bridge calls `start` / `stop` directly. Canonical: `capabilities/profiler-trace-smoke.json`.

Wiring: `cdp-bridge.js` `profiler-start` / `profiler-stop`; `validate-recipe.js` action cases; `lib/workflow.js` verb allowlist.

### Automatic recipe issue review

Every recipe run emits a uniform review contract without per-recipe wiring. Workers do **not** add `log_watch` for generic warnings/errors/exceptions.

Dual-channel capture, merged at teardown:

- **In-app console hook** — one-shot `Runtime.evaluate` at run start wraps `console.warn` / `console.error`, attaches `error` / `unhandledrejection` listeners, chains `ErrorUtils.setGlobalHandler`. Pushes to `globalThis.__AGENTIC_ISSUES__` (500-entry cap).
- **Metro log tail** — records byte offset at run start; classifies the appended slice at teardown via regex (`WARN`, `ERROR`, `Uncaught` / `unhandledRejection` / `FATAL EXCEPTION`).

Artifacts per run dir (`.agent/recipe-runs/<timestamp>_<recipe>/`):

| File | Content |
| --- | --- |
| `recipe-issues.json` | all issues, deduped by `(level, channel, source, textHash)` |
| `console-warnings.json` | `level === "warning"` |
| `console-errors.json` | `level === "error"` |
| `runtime-exceptions.json` | `level === "exception"` |
| `recipe-issues-review.json` | synthesized worker-facing review |
| `recipe-issues-review.md` | human-readable equivalent |

`summary.json.recipeIssues = { captured, unexpected, failOn, review }` where `review = { status, note, observed, gating, informational, topIssues, artifactFiles }`.

`review.status`:

- `clean` — nothing captured
- `review` — passed but issues observed; worker should mention with artifact paths. **Not automatic proof the PR caused the signal** (may be ambient RN noise).
- `gating` — `fail_on_unexpected` matched; recipe forced to `FAIL`

Opt-in gating (recipe top-level, all sub-fields optional):

```json
{
  "fail_on_unexpected": {
    "levels": ["error", "exception"],
    "textMatches": ["^Fatal:", "SES_UNCAUGHT"],
    "allowlist": [
      { "textMatch": "ExpoModulesProxy", "level": "warning", "reason": "known benign" }
    ]
  }
}
```

Allowlist is evaluated first: matches move `observed` → `informational` and never trigger gating.

Canonical: `capabilities/recipe-issues-smoke.json`.

Limitations:

- No WebView / in-app browser console (no mobile WebView CDP target).
- No native crash ingestion (iOS crash reports, Crashlytics, Sentry). JS layer only.
- No Android logcat (scope = iOS simulator).
- Metro regex classification is coarser than real CDP event types; in-app hook entries preferred when both channels report same text.
- In-app hook installs at run start; boot-time exceptions fall through to metro-log only.

## Recipe vocabulary

**UI**: `navigate`, `wait`, `wait_for`, `press`, `scroll`, `set_input`, `type_keypad`, `clear_keypad`
**Eval**: `eval_sync`, `eval_async`, `eval_ref`
**App state**: `select_account`, `toggle_testnet`, `switch_provider`
**Lifecycle**: `app_background`, `app_foreground`, `app_restart`
**Evidence**: `screenshot`, `log_watch`, `manual`
**Profiling**: `trace_start`, `trace_stop`
**Control**: `switch`, `end`, `call`

Converges with extension where semantics align; diverges where mobile has no primitive (no `network`, `fetch`, `storage`, `emulation`, `service_worker`, `target`, `browser`).

## Next steps

1. Wrap `xcrun simctl privacy` as `permission_grant` / `permission_reset` — smallest useful gap for controlled experiments.
2. Expose `global.fetch` / XHR fault injection via `eval_ref`. Defer until a concrete recipe demands it.
3. **Do not** add synthetic network throttling. Network conditioning belongs to Detox mock servers or whole-device NLC; a fake primitive weakens the parity claim.

## References

- [CDP-summary-mobile.md](./CDP-summary-mobile.md) — matrix only
- [e2e-recipe-benchmark.md](./e2e-recipe-benchmark.md) — Detox → agentic benchmark
- [validate-recipe.js](./validate-recipe.js), [cdp-bridge.js](./cdp-bridge.js), [lib/workflow.js](./lib/workflow.js)
- `teams/perps/recipes/capabilities/` — canonical smokes
