# Perps E2E Recipe Benchmark

Detox perps specs couple tightly to mock infra (commandQueueServer, deposit mocks, price manipulation) that only exists inside the Detox harness. Slow to iterate, fragile, often skipped in CI.

The agentic recipe runner (`validate-recipe.js`) drives a live app via Hermes CDP — no mocks. This doc records the migration of 8 Detox/Playwright specs to recipe JSON plus a wall-clock comparison.

## Results

8/8 recipes validated on `mm-2` testnet; full UI-navigation parity with their Detox counterparts.

### Risk-free (no trades)

| Recipe | Detox spec | Nodes | Coverage |
| --- | --- | --- | --- |
| perps-no-funds-tutorial | smoke/perps/perps-no-funds-tutorial.spec.ts | 7/7 | tutorial show/dismiss via controller state |
| perps-add-funds | smoke/perps/perps-add-funds.spec.ts | 9/9 | UI navigation; Detox also mocks deposit server-side |
| perf-add-funds | performance/login/perps-add-funds.spec.ts | 7/7 | simplified variant |

### Trades (real testnet orders)

| Recipe | Detox spec | Nodes | Coverage |
| --- | --- | --- | --- |
| perps-position | smoke/perps/perps-position.spec.ts | 11/11 | open long ETH, set TP/SL, close |
| perps-position-stop-loss | smoke/perps/perps-position-stop-loss.spec.ts | 9/9 | open long ETH, set SL, verify, close |
| perps-position-liquidation | smoke/perps/perps-position-liquidation.spec.ts | 9/9 | UI parity; Detox also mocks price manipulation |
| perf-position-management | performance/login/perps-position-management.spec.ts | 9/9 | open BTC long, verify, close |
| perps-limit-long-fill | smoke/perps/perps-limit-long-fill.spec.ts | 22/22 | limit long ETH at Mid, fill, cleanup |

Detox mocks server-side behavior (deposits, liquidations) — neither approach tests real backend execution. Both validate the UI flow.

## What each approach validates

**Recipes** — no build cycle, idempotent setup/teardown hooks, composable flows (`trade-open-market`, `trade-close-position`, `tpsl-create`), real testnet orders.

**Detox** — hermetic app-data wipe before each test, mocked deposits / price / liquidations, pixel-level visual assertions, multi-app coordination.

## Shared flows

| Flow | Purpose |
| --- | --- |
| `setup-testnet` | enable testnet, verify markets load |
| `trade-open-market` | nav → keypad → place market order |
| `trade-close-position` | nav → close → confirm |
| `tpsl-create` | open auto-close, set TP/SL presets |

## Layout

- Recipes: `scripts/perps/agentic/teams/perps/recipes/benchmark/`
- Flows: `scripts/perps/agentic/teams/perps/flows/`
- Runner: `scripts/perps/agentic/validate-recipe.js`

## Running

```bash
# single
IOS_SIMULATOR=mm-2 node scripts/perps/agentic/validate-recipe.js \
  scripts/perps/agentic/teams/perps/recipes/benchmark/perps-position.json

# all
for f in scripts/perps/agentic/teams/perps/recipes/benchmark/*.json; do
  IOS_SIMULATOR=mm-2 node scripts/perps/agentic/validate-recipe.js "$f"
done
```

Prereqs: `mm-2` iOS simulator, Metro running (`yarn start`), wallet unlocked, sufficient testnet balance for trades.

## Timing benchmark

Wall-clock comparison of Detox smoke specs vs their agentic recipes on a Detox debug build (`__DEV__=true`, `ios.sim.main`). Only 3 Detox smoke specs are active (not skipped); the other 5 recipes migrate skipped or Playwright specs.

### Dual-simulator architecture

Detox and recipes need different builds + env — run sequentially on two sims.

| | Detox (phase 1) | Agentic (phase 2) |
| --- | --- | --- |
| Simulator | `detox-benchmark` (safe to wipe) | `mm-2` (dev wallet) |
| Build | e2e debug (`yarn test:e2e:ios:debug:build`) | dev debug (`yarn a:setup:ios`) |
| Metro port | shared `WATCHER_PORT` from `.js.env` (e.g. 8062) | same |
| Metro env | `METAMASK_ENVIRONMENT=e2e` | `METAMASK_ENVIRONMENT=dev` |
| Accounts | fixture-injected ($10k fake) | real wallet (testnet) |
| API | mock server | real Hyperliquid testnet |

Detox wipes app data per test (`launchApp({ delete: true })`), so the dedicated sim protects the dev wallet. Port is shared across phases with Metro restarted between them — running two Metros on different ports breaks Expo Dev Client deep links (the cached `WATCHER_PORT` from `.js.env` resolves to the wrong bundle).

### Trade path difference

Detox runs the full UI deposit form; the e2e env overrides `depositWithOrder()` to bypass real Arbitrum USDC infra. Dev has no such override — so recipes call `PerpsController.placeOrder()` directly via CDP. Different layers, same feature: Detox proves the UI flow with mocks, recipes prove the controller/API on real testnet.

### Setup

```bash
xcrun simctl create "detox-benchmark" "iPhone 16 Pro"    # one-time
yarn test:e2e:ios:debug:build                            # Detox build
yarn a:setup:ios                                         # dev build + wallet
bash scripts/perps/agentic/run-timing-benchmark.sh       # run benchmark
# override sims: DETOX_SIMULATOR=... AGENTIC_SIMULATOR=... bash ...
```

### Results (2026-04-16)

| Spec | Detox (s) | Agentic (s) | Delta | Speedup |
| --- | --- | --- | --- | --- |
| perps-position | 133 | 37 | 96 | 3.59x |
| perps-position-stop-loss | 119 | 31 | 88 | 3.83x |
| perps-limit-long-fill | 116 | 28 | 88 | 4.14x |
| **TOTAL** | **368** | **96** | **272** | **3.83x** |

Detox wall-clock includes app wipe + reinstall + fixture inject + mock server + test + teardown. Agentic wall-clock includes CDP connect + preflight + recipe + teardown.

## Capability parity with extension

The recipe runner doubles as a capability probe surface: the same graph language that drives the 8 migrated specs also exposes browser/runtime capabilities (perf snapshot, sampling profiler, app lifecycle) for controlled experiments. See:

- [CDP-capabilities-mobile.md](./CDP-capabilities-mobile.md) — capability-family writeup
- [CDP-summary-mobile.md](./CDP-summary-mobile.md) — parity matrix

### Automatic recipe issue review

Every run emits `recipe-issues-review.{json,md}` plus four raw buckets (`recipe-issues.json`, `console-warnings.json`, `console-errors.json`, `runtime-exceptions.json`) under the per-run dir, and attaches a compact `recipeIssues.review` block to `summary.json`. Capture is automatic — recipes do **not** need `log_watch` for generic warnings/errors/exceptions.

Default is observational (`status: clean | review`); opt into hard failure via recipe-level `fail_on_unexpected` (`levels`, `textMatches`, `allowlist`). A `review` finding is not automatic proof the PR caused the signal. Contract is byte-for-byte aligned with extension. Full spec: [CDP-capabilities-mobile.md#automatic-recipe-issue-review](./CDP-capabilities-mobile.md#automatic-recipe-issue-review).
