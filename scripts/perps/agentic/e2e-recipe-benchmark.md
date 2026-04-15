# Perps E2E Recipe Benchmark

## Why

Detox e2e specs for Perps are tightly coupled to mock infrastructure (commandQueueServer, mock deposit server, price manipulation) that only exists inside the Detox test harness. This makes them:

- **Slow to iterate on** — require full Detox build/boot cycle
- **Fragile** — break when test harness or mock contracts change
- **Hard to run locally** — many specs are skipped in CI

The agentic recipe runner (`validate-recipe.js`) connects to a live app via CDP (Chrome DevTools Protocol over Hermes) and can execute the same user flows without mock infrastructure. This benchmark migrates 8 Detox/Playwright perps specs to recipe JSON format to evaluate:

1. Which flows can be fully replicated without mocks
2. Where recipes offer equivalent or better coverage
3. What the coverage gap is for mock-dependent flows

## Methodology

Each recipe mirrors a specific Detox or Playwright spec file. The recipe uses the same navigation paths and UI interactions (press testIDs, wait for routes, type on keypads) but replaces mock server calls with:

- **`PerpsController` methods** for state setup/teardown (close positions, cancel orders, toggle testnet)
- **Redux store access** for state verification
- **CDP eval** for runtime assertions

All recipes are **idempotent** — setup hooks clear any pre-existing state, and teardown hooks clean up regardless of pass/fail.

## Results

All 8 recipes validated on iOS simulator (`mm-2`) against testnet.

### Risk-Free Recipes (no trades)

| Recipe | Detox Spec | Nodes | Result | Coverage |
|--------|-----------|-------|--------|----------|
| perps-no-funds-tutorial | smoke/perps/perps-no-funds-tutorial.spec.ts | 7/7 | PASS | Full — tutorial show/dismiss via controller state |
| perps-add-funds | smoke/perps/perps-add-funds.spec.ts | 9/9 | PASS | Full — UI navigation parity; Detox also mocks the deposit server-side |
| perf-add-funds | performance/login/perps-add-funds.spec.ts | 7/7 | PASS | Full — same flow, simplified version |

### Trade Recipes (real testnet orders)

| Recipe | Detox Spec | Nodes | Result | Coverage |
|--------|-----------|-------|--------|----------|
| perps-position | smoke/perps/perps-position.spec.ts | 11/11 | PASS | Full — open long ETH, set TP/SL, close position |
| perps-position-stop-loss | smoke/perps/perps-position-stop-loss.spec.ts | 9/9 | PASS | Full — open long ETH, set SL, verify SL price, close |
| perps-position-liquidation | smoke/perps/perps-position-liquidation.spec.ts | 9/9 | PASS | Full — UI navigation parity; Detox also mocks price manipulation for liquidation trigger |
| perf-position-management | performance/login/perps-position-management.spec.ts | 9/9 | PASS | Full — open BTC long, verify position, close |
| perps-limit-long-fill | smoke/perps/perps-limit-long-fill.spec.ts | 22/22 | PASS | Full — limit long ETH at Mid, verify order, wait for fill, cleanup |

### Coverage Summary

**8/8 recipes achieve full UI navigation parity** with the corresponding Detox specs. The Detox specs themselves mock server-side behavior (deposits via mock server, liquidation via price manipulation) — neither approach tests real backend execution. Both validate the same thing: the UI flow works correctly.

## Key Differences from Detox

### What recipes do better
- **No build cycle** — run against any live app build via CDP
- **Idempotent** — setup/teardown hooks ensure clean state
- **Composable** — recipes call shared flows (`trade-open-market`, `trade-close-position`, `tpsl-create`)
- **Real testnet** — trade recipes execute real orders, not mocked ones

### What Detox does differently
- **Mock infrastructure** — simulates deposits, price changes, liquidations server-side (but this is mocked behavior, not real execution)
- **Visual assertions** — can assert on pixel-level rendering
- **Multi-app coordination** — can control external services (commandQueueServer)

## Flows Used

The benchmark recipes reuse these shared flows:

| Flow | Description |
|------|-------------|
| `setup-testnet` | Enable testnet mode, verify markets load |
| `trade-open-market` | Navigate to market, open keypad, type amount, place order |
| `trade-close-position` | Navigate to position, press close, confirm |
| `tpsl-create` | Navigate to position, open auto-close, set TP/SL presets |

## File Locations

- Recipes: `scripts/perps/agentic/teams/perps/recipes/benchmark/`
- Flows: `scripts/perps/agentic/teams/perps/flows/`
- Runner: `scripts/perps/agentic/validate-recipe.js`

## Running

```bash
# Single recipe
IOS_SIMULATOR=mm-2 node scripts/perps/agentic/validate-recipe.js \
  scripts/perps/agentic/teams/perps/recipes/benchmark/perps-position.json

# All benchmark recipes
for f in scripts/perps/agentic/teams/perps/recipes/benchmark/*.json; do
  echo "=== $(basename $f) ==="
  IOS_SIMULATOR=mm-2 node scripts/perps/agentic/validate-recipe.js "$f"
  echo
done
```

Prerequisites:
- MetaMask mobile app running on iOS simulator named `mm-2`
- Metro bundler running (`yarn start`)
- Wallet unlocked with perps feature enabled
- Sufficient testnet perps balance for trade recipes

## Timing Benchmark

Compares wall-clock execution time of Detox smoke specs vs their agentic recipe equivalents, both running on the same Detox debug build (`__DEV__=true`, `ios.sim.main`).

### Compared Specs

| Detox Spec | Agentic Recipe |
|---|---|
| `tests/smoke/perps/perps-position.spec.ts` | `benchmark/perps-position.json` |
| `tests/smoke/perps/perps-position-stop-loss.spec.ts` | `benchmark/perps-position-stop-loss.json` |
| `tests/smoke/perps/perps-limit-long-fill.spec.ts` | `benchmark/perps-limit-long-fill.json` |

Only these 3 Detox smoke specs are active (not skipped). The 5 remaining benchmark recipes cover specs that are either skipped or use Playwright (different runner).

### How to Run

```bash
# 1. One-time: create dedicated Detox simulator
xcrun simctl create "detox-benchmark" "iPhone 16 Pro"

# 2. Build both app variants
yarn test:e2e:ios:debug:build          # e2e build (for Detox)
yarn a:setup:ios                       # dev build (for agentic, also sets up wallet)

# 3. Run the benchmark
bash scripts/perps/agentic/run-timing-benchmark.sh

# Override simulators:
DETOX_SIMULATOR="my-detox" AGENTIC_SIMULATOR="my-dev" \
  bash scripts/perps/agentic/run-timing-benchmark.sh
```

Results are appended to this file after each run.

### Dual-Simulator Architecture

Detox and agentic recipes require **different app builds and environments**, so the benchmark uses two separate simulators running sequentially:

| | Detox (Phase 1) | Agentic (Phase 2) |
|---|---|---|
| **Simulator** | `detox-benchmark` (dedicated, safe to wipe) | `mm-2` (dev environment with real wallet) |
| **Build** | e2e debug (`yarn test:e2e:ios:debug:build`) | dev debug (via `preflight.sh` / `expo run:ios`) |
| **Metro port** | 8081 (Detox default) | `WATCHER_PORT` from `.js.env` (e.g. 8062) |
| **Metro env** | `METAMASK_ENVIRONMENT=e2e` | `METAMASK_ENVIRONMENT=dev` |
| **Accounts** | Mock (fixture-injected, $10k fake balance) | Real wallet (testnet balance) |
| **API** | Mock server intercepts all calls | Real Hyperliquid testnet API |

**Why two simulators?** Detox wipes app data (`launchApp({ delete: true })`) before each test. Using a dedicated simulator protects the dev wallet from being destroyed.

### State Isolation

- **Detox**: wipes app data before each test, injects state via fixture server. **Clean-room hermetic** — strong isolation but adds ~10-15s per test for reinstall + fixture load. Key strength for regression confidence.
- **Agentic**: reuses live app with existing wallet. **Idempotent** via setup/teardown hooks that clean up positions and orders. Faster, but requires pre-configured wallet. Better for rapid iteration and dev-time validation.


## Timing Run: Detox Only (2026-04-15)

**Simulator:** mm-2 (iPhone 16 Pro)
**Build:** Detox debug (ios.sim.main / `__DEV__=true`)
**Metro:** `METAMASK_ENVIRONMENT=e2e`, `WATCHER_PORT=8062`

| Spec | Detox (s) | Status |
|------|-----------|--------|
| perps-position | 117–126 | PASS |
| perps-position-stop-loss | 113–118 | PASS |
| perps-limit-long-fill | 109–116 | PASS |
| **TOTAL** | **~350** | **3/3 PASS** |

Agentic recipes need updating for the redesigned confirmations flow (`perps-amount-display-touchable` → `RedesignedConfirmations` route change). Full side-by-side comparison pending recipe fix.

