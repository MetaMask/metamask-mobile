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
$CDP recipe perps/positions          # Run a named recipe
$CDP recipe --list                   # List all recipes
```

## Other Scripts

```bash
scripts/perps/agentic/app-navigate.sh <route>      # Navigate + screenshot
scripts/perps/agentic/app-navigate.sh --list        # Discover all live routes
scripts/perps/agentic/screenshot.sh                 # Capture simulator screenshot
scripts/perps/agentic/setup-wallet.sh               # Seed wallet via CDP
scripts/perps/agentic/unlock-wallet.sh <password>   # Unlock via CDP
scripts/perps/agentic/validate-recipe.sh <folder>   # Run PR recipe folder
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

## Worktree Mapping

| Worktree | Simulator         | Port |
| -------- | ----------------- | ---- |
| alpha    | iPhone16Pro-Alpha | 8085 |
| beta     | iPhone16Pro-Beta  | 8084 |
| gamma    | iPhone16Pro-Gamma | 8083 |
| delta    | iPhone16Pro-Delta | 8082 |
