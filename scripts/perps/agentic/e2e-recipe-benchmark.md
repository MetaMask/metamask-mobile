# Perps E2E Recipe Benchmark

Detox perps specs couple tightly to mock infra (commandQueueServer, deposit mocks, price manipulation) that only exists inside the Detox harness. Slow to iterate, fragile, often skipped in CI.

The agentic recipe runner (`validate-recipe.js`) drives a live app via Hermes CDP — no mocks. This doc records the migration of 8 Detox/Playwright specs to recipe JSON.

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

## Related docs

- [timing-benchmark.md](./timing-benchmark.md) — dual-simulator wall-clock comparison and harness setup
