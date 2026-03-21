# Agentic Flows

Flow files define chainable multi-step UI workflows. Unlike CDP recipe expressions (which run a single JS eval), flows combine navigation, presses, input, waits, and assertions into a reproducible sequence.

## Directory structure

```
flows/
  perps/
    market-discovery.json
    market-watchlist.json
    trade-open-market.json
    trade-close-position.json
    tpsl-create.json
    tpsl-edit.json
    position-add-margin.json
    order-limit-place.json
    order-limit-cancel.json
    activity-view.json
    setup-testnet.json
    setup-account.json
  README.md
```

## Reference format

### Run a flow directly

```bash
bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/flows/perps/market-discovery.json --skip-manual
```

### Embed a flow in a task recipe via `flow_ref`

Use `team/name` format — `validate-recipe.sh` resolves it to `flows/team/name.json`:

```json
{
  "id": "check_tpsl",
  "action": "flow_ref",
  "ref": "perps/tpsl-create",
  "params": {
    "symbol": "PUMP",
    "takeProfitPrice": "0.001500",
    "stopLossPrice": "0.001000"
  }
}
```

`validate-recipe.sh` substitutes `{{key}}` placeholders with the provided `params` values before execution.

## Available flows

| Flow | `ref` | Params | Description |
|------|-------|--------|-------------|
| `perps/market-discovery` | `symbol` | Navigate to market list, find symbol, verify price loads |
| `perps/market-watchlist` | `symbol` | Toggle symbol on/off watchlist, assert state changes |
| `perps/trade-open-market` | `symbol`, `side`, `usdAmount`, `leverage` | Fill market order form (does NOT submit) |
| `perps/trade-close-position` | `symbol` | Navigate to close position form, assert summary shown |
| `perps/tpsl-create` | `symbol`, `takeProfitPrice`, `stopLossPrice` | Set TP/SL inputs, assert accepted |
| `perps/tpsl-edit` | `symbol`, `newTakeProfitPrice` | Open existing TP/SL, update TP value |
| `perps/position-add-margin` | `symbol`, `marginAmount` | Open add-margin form, enter amount |
| `perps/order-limit-place` | `symbol`, `side`, `usdAmount`, `limitPrice` | Fill limit order form, assert values |
| `perps/order-limit-cancel` | `symbol` | Cancel first open limit order, assert removed |
| `perps/activity-view` | _(none)_ | Navigate to activity, assert trades list loads |
| `perps/setup-testnet` | _(none)_ | Enable testnet mode, assert market data loads |
| `perps/setup-account` | `address` | Switch to account by address, assert selected |

## Flow file format

Flows use the same JSON schema as task recipes (`validate.runtime.steps`). This means:
- They can be run directly with `validate-recipe.sh`
- They can be embedded via `flow_ref` in task recipes
- All step actions are supported: `navigate`, `press`, `set_input`, `eval_sync`, `eval_async`, `recipe_ref`, `flow_ref`, `screenshot`, `wait`, `toggle_testnet`, `select_account`, `switch_provider`, etc.

## Writing flows

1. Place new flows under `flows/<team>/` (e.g. `flows/perps/my-flow.json`)
2. Use `{{paramName}}` for any value that changes per invocation (symbol, price, amount)
3. Reference via `flow_ref` as `"ref": "<team>/my-flow"`
4. Keep flows focused: one user task per flow file
5. Validate against live app before committing
