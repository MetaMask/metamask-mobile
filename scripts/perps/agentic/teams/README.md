# Agentic Teams — Contribution Guide

Each team owns its own directory under `teams/<team-name>/`.
The registry auto-discovers and merges all team pre-conditions at load time.

## Directory structure

```
teams/
  perps/
    flows/              ← flow JSON files (validated by validate-flow-schema.js)
    recipes/            ← integration-level recipes that compose flows via call action
    evals/              ← named eval collections (core.json, setup.json, ...)
    evals.json          ← quick CDP eval refs (positions, auth, balances, ...)
    pre-conditions.js   ← perps.* checks
  mobile-platform/
    pre-conditions.js   ← mobile-platform.* checks
  <your-team>/
    flows/              ← optional: flow JSON files
    recipes/            ← optional: integration-level recipes
    evals/              ← optional: named eval collections
    evals.json          ← optional: quick CDP eval refs
    pre-conditions.js   ← <your-team>.* checks
```

## Adding a new team

1. Create `teams/<your-team>/pre-conditions.js` exporting a `Record<string, PreCondition>`.
2. Key naming convention: `<your-team>.<check_name>` — e.g. `swap.has_quote`, `nft.owns_token`.
3. Duplicate keys across teams cause a load-time error, so namespacing is enforced by convention.
4. Optionally add `flows/`, `evals/`, and `evals.json` for team-specific automation.

## Pre-condition shape

```js
'use strict';
const REGISTRY = {
  'myteam.some_check': {
    description: 'Human-readable description shown on failure.',
    async: false,
    // Plain string for fixed checks; function(params) => string for parameterised ones.
    expression: 'JSON.stringify({ ok: true })',
    assert: { operator: 'eq', field: 'ok', value: true },
    hint: 'What the user should do when this check fails.',
  },
};
module.exports = REGISTRY;
```

## Flows

Flow JSON files live in `teams/<team>/flows/`. They are automatically discovered by `validate-flow-schema.js`.

```bash
# Validate all flows
node scripts/perps/agentic/validate-flow-schema.js

# Validate a single flow
node scripts/perps/agentic/validate-flow-schema.js teams/perps/flows/trade-open-market.json
```

## Evals

Named eval collections live in `teams/<team>/evals/<file>.json`.
Run them via: `node cdp-bridge.js eval-ref <team>/<file>/<name>`

Example: `node cdp-bridge.js eval-ref perps/core/pump-market`

Quick CDP eval refs live in `teams/<team>/evals.json`.
Run them via: `node cdp-bridge.js eval-ref <team>/<name>`

Example: `node cdp-bridge.js eval-ref perps/positions`

List all available eval refs:

```bash
node scripts/perps/agentic/cdp-bridge.js eval-ref --list
```

## Recipes

Recipes live in `teams/<team>/recipes/`. They compose multiple flows via the `call` action for integration-level validation — proving that end-to-end scenarios work across flow boundaries.

```bash
# Run a recipe against the live app
bash scripts/perps/agentic/validate-recipe.sh teams/perps/recipes/full-trade-lifecycle.json

# Dry-run (prints steps without executing)
bash scripts/perps/agentic/validate-recipe.sh teams/perps/recipes/full-trade-lifecycle.json --dry-run
```

See `teams/perps/recipes/full-trade-lifecycle.json` for an example that chains wallet home → mainnet → perps → testnet → open position → TP/SL → close.

## Validators

```bash
# Check assertion correctness for all pre-conditions (no live app needed)
node scripts/perps/agentic/validate-pre-conditions.js

# Validate all flow JSON files against schema rules
node scripts/perps/agentic/validate-flow-schema.js

# Run a recipe against the live app
bash scripts/perps/agentic/validate-recipe.sh <recipe-folder>
```
