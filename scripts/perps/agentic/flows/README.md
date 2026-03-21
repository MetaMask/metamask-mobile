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

`validate-recipe.sh` substitutes `{{key}}` and `{{key|default}}` placeholders with the provided `params` values before execution. Remaining `{{key|default}}` placeholders not covered by params are replaced with their default values.

**Param default syntax:** `{{paramName|defaultValue}}` — if `paramName` is not in the supplied `params`, `defaultValue` is used. This makes all params optional when defaults are sensible.

## Available flows

| Flow | Params (defaults) | Description |
|------|-------------------|-------------|
| `perps/market-discovery` | `symbol` | Navigate to market list, find symbol, verify price loads |
| `perps/market-watchlist` | `symbol` | Toggle symbol on/off watchlist, assert state changes |
| `perps/trade-open-market` | `symbol` (BTC), `side` (long), `usdAmount` (10) | Full E2E market order: navigate → side → amount → place |
| `perps/trade-close-position` | `symbol` | Navigate to close position form, assert summary shown |
| `perps/tpsl-create` | `symbol`, `takeProfitPrice`, `stopLossPrice` | Set TP/SL inputs, assert accepted |
| `perps/tpsl-edit` | `symbol`, `newTakeProfitPrice` | Open existing TP/SL, update TP value |
| `perps/position-add-margin` | `symbol`, `marginAmount` | Open add-margin form, enter amount |
| `perps/order-limit-place` | `symbol` (BTC), `side` (long), `usdAmount` (10), `limitPrice` (60000) | Full E2E limit order: navigate → side → limit price → amount → place |
| `perps/order-limit-cancel` | `symbol` | Cancel first open limit order, assert removed |
| `perps/activity-view` | _(none)_ | Navigate to activity, assert trades list loads |
| `perps/setup-testnet` | _(none)_ | Enable testnet mode, assert market data loads |
| `perps/setup-account` | `address` | Switch to account by address, assert selected |

## Step actions

| Action | Key params | Description |
|--------|------------|-------------|
| `navigate` | `target`, `params?` | Go to screen |
| `press` | `test_id` | Tap component by testID |
| `set_input` | `test_id`, `value` | Type into input field |
| `type_keypad` | `value` | Type each character via keypad digit testIDs (`keypad-key-0`…`9`, `keypad-key-dot`) |
| `scroll` | `test_id?`, `offset?`, `animated?` | Scroll a list/view |
| `eval_sync` | `expression` | Sync JS eval |
| `eval_async` | `expression` | Promise JS eval |
| `recipe_ref` | `ref` | Run a built-in recipe |
| `flow_ref` | `ref`, `params?` | Embed another flow |
| `screenshot` | `filename?` | Capture screen |
| `wait` | `ms` | Pause N milliseconds |
| `log_watch` | `window_seconds`, `must_not_appear?`, `watch_for?` | Scan Metro logs |
| `manual` | `note?` | Human intervention point |
| `select_account` | `address` | Switch account by address |
| `toggle_testnet` | `enabled` (bool, default `true`) | Enable/disable testnet |
| `switch_provider` | `provider` | Switch active provider |

## Flow file format

Flows use the same JSON schema as task recipes (`validate.runtime.steps`). This means:
- They can be run directly with `validate-recipe.sh`
- They can be embedded via `flow_ref` in task recipes
- All step actions are supported (see table above)

## Recipes vs Flows

These are two distinct systems that complement each other:

| | **Recipe** | **Flow** |
|---|---|---|
| Schema | `{ name: { expression, async, description } }` | `{ title, validate.runtime.steps[] }` |
| Purpose | Single CDP eval — quick state query/snapshot | Multi-step UI sequence — navigate, press, assert |
| Called via | `app-state.sh recipe perps/name` | `validate-recipe.sh flows/perps/name.json` |
| Composable | Used inside flows via `recipe_ref` action | Can embed other flows via `flow_ref` |
| When to use | "What is the current balance?" | "Walk through placing a limit order like a user" |

A recipe is a **named, reusable CDP expression** for quick state inspection. A flow **orchestrates UI interaction**. They're complementary: flows call recipes to check state at key points (`recipe_ref` action). Keep them separate — `app-state.sh recipe perps/positions` gives instant state without a full flow run.

## Writing flows

1. Place new flows under `flows/<team>/` (e.g. `flows/perps/my-flow.json`)
2. Use `{{paramName|default}}` for params with sensible defaults, `{{paramName}}` for required params
3. Reference via `flow_ref` as `"ref": "<team>/my-flow"`
4. Keep flows focused: one user task per flow file
5. Validate against live app before committing
