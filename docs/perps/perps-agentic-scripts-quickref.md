# Agentic Scripts — Quick Reference

## Yarn Shortcuts

| Command                | What it does                                               | Time    |
| ---------------------- | ---------------------------------------------------------- | ------- |
| `yarn a:setup:ios`     | Clean install + build + Metro + launch + CDP + wallet seed | ~2.5min |
| `yarn a:setup:android` | Same as above for Android                                  | ~3min   |
| `yarn a:ios`           | Metro + launch + CDP + unlock/seed (no clean, no rebuild)  | ~30s    |
| `yarn a:android`       | Same as above for Android                                  | ~30s    |
| `yarn a:watch`         | Interactive Metro with live reload                         | —       |
| `yarn a:stop`          | Stop Metro                                                 | —       |
| `yarn a:reload`        | Reload JS bundle on connected app                          | —       |
| `yarn a:status`        | App state snapshot (route + account)                       | —       |
| `yarn a:navigate`      | Navigate to a route                                        | —       |

## When to use what

- **First time / after `git clean`**: `yarn a:setup:ios` (full clean)
- **Daily dev / branch switch**: `yarn a:ios` (reuses existing build, unlocks wallet)
- **Just want Metro**: `yarn a:watch`

## Prerequisites

1. `.js.env` must have `WATCHER_PORT`, `IOS_SIMULATOR`, `SIM_UDID` (iOS) or `ANDROID_DEVICE` (Android)
2. `.agent/wallet-fixture.json` must exist (copy from `scripts/perps/agentic/wallet-fixture.example.json`)

## Flows

Flows are parameterized JSON test sequences in `scripts/perps/agentic/teams/<team>/flows/`.

```bash
# List all flows
ls scripts/perps/agentic/teams/perps/flows/*.json

# Run a flow
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/flows/market-discovery.json --skip-manual

# Dry-run (prints steps, no execution)
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/flows/trade-open-market.json --dry-run

# Run all flows (dry-run)
for f in scripts/perps/agentic/teams/perps/flows/*.json; do
  bash scripts/perps/agentic/validate-recipe.sh "$f" --dry-run --skip-manual
done
```

### Parameter Passing

Flows use `{{param}}` tokens. Defaults are declared in the flow's `inputs` block. Override via `flow_ref` params or by editing the JSON.

### Pre-Conditions

Flows can declare `pre_conditions` — named checks that must pass before steps run. If a check fails, the runner aborts with a hint. Available pre-conditions are registered in `teams/perps/pre-conditions.js`.

## CDP Bridge Commands

```bash
CDP="node scripts/perps/agentic/cdp-bridge.js"

$CDP status                          # Route + account snapshot
$CDP navigate PerpsMarketListView    # Navigate to a screen
$CDP get-route                       # Current route
$CDP get-state engine.backgroundState.NetworkController  # Redux state
$CDP eval "1+1"                      # Eval JS in app
$CDP eval-async "fetch('...')"       # Eval async JS
$CDP unlock <password>               # Unlock wallet on login screen
$CDP press-test-id <testId>          # Press component by testID
$CDP scroll-view --test-id <id>      # Scroll a ScrollView/FlatList
$CDP list-accounts                   # All accounts
$CDP switch-account <address>        # Switch active account
$CDP eval-ref perps/positions        # Run a named eval ref
$CDP eval-ref --list                 # List all eval refs
$CDP check-pre-conditions '<json>'   # Validate pre-conditions
```

## Other Scripts

```bash
scripts/perps/agentic/app-navigate.sh <route>      # Navigate + screenshot
scripts/perps/agentic/app-navigate.sh --list        # Discover all live routes
scripts/perps/agentic/screenshot.sh                 # Capture simulator screenshot
scripts/perps/agentic/setup-wallet.sh               # Seed wallet via CDP
scripts/perps/agentic/unlock-wallet.sh <password>   # Unlock via CDP
scripts/perps/agentic/validate-recipe.sh <folder>   # Run PR recipe folder
scripts/perps/agentic/validate-flow-schema.js       # Validate flow authoring rules
scripts/perps/agentic/validate-pre-conditions.js    # Validate pre-condition registry
```

## Architecture

```
NavigationService.ts (set navigation)
  --> AgenticService.install(navRef, deferredNav)   [__DEV__ only]
        --> globalThis.__AGENTIC__ = { setupWallet, pressTestId, scrollView, ... }

CDP Bridge (cdp-bridge.js)
  --> Metro /json/list --> WebSocket --> Runtime.evaluate
        --> reads globalThis.__AGENTIC__.*
```

## Worktree / Multi-Device Mapping

Ports are set per-slot via `.js.env` `WATCHER_PORT`. When both iOS and Android devices are connected, set `PLATFORM=android` or `PLATFORM=ios` to disambiguate screenshot targets. CDP commands are platform-agnostic.
