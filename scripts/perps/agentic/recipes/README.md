# Agentic Recipes

Per-team recipe files for domain-specific CDP helpers. Each file is a JSON map of recipe name to expression.

## Adding recipes

Create `<team>.json` in this directory:

```json
{
  "recipe-name": {
    "description": "What it does",
    "expression": "Engine.context.SomeController.someMethod().then(function(r){return JSON.stringify(r)})",
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
# Run a recipe
scripts/perps/agentic/app-state.sh recipe <team>/<name>

# List all recipes
scripts/perps/agentic/app-state.sh recipe --list
```

## Tips

- Use `.then(function(r){return JSON.stringify(r)})` for complex return values — CDP can only serialize primitives and plain objects
- `Engine.context` gives access to all controllers registered on the Engine singleton
- Recipes run in `__DEV__` mode only (the `Engine` global is exposed by NavigationService.ts)
- Keep expressions self-contained — no external imports, no multi-statement blocks unless wrapped in an IIFE
