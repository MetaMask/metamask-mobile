# Agentic Recipes

Per-team recipe files for domain-specific CDP helpers. Each file is a JSON map of recipe name to expression.

## Directory structure

```
recipes/
  perps.json          # Core perps recipes (positions, auth, balances, markets, etc.)
  perps/
    core.json         # Extended perps recipes (pump-market, tpsl-orders, watchlist, etc.)
    setup.json        # Setup state recipes (testnet-mode, current-provider, account-balance)
  README.md
```

## Reference format

There are two contexts where you reference a recipe — the format differs.

### CLI / `app-state.sh recipe` (full path)

Always use the full `team/name` or `team/subfile/name` path:

```bash
# Flat file (recipes/perps.json, key "positions")
scripts/perps/agentic/app-state.sh recipe perps/positions

# Subdirectory file (recipes/perps/core.json, key "watchlist")
scripts/perps/agentic/app-state.sh recipe perps/core/watchlist

# Subdirectory file (recipes/perps/setup.json, key "testnet-mode")
scripts/perps/agentic/app-state.sh recipe perps/setup/testnet-mode
```

### `recipe_ref` in flow JSON (omit the team prefix)

The `recipe_ref` step action in `validate-recipe.sh` hardcodes the `perps/` team prefix.
Use only the `name` or `subfile/name` part in `"ref"`:

```json
{ "action": "recipe_ref", "ref": "positions" }
{ "action": "recipe_ref", "ref": "core/watchlist" }
{ "action": "recipe_ref", "ref": "setup/testnet-mode" }
```

These become `perps/positions`, `perps/core/watchlist`, `perps/setup/testnet-mode` internally.

## Adding recipes

**Flat file** (`recipes/perps.json` → referenced as `perps/<name>`):

```json
{
  "my-recipe": {
    "description": "What it does",
    "expression": "Engine.context.PerpsController.state.someField",
    "async": false
  }
}
```

**Subdirectory file** (`recipes/perps/myfile.json` → referenced as `perps/myfile/<name>`):

```json
{
  "my-recipe": {
    "description": "What it does",
    "expression": "Engine.context.PerpsController.someMethod().then(function(r){return JSON.stringify(r)})",
    "async": true
  }
}
```

Fields:
- **description** — shown in `recipe --list`
- **expression** — JS expression evaluated in the app's Hermes runtime via CDP
- **async** — `true` if the expression returns a Promise, `false` for sync

## Usage

```bash
# Run a recipe (CLI — full path)
scripts/perps/agentic/app-state.sh recipe perps/positions
scripts/perps/agentic/app-state.sh recipe perps/core/watchlist
scripts/perps/agentic/app-state.sh recipe perps/core/tpsl-orders
scripts/perps/agentic/app-state.sh recipe perps/setup/testnet-mode
scripts/perps/agentic/app-state.sh recipe perps/setup/current-provider

# List all recipes (includes subdirectory files)
scripts/perps/agentic/app-state.sh recipe --list
```

## Tips

- Use `.then(function(r){return JSON.stringify(r)})` for complex return values — CDP can only serialize primitives and plain objects
- `Engine.context` gives access to all controllers registered on the Engine singleton
- Recipes run in `__DEV__` mode only (the `Engine` global is exposed by NavigationService.ts)
- Keep expressions self-contained — no external imports, no multi-statement blocks unless wrapped in an IIFE
