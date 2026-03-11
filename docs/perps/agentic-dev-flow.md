# Agentic Development Flow

> Scripts live in `scripts/perps/agentic/`. Once proven, intent is to promote to `scripts/agentic/`.

How AI agents and developers verify code changes against a running MetaMask Mobile app via CDP.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     preflight.sh                                │
│                                                                 │
│  [--clean]                              [default]               │
│  yarn setup                             check booted sim        │
│      │                                      │                   │
│  build app (yarn build:ios:main:dev)    start-metro.sh          │
│      │                                      │                   │
│  install on sim ─────────────────→     [--launch]               │
│                                    expo-dev-client deep link    │
│                                             │                   │
│                                        CDP ready?               │
│                                        (polls /json/list)       │
│                                             │                   │
│  [--wallet-setup]                      [--wallet <pw>]          │
│  setup-wallet.sh                       cdp-bridge.js unlock     │
│  (fixture → vault)                     (fiber tree inject)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent / Developer                            │
│                                                                 │
│  Code changes ─────→ validate-recipe.sh <recipe.json>          │
│                              │                                  │
│            ┌─────────────────┼──────────────────┐               │
│            ▼                 ▼                   ▼               │
│       navigate          eval / eval-async    log_watch          │
│            │                 │                   │               │
│            └─────────────────┴───────────────────┘               │
│                     PASS or FAIL                                │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# First time (~20 min iOS build)
echo 'export WATCHER_PORT="8084"' >> .js.env
mkdir -p .agent && cat > .agent/wallet-fixture.json << 'EOF'
{"password":"pw","accounts":[{"type":"mnemonic","value":"your twelve words"}],"settings":{"metametrics":false}}
EOF
bash scripts/perps/agentic/preflight.sh --clean --wallet-setup

# Subsequent runs (~3s)
bash scripts/perps/agentic/preflight.sh --check-only
```

## Scripts Reference

### Environment

| Script            | Purpose                          | Key Flags                                                                 |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `preflight.sh`    | Full environment check/setup     | `--clean`, `--rebuild`, `--check-only`, `--wallet-setup`, `--wallet <pw>` |
| `start-metro.sh`  | Start/detect Metro               | `--launch`                                                                |
| `stop-metro.sh`   | Stop Metro                       | —                                                                         |
| `reload-metro.sh` | Reload JS bundle                 | —                                                                         |
| `setup-wallet.sh` | Create/unlock vault from fixture | `--fixture <path>`, `--force`, `--help`                                   |

### App Interaction

```
app-state.sh route                        # current route
app-state.sh eval "<js>"                  # sync eval in app
app-state.sh eval-async "<js>"            # async eval (Promise)
app-state.sh recipe perps/positions       # run named recipe
app-state.sh unlock <password>            # unlock via fiber tree
app-navigate.sh <Route> [params-json]     # navigate + screenshot
screenshot.sh [label]                     # simulator screenshot
interactive-start.sh                      # interactive REPL session
```

### Validation

```bash
validate-recipe.sh <recipe.json>              # run all steps
validate-recipe.sh <recipe.json> --dry-run    # print without executing
validate-recipe.sh <recipe.json> --step <id>  # single step
validate-recipe.sh <recipe.json> --skip-manual
```

## CDP Eval Semantics

**eval_sync** — `Runtime.evaluate` synchronously. For expressions returning immediately.

**eval_async** — Wraps in Promise, stores result on `globalThis`, polls. Use `.then()` chains (no top-level `await` in Hermes).

All expressions must be **ES5** — no arrow functions, `const`/`let`, or template literals.

## Recipe Format

PR recipes at `~/dev/metamask/mobile-recipes/<pr>.json`:

```json
{
  "pr": 27179,
  "validate": {
    "runtime": {
      "steps": [
        { "id": "nav", "action": "navigate", "target": "PerpsMarketListView" },
        {
          "id": "check",
          "action": "eval_async",
          "expression": "...",
          "assert": { "field": "count", "operator": "gt", "value": 0 }
        },
        { "id": "logs", "action": "log_watch", "must_not_appear": ["error"] }
      ]
    }
  }
}
```

Actions: `navigate`, `eval_sync`, `eval_async`, `recipe_ref`, `log_watch`, `screenshot`, `wait`, `manual`

Asserts: `length_eq`, `length_gt`, `eq`, `gt`, `not_null`, `contains`, `not_contains`

## Wallet Fixture

File: `.agent/wallet-fixture.json` (gitignored)

```json
{
  "password": "pw",
  "accounts": [
    { "type": "mnemonic", "value": "word1 ... word12" },
    { "type": "privateKey", "value": "0xabc...", "name": "Trading" }
  ],
  "settings": { "metametrics": false }
}
```

First mnemonic creates the vault. Private keys are imported after. No mnemonic = fresh vault.

## Key Globals (DEV mode)

Exposed by `NavigationService.ts` on `globalThis`:

- `__AGENTIC__` — navigate, getRoute, getState
- `Engine` — controller access (`Engine.context.PerpsController`, etc.)
- `store` — Redux store

## Environment Variables

| Var            | Purpose               | Default     |
| -------------- | --------------------- | ----------- |
| `WATCHER_PORT` | Metro port            | `8081`      |
| `MM_PASSWORD`  | Wallet password       | —           |
| `PLATFORM`     | Force `ios`/`android` | auto-detect |

Set in `.js.env` or pass as env vars.

## Error Recovery

| Problem               | Fix                                         |
| --------------------- | ------------------------------------------- |
| Metro crash           | `stop-metro.sh` then `start-metro.sh`       |
| CDP failure           | Check Metro + device booted                 |
| Hot-reload resets app | `app-navigate.sh WalletTabHome` then target |
| Stuck on lock screen  | `unlock-wallet.sh <password>`               |

## Timing Reference

Measured on MacBook Pro, Metro warm, CDP connected:

| Operation                      | Time |
| ------------------------------ | ---- |
| `start-metro.sh` (warm)        | 0.1s |
| `cdp-bridge.js status`         | 0.1s |
| `screenshot.sh`                | 2.8s |
| `validate-recipe.sh` (4 steps) | 3.7s |
| `preflight.sh --check-only`    | 3.1s |
| `preflight.sh --wallet-setup`  | 3.5s |
