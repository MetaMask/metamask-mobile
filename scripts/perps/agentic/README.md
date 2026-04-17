# Agentic Workflow Toolkit

Automated validation toolkit for MetaMask Mobile. Uses CDP (Chrome DevTools Protocol) to drive the app on a simulator/emulator, execute flows, and assert state -- no manual tapping required.

## Scope

Currently lives under `scripts/perps/` and is owned by `@MetaMask/perps`. The infrastructure (`lib/`, validators, `teams/` layout) is team-agnostic by design. Once proven, the intent is to promote it to a shared `scripts/agentic/` location with each product team owning `teams/<team>/`.

## Directory Layout

```
agentic/
  cdp-bridge.js              CDP client: eval, navigate, press, scroll, eval-ref
  validate-flow-schema.js    Offline: enforce flow/recipe authoring rules
  validate-pre-conditions.js Offline: verify pre-condition assertion fixtures
  validate-recipe.sh         Run a recipe against the live app
  lib/
    assert.js                Assertion evaluator (eq, gt, contains, regex, all/any/none)
    catalog.js               Team/flow/eval discovery, template rendering, ref resolution
    workflow.js               Graph-based workflow normalization, cycle detection, Mermaid
    screenshot.js            Screenshot filename helpers
    registry.js              Legacy pre-condition loader (superseded by catalog.js)
    config.js                Runtime config (ports, paths)
    cdp-eval.js              Low-level CDP eval helpers
    ws-client.js             WebSocket client for CDP
    target-discovery.js      CDP target discovery
  schemas/
    flow.schema.json         JSON Schema for flow documents
  teams/
    perps/                   Perps team data
    mobile-platform/         Mobile platform team (placeholder)
  app-state.sh               Wrapper: status, eval, press, eval-ref, accounts
  app-navigate.sh            Navigate to any registered screen
  screenshot.sh              Capture simulator/device screenshot
  start-metro.sh             Start Metro bundler
  preflight.sh               Verify app + Metro + CDP connectivity
  setup-wallet.sh            Seed wallet from fixture
```

## Core Concepts

### Flows

A **flow** is a parameterized, reusable UI sequence. Flows live in `teams/<team>/flows/<name>.json`.

Flows declare `inputs` (with defaults) and a `validate.workflow` graph. Template tokens (`{{param}}`) are resolved at runtime.

```json
{
  "title": "Trade -- market {{side}} {{symbol}} ${{usdAmount}}",
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

### Recipes (Workflow Graph)

A **recipe** composes flows and inline steps into a directed graph under `validate.workflow`. Recipes live in `teams/<team>/recipes/`.

Nodes are keyed by ID. Each node has an `action`, and most have a `next` pointer. `switch` nodes branch based on assertions. `end` nodes terminate with pass/fail.

```json
{
  "title": "Full trade lifecycle",
  "validate": {
    "workflow": {
      "entry": "setup",
      "nodes": {
        "setup":    { "action": "call", "ref": "setup-testnet", "next": "open" },
        "open":     { "action": "call", "ref": "trade-open-market", "params": { "symbol": "BTC" }, "next": "verify" },
        "verify":   { "action": "eval_ref", "ref": "positions", "assert": { "operator": "length_gt", "value": 0 }, "next": "close" },
        "close":    { "action": "call", "ref": "trade-close-position", "params": { "symbol": "BTC" }, "next": "done" },
        "done":     { "action": "end", "status": "pass" }
      }
    }
  }
}
```

### Branching with `switch`

A `switch` node evaluates conditions against the execution context (env, inputs, vars, last result) and routes to different branches. Each case has a `when` assertion and a `next` target. An optional `default` catches unmatched cases.

```json
{
  "check-position": {
    "action": "eval_ref",
    "ref": "positions",
    "save_as": "positions",
    "assert": { "operator": "not_null" },
    "next": "decide"
  },
  "decide": {
    "action": "switch",
    "cases": [
      {
        "label": "has positions",
        "when": { "operator": "length_gt", "field": "vars.positions.length", "value": 0 },
        "next": "close-first"
      },
      {
        "label": "no positions",
        "when": { "operator": "length_eq", "field": "vars.positions.length", "value": 0 },
        "next": "open-new"
      }
    ],
    "default": "open-new"
  },
  "close-first": { "action": "call", "ref": "trade-close-position", "params": { "symbol": "BTC" }, "next": "open-new" },
  "open-new": { "action": "call", "ref": "trade-open-market", "params": { "symbol": "BTC" }, "next": "done" },
  "done": { "action": "end", "status": "pass" }
}
```

### Conditional Guards (`when` / `unless`)

Any executable node can have a `when` or `unless` guard. If the condition doesn't match, the node is skipped and execution continues to `next`.

```json
{
  "maybe-close": {
    "action": "call",
    "ref": "trade-close-position",
    "params": { "symbol": "BTC" },
    "when": { "operator": "gt", "field": "vars.positionCount", "value": 0 },
    "next": "done"
  }
}
```

The guard evaluates against the execution context which includes:
- `env` — appRoot, recipePath, team
- `inputs` — resolved template parameters
- `vars` — values saved via `save_as` on prior nodes
- `last` — result of the most recent node
- `nodes` — per-node execution records

### Setup and Teardown Hooks

Linear step arrays that run before/after the workflow graph. Teardown always runs, even on failure.

```json
{
  "validate": {
    "workflow": {
      "pre_conditions": ["wallet.unlocked"],
      "setup": [
        { "id": "enable-testnet", "action": "toggle_testnet", "enabled": true }
      ],
      "entry": "open-position",
      "nodes": {
        "open-position": { "action": "call", "ref": "trade-open-market", "next": "done" },
        "done": { "action": "end", "status": "pass" }
      },
      "teardown": [
        { "id": "close-all", "action": "eval_async", "expression": "Engine.context.PerpsController.closeAllPositions().then(function(r){return JSON.stringify(r)})", "assert": { "operator": "not_null" } }
      ]
    }
  }
}
```

### Eval Refs

Named CDP eval expressions. Two locations:
- `teams/<team>/evals.json` -- quick refs (e.g. `perps/positions`)
- `teams/<team>/evals/<file>.json` -- grouped refs (e.g. `perps/core/tpsl-orders`)

```bash
# List all eval refs
node cdp-bridge.js eval-ref --list

# Run one
node cdp-bridge.js eval-ref perps/positions
```

### Pre-conditions

Executable gate checks that must pass before a flow runs. Defined in `teams/<team>/pre-conditions.js`. Each entry has:

| Field | Description |
|-------|-------------|
| `description` | Human-readable label |
| `async` | Whether expression returns a Promise |
| `expression` | CDP eval (string or function for parameterized checks) |
| `assert` | Assertion spec (`operator`, `field`, `value`) |
| `hint` | Actionable message shown on failure |
| `fixtures` | `{ pass, fail }` JSON strings for offline testing |

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

## Step Actions

| Action | Required Fields | Description |
|--------|----------------|-------------|
| `navigate` | `target` | Go to a screen |
| `press` | `test_id` | Tap component by testID |
| `set_input` | `test_id`, `value` | Type into a TextInput |
| `type_keypad` | `value` | Type digits via keypad buttons |
| `clear_keypad` | | Press delete N times (default 8) |
| `scroll` | | Scroll a view (optional `test_id`, `offset`) |
| `eval_sync` | `expression`, `assert` | Synchronous CDP eval |
| `eval_async` | `expression`, `assert` | Promise-based CDP eval |
| `eval_ref` | `ref`, `assert` | Run a named eval ref |
| `call` | `ref` | Call another flow (workflow nodes only) |
| `wait` | | Pause N ms |
| `wait_for` | condition | Poll until condition met (route/test_id/expression). Canonical timing fields are `timeout_ms` and `poll_ms`. |
| `log_watch` | `watch_for` or `must_not_appear` | Scan Metro logs |
| `screenshot` | | Capture screen |
| `manual` | | Human intervention point |
| `select_account` | `address` | Switch Ethereum account |
| `toggle_testnet` | | Enable/disable testnet mode |
| `switch_provider` | `provider` | Switch perps provider |
| `app_background` | `duration_ms` | Send app to home screen (iOS: Cmd+Shift+H). Waits `duration_ms` (default 5000) |
| `app_foreground` | | Bring app back to foreground via `xcrun simctl launch` |
| `app_restart` | `boot_wait_ms` | Terminate + relaunch app. Waits `boot_wait_ms` (default 15000) for Metro reconnect |
| `switch` | `cases` | Branch based on assertions (workflow only) |
| `end` | | Terminal node with pass/fail (workflow only) |

## Assertion Operators

Used in `assert` blocks on steps and pre-conditions:

| Operator | Description |
|----------|-------------|
| `not_null` | Value is not null/undefined |
| `truthy` / `falsy` | Boolean truthiness |
| `eq` / `neq` | Strict equality |
| `gt` / `lt` / `gte` / `lte` | Numeric comparison |
| `deep_eq` | Deep strict equality |
| `length_eq` / `length_gt` / `length_gte` | Array/string length |
| `contains` / `not_contains` | Array includes or string includes |
| `matches` | Regex match (string or `/pattern/flags`) |
| `one_of` | Value is in a list (`values` array) |
| `exists` | Field exists (not undefined) |

Compound assertions: `{ all: [...] }`, `{ any: [...] }`, `{ none: [...] }`.

## CLI Commands

### Running Recipes

```bash
# Against the live app
bash scripts/perps/agentic/validate-recipe.sh teams/perps/recipes/full-trade-lifecycle.json

# Dry-run (print steps without executing)
bash scripts/perps/agentic/validate-recipe.sh teams/perps/recipes/full-trade-lifecycle.json --dry-run
```

### Offline Validators

```bash
# Validate all flow + recipe JSON files
node scripts/perps/agentic/validate-flow-schema.js

# Validate a single file
node scripts/perps/agentic/validate-flow-schema.js teams/perps/flows/trade-open-market.json

# Verify pre-condition assertion fixtures
node scripts/perps/agentic/validate-pre-conditions.js
```

### App Interaction

```bash
# Check app + Metro + CDP health
bash scripts/perps/agentic/app-state.sh status

# Evaluate expression
bash scripts/perps/agentic/app-state.sh eval "Engine.context.PerpsController.state"

# Run eval ref
bash scripts/perps/agentic/app-state.sh eval-ref perps/positions

# List all eval refs
bash scripts/perps/agentic/app-state.sh eval-ref --list

# Navigate to screen
bash scripts/perps/agentic/app-navigate.sh PerpsMarketDetails '{"market":{"symbol":"BTC"}}'

# Take screenshot
bash scripts/perps/agentic/screenshot.sh my-label

# Start Metro
bash scripts/perps/agentic/start-metro.sh --platform ios
```

## Adding a New Team

1. Create `teams/<your-team>/pre-conditions.js` exporting a `Record<string, PreCondition>`.
2. Key convention: `<your-team>.<check_name>` (e.g. `swap.has_quote`).
3. Include `fixtures: { pass, fail }` on every entry for offline validation.
4. Optionally add `flows/`, `recipes/`, `evals/`, `evals.json`.
5. Run both validators to confirm:

```bash
node scripts/perps/agentic/validate-pre-conditions.js
node scripts/perps/agentic/validate-flow-schema.js
```

See `teams/README.md` for the full contribution guide.

## CDP Eval Rules

All expressions must be **ES5** -- no arrow functions, no `const`/`let`, no template literals, no top-level `await`.

```js
// Good
var x = Engine.context.PerpsController.state;
JSON.stringify({count: x.positions.length});

// Bad
const x = Engine.context.PerpsController.state;
`count: ${x.positions.length}`;
```

Async expressions use `.then()` chains:

```js
Engine.context.PerpsController.getPositions().then(function(ps) {
  return JSON.stringify({count: ps.length});
})
```
