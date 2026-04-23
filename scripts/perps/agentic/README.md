# Agentic Workflow Toolkit

Automated validation toolkit for MetaMask Mobile. Drives the app on a simulator over CDP (Chrome DevTools Protocol via Hermes inspector-proxy) — no manual tapping, no Detox build cycle.

## Scope

Lives under `scripts/perps/` and is owned by `@MetaMask/perps`. The infrastructure (`lib/`, validators, `teams/` layout) is team-agnostic by design. The intent is to promote it to a shared `scripts/agentic/` location with each product team owning `teams/<team>/`.

## Layout

```
agentic/
  cdp-bridge.js              CDP client: eval, navigate, press, scroll, eval-ref, profiler-start/stop
  validate-recipe.js         Recipe runner (live app)
  validate-recipe.sh         Wrapper for validate-recipe.js
  validate-flow-schema.js    Offline: enforce flow/recipe authoring rules
  validate-pre-conditions.js Offline: verify pre-condition assertion fixtures
  lib/
    assert.js                Assertion evaluator
    catalog.js               Team/flow/eval discovery + template rendering + ref resolution
    workflow.js              Graph normalization, cycle detection, Mermaid
    recipe-issues.js         Automatic issue-review capture
    cdp-eval.js              Low-level CDP eval helpers
    ws-client.js             WebSocket client
    screenshot.js            Screenshot filename helpers
    config.js                Runtime config (ports, paths)
  schemas/flow.schema.json   JSON Schema for flow docs
  teams/
    perps/                   Perps team (flows, recipes, pre-conditions, evals)
    mobile-platform/         Placeholder
  app-state.sh               Wrapper: status, eval, press, eval-ref, accounts
  app-navigate.sh            Navigate to any registered screen
  screenshot.sh              Capture simulator screenshot
  start-metro.sh             Start Metro bundler
  preflight.sh               Verify app + Metro + CDP connectivity
  setup-wallet.sh            Seed wallet from fixture
```

## Concepts

### Flows

Parameterized, reusable UI sequences. Live in `teams/<team>/flows/<name>.json`. Declare `inputs` (with defaults) and a `validate.workflow` graph. `{{param}}` tokens resolve at runtime.

```json
{
  "title": "Trade — market {{side}} {{symbol}} ${{usdAmount}}",
  "inputs": {
    "side":      { "type": "string", "default": "long" },
    "symbol":    { "type": "string", "default": "BTC" },
    "usdAmount": { "type": "string", "default": "10" }
  },
  "validate": {
    "workflow": {
      "pre_conditions": ["wallet.unlocked", "perps.ready_to_trade"],
      "entry": "nav",
      "nodes": {
        "nav": { "action": "navigate", "target": "PerpsMarketDetails", "params": { "market": { "symbol": "{{symbol}}" } }, "next": "press-side" },
        "press-side": { "action": "press", "test_id": "perps-market-details-{{side}}-button", "next": "place-order" },
        "place-order": { "action": "press", "test_id": "perps-order-view-place-order-button", "next": "done" },
        "done": { "action": "end", "status": "pass" }
      }
    }
  }
}
```

### Recipes

Directed graph that composes flows and inline steps. Live in `teams/<team>/recipes/`. Nodes keyed by ID; most have a `next` pointer. `switch` branches on assertions. `end` terminates.

```json
{
  "entry": "setup",
  "nodes": {
    "setup": { "action": "call", "ref": "setup-testnet", "next": "open" },
    "open":  { "action": "call", "ref": "trade-open-market", "params": { "symbol": "BTC" }, "next": "verify" },
    "verify":{ "action": "eval_ref", "ref": "positions", "assert": { "operator": "length_gt", "value": 0 }, "next": "close" },
    "close": { "action": "call", "ref": "trade-close-position", "params": { "symbol": "BTC" }, "next": "done" },
    "done":  { "action": "end", "status": "pass" }
  }
}
```

### Branching — `switch`

Cases evaluate against `env`, `inputs`, `vars`, `last`; `default` catches unmatched.

```json
{
  "decide": {
    "action": "switch",
    "cases": [
      { "when": { "operator": "length_gt", "field": "vars.positions.length", "value": 0 }, "next": "close-first" },
      { "when": { "operator": "length_eq", "field": "vars.positions.length", "value": 0 }, "next": "open-new" }
    ],
    "default": "open-new"
  }
}
```

### Guards — `when` / `unless`

Any executable node can guard on the same condition language; skipped nodes fall through to `next`.

```json
{
  "maybe-close": {
    "action": "call",
    "ref": "trade-close-position",
    "when": { "operator": "gt", "field": "vars.positionCount", "value": 0 },
    "next": "done"
  }
}
```

Context available to guards and switch: `env` (appRoot, recipePath, team), `inputs` (templated params), `vars` (via `save_as`), `last` (most recent result), `nodes` (per-node records).

### Setup / teardown

Linear arrays before/after the workflow graph. Teardown runs on both pass and fail.

```json
{
  "setup":    [{ "id": "enable-testnet", "action": "toggle_testnet", "enabled": true }],
  "teardown": [{ "id": "close-all", "action": "eval_async", "expression": "Engine.context.PerpsController.closeAllPositions().then(function(r){return JSON.stringify(r)})", "assert": { "operator": "not_null" } }]
}
```

### Eval refs

Named CDP eval expressions. Two homes:
- `teams/<team>/evals.json` — quick refs (`perps/positions`)
- `teams/<team>/evals/<file>.json` — grouped refs (`perps/core/tpsl-orders`)

```bash
node cdp-bridge.js eval-ref --list
node cdp-bridge.js eval-ref perps/positions
```

### Pre-conditions

Gate checks that must pass before a flow runs. Defined in `teams/<team>/pre-conditions.js`.

| Field | Description |
| --- | --- |
| `description` | human-readable label |
| `async` | whether expression returns a Promise |
| `expression` | CDP eval (string, or function for parameterized) |
| `assert` | `{ operator, field, value }` |
| `hint` | actionable failure message |
| `fixtures` | `{ pass, fail }` JSON strings for offline validation |

```js
'wallet.unlocked': {
  description: 'Wallet is unlocked and app is navigable',
  async: false,
  expression: '(function(){ var r=globalThis.__AGENTIC__.getRoute().name; return JSON.stringify({route:r,unlocked:r!=="Login"}); })()',
  assert: { operator: 'eq', field: 'unlocked', value: true },
  hint: 'Unlock the wallet first.',
  fixtures: {
    pass: '{"route":"WalletView","unlocked":true}',
    fail: '{"route":"Login","unlocked":false}',
  },
},
```

## Actions

| Action | Required | Purpose |
| --- | --- | --- |
| `navigate` | `target` | go to a screen |
| `press` | `test_id` | tap component by testID |
| `set_input` | `test_id`, `value` | type into TextInput |
| `type_keypad` | `value` | type digits via keypad buttons |
| `clear_keypad` | — | press delete N times (default 8) |
| `scroll` | — | scroll view (optional `test_id`, `offset`) |
| `eval_sync` | `expression`, `assert` | sync CDP eval |
| `eval_async` | `expression`, `assert` | promise-based CDP eval |
| `eval_ref` | `ref`, `assert` | run a named eval ref |
| `call` | `ref` | invoke another flow (workflow only) |
| `wait` | — | pause N ms |
| `wait_for` | condition | poll until route / test_id / expression matches. Timing fields: `timeout_ms`, `poll_ms` |
| `log_watch` | `watch_for` / `must_not_appear` | scan Metro logs |
| `screenshot` | — | capture screen |
| `manual` | — | human intervention point |
| `select_account` | `address` | switch Ethereum account |
| `toggle_testnet` | — | enable/disable testnet |
| `switch_provider` | `provider` | switch perps provider |
| `app_background` | — | send app to home. `duration_ms` default 5000 |
| `app_foreground` | — | relaunch via `xcrun simctl launch` |
| `app_restart` | — | terminate + relaunch. `boot_wait_ms` default 15000 |
| `trace_start` / `trace_stop` | `label` | Hermes sampling profiler → `.cpuprofile` |
| `switch` | `cases` | branch on assertions (workflow only) |
| `end` | — | terminal node (workflow only) |

## Assertion operators

Used in `assert` blocks on steps and pre-conditions:

| Operator | Meaning |
| --- | --- |
| `not_null` | value not null/undefined |
| `truthy` / `falsy` | boolean truthiness |
| `eq` / `neq` | strict equality |
| `gt` / `lt` / `gte` / `lte` | numeric comparison |
| `deep_eq` | deep strict equality |
| `length_eq` / `length_gt` / `length_gte` | array/string length |
| `contains` / `not_contains` | array or string includes |
| `matches` | regex match (`/pattern/flags` or string) |
| `one_of` | value in `values` array |
| `exists` | field not undefined |

Compound: `{ all: [...] }`, `{ any: [...] }`, `{ none: [...] }`.

## CLI

```bash
# Run recipe (live app)
bash scripts/perps/agentic/validate-recipe.sh teams/perps/recipes/full-trade-lifecycle.json
bash scripts/perps/agentic/validate-recipe.sh teams/perps/recipes/full-trade-lifecycle.json --dry-run

# Offline validators
node scripts/perps/agentic/validate-flow-schema.js                                    # all
node scripts/perps/agentic/validate-flow-schema.js teams/perps/flows/trade-open-market.json
node scripts/perps/agentic/validate-pre-conditions.js

# App interaction
bash scripts/perps/agentic/app-state.sh status
bash scripts/perps/agentic/app-state.sh eval "Engine.context.PerpsController.state"
bash scripts/perps/agentic/app-state.sh eval-ref perps/positions
bash scripts/perps/agentic/app-state.sh eval-ref --list
bash scripts/perps/agentic/app-navigate.sh PerpsMarketDetails '{"market":{"symbol":"BTC"}}'
bash scripts/perps/agentic/screenshot.sh my-label
bash scripts/perps/agentic/start-metro.sh --platform ios
```

## Adding a new team

1. `teams/<team>/pre-conditions.js` exporting `Record<string, PreCondition>`.
2. Key convention: `<team>.<check>` (e.g. `swap.has_quote`).
3. Include `fixtures: { pass, fail }` on every entry.
4. Optionally add `flows/`, `recipes/`, `evals/`, `evals.json`.
5. Run both validators:

```bash
node scripts/perps/agentic/validate-pre-conditions.js
node scripts/perps/agentic/validate-flow-schema.js
```

See `teams/README.md` for the full contribution guide.

## CDP eval rules

All expressions are **ES5** — no arrow functions, `const`/`let`, template literals, top-level `await`.

```js
// OK
var x = Engine.context.PerpsController.state;
JSON.stringify({ count: x.positions.length });

// Not OK
const x = Engine.context.PerpsController.state;
`count: ${x.positions.length}`;
```

Async via `.then()`:

```js
Engine.context.PerpsController.getPositions().then(function(ps) {
  return JSON.stringify({ count: ps.length });
});
```

## Run artifacts

Every recipe run writes to `.agent/recipe-runs/<timestamp>_<recipe>/`:

- `summary.json`, `workflow.json`, `workflow.mmd`, `trace.json`
- `screenshots/`, `traces/` (`.cpuprofile` when `trace_stop` ran)
- `recipe-issues.json` + `console-warnings.json` + `console-errors.json` + `runtime-exceptions.json`
- `recipe-issues-review.json` + `recipe-issues-review.md`

`summary.json.recipeIssues` is automatic and aligned with the extension contract. See [CDP-capabilities-mobile.md](./CDP-capabilities-mobile.md#automatic-recipe-issue-review) for the review vocabulary and opt-in `fail_on_unexpected` gating.
