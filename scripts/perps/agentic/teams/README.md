# Agentic Teams — Contribution Guide

Each team owns its own directory under `teams/<team-name>/`.
The registry auto-discovers and merges all team pre-conditions at load time.

## Directory structure

```
teams/
  perps/
    flows/              ← flow JSON files (validated by validate-flow-schema.js)
    recipes/            ← named recipe collections (core.json, setup.json, ...)
    snippets.json       ← quick CDP eval snippets (positions, auth, balances, ...)
    pre-conditions.js   ← perps.* checks
  mobile-platform/
    pre-conditions.js   ← mobile-platform.* checks
  <your-team>/
    flows/              ← optional: flow JSON files
    recipes/            ← optional: named recipe collections
    snippets.json       ← optional: quick CDP eval snippets
    pre-conditions.js   ← <your-team>.* checks
```

## Adding a new team

1. Create `teams/<your-team>/pre-conditions.js` exporting a `Record<string, PreCondition>`.
2. Key naming convention: `<your-team>.<check_name>` — e.g. `swap.has_quote`, `nft.owns_token`.
3. Duplicate keys across teams cause a load-time error, so namespacing is enforced by convention.
4. Optionally add `flows/`, `recipes/`, and `snippets.json` for team-specific automation.

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

## Recipes

Named recipe collections live in `teams/<team>/recipes/<file>.json`.
Run them via: `node cdp-bridge.js recipe <team>/<file>/<name>`

Example: `node cdp-bridge.js recipe perps/core/pump-market`

## Snippets

Quick CDP eval snippets live in `teams/<team>/snippets.json`.
Run them via: `node cdp-bridge.js recipe <team>/<name>`

Example: `node cdp-bridge.js recipe perps/positions`

List all available snippets and recipes:

```bash
node scripts/perps/agentic/cdp-bridge.js recipe --list
```

## Validators

```bash
# Check assertion correctness for all pre-conditions (no live app needed)
node scripts/perps/agentic/validate-pre-conditions.js

# Validate all flow JSON files against schema rules
node scripts/perps/agentic/validate-flow-schema.js

# Run a recipe against the live app
bash scripts/perps/agentic/validate-recipe.sh <recipe-folder>
```
