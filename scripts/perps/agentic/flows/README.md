# Perps Agentic Flows

Flow files define chainable multi-step UI workflows. Unlike CDP recipe expressions (which run a single JS eval), flows combine navigation, presses, input, waits, and assertions into a reproducible sequence.

## Usage

### Run a flow directly

```bash
bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/flows/market-discovery.json --skip-manual
```

### Embed a flow in a task recipe via `flow_ref`

```json
{
  "id": "check_tpsl",
  "action": "flow_ref",
  "ref": "tpsl-create",
  "params": {
    "symbol": "PUMP",
    "takeProfitPrice": "0.001500",
    "stopLossPrice": "0.001000"
  }
}
```

`validate-recipe.sh` substitutes `{{key}}` placeholders in the flow JSON with the provided `params` values before execution.

## Available flows

| Flow | Params | Description |
|------|--------|-------------|
| `market-discovery` | `symbol` | Navigate to market list, find symbol, verify price loads |
| `market-watchlist` | `symbol` | Toggle symbol on/off watchlist, assert state changes |
| `trade-open-market` | `symbol`, `side`, `usdAmount`, `leverage` | Fill market order form (does NOT submit by default) |
| `trade-close-position` | `symbol` | Navigate to close position form, assert summary shown |
| `tpsl-create` | `symbol`, `takeProfitPrice`, `stopLossPrice` | Set TP/SL inputs, assert accepted without error |
| `tpsl-edit` | `symbol`, `newTakeProfitPrice` | Open existing TP/SL, update TP value, assert |
| `position-add-margin` | `symbol`, `marginAmount` | Open add-margin form, enter amount, assert |
| `order-limit-place` | `symbol`, `side`, `usdAmount`, `limitPrice` | Fill limit order form, assert values |
| `order-limit-cancel` | `symbol` | Cancel first open limit order, assert removed |
| `activity-view` | _(none)_ | Navigate to activity, assert trades list loads |

## Flow file format

Flows use the same JSON schema as task recipes (`validate.runtime.steps`). This means:
- They can be run directly with `validate-recipe.sh`
- They can be embedded via `flow_ref` in task recipes
- All step actions are supported: `navigate`, `press`, `set_input`, `eval_async`, `recipe_ref`, `screenshot`, `wait`, etc.

## Writing flows

1. Use `{{paramName}}` for any value that changes per invocation (symbol, price, amount, side)
2. Default params (shown in docs above) apply when no override is given via `flow_ref`
3. End every flow with a `screenshot` step — gives visual confirmation
4. Keep flows focused: one user task per flow file
5. Validate against live app before committing
