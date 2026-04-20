# Perps Timing Benchmark

Wall-clock comparison of Detox smoke specs vs their agentic recipes on a Detox debug build (`__DEV__=true`, `ios.sim.main`). Only 3 Detox smoke specs are active (not skipped); the other 5 recipes migrate skipped or Playwright specs.

## Dual-simulator architecture

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

## Trade path difference

Detox runs the full UI deposit form; the e2e env overrides `depositWithOrder()` to bypass real Arbitrum USDC infra. Dev has no such override — so recipes call `PerpsController.placeOrder()` directly via CDP. Different layers, same feature: Detox proves the UI flow with mocks, recipes prove the controller/API on real testnet.

## Setup

```bash
xcrun simctl create "detox-benchmark" "iPhone 16 Pro"    # one-time
yarn test:e2e:ios:debug:build                            # Detox build
yarn a:setup:ios                                         # dev build + wallet
bash scripts/perps/agentic/run-timing-benchmark.sh       # run benchmark
# override sims: DETOX_SIMULATOR=... AGENTIC_SIMULATOR=... bash ...
```

## Results (2026-04-16)

| Spec | Detox (s) | Agentic (s) | Delta | Speedup |
| --- | --- | --- | --- | --- |
| perps-position | 133 | 37 | 96 | 3.59x |
| perps-position-stop-loss | 119 | 31 | 88 | 3.83x |
| perps-limit-long-fill | 116 | 28 | 88 | 4.14x |
| **TOTAL** | **368** | **96** | **272** | **3.83x** |

Detox wall-clock includes app wipe + reinstall + fixture inject + mock server + test + teardown. Agentic wall-clock includes CDP connect + preflight + recipe + teardown.
