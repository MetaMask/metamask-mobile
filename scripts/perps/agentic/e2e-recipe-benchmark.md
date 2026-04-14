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
# 1. One-time: build Detox debug app (~15min)
yarn test:e2e:ios:debug:build

# 2. Start Metro (needed for agentic recipes)
yarn start

# 3. Run the benchmark (runs Detox specs then agentic recipes sequentially)
bash scripts/perps/agentic/run-timing-benchmark.sh

# Custom simulator name (default: "iPhone 16 Pro" from .detoxrc.js)
bash scripts/perps/agentic/run-timing-benchmark.sh --simulator "mm-2"

# Or via env var
IOS_SIMULATOR=mm-2 bash scripts/perps/agentic/run-timing-benchmark.sh
```

The script appends a timestamped results table below after each run.

### Key Differences

- **Detox** times include: app install, launch, fixture setup, mock server startup, test execution, teardown
- **Agentic** times include: CDP connection, preflight checks, recipe execution, teardown
- Both use the same simulator and same debug build artifact
- Runs are sequential (both use the same simulator)
