# Maestro Visual Regression Tests

Screenshot-based visual regression tests using [Maestro](https://maestro.mobile.dev/) and the existing FixtureBuilder/FixtureServer infrastructure.

## Prerequisites

- Booted iOS simulator (e.g. iPhone 16 Pro)
- [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) installed
- Metro running (`yarn start:ios`)
- App built and installed on the simulator

## Commands

```bash
# Assert mode — compare against existing baselines
yarn maestro:visual --flow tests/visual/flows/wallet/wallet-home.yaml

# Update baselines — capture new baseline screenshots
yarn maestro:visual:update-baselines --flow tests/visual/flows/wallet/wallet-home.yaml

# Run all flows in a directory
yarn maestro:visual --flow tests/visual/flows/wallet/
```

## Adding a New Visual Test

### 1. Create a flow YAML

Create a file under `tests/visual/flows/` organized by feature area:

```yaml
# tests/visual/flows/wallet/my-screen.yaml
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default
---
# Always start with clearState + launchApp + shared sub-flows
- clearState
- launchApp
- runFlow: ../shared/dismiss-dev-screens.yaml
- runFlow: ../shared/unlock-app.yaml

# Navigate to the screen you want to capture
- extendedWaitUntil:
    visible:
      id: 'some-test-id'
    timeout: 30000

# Capture screenshot
- assertScreenshot:
    path: ios/wallet/my-screen.png
    thresholdPercentage: 95
```

### 2. Choose a fixture preset

The `fixture:` tag in your YAML tells the orchestrator which app state to load. Available presets are defined in `tests/visual/fixtures/presets.ts`:

| Tag                                      | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| `fixture:default`                        | Standard wallet with default account and networks |
| `fixture:default:with-multiple-accounts` | Multiple accounts                                 |
| `fixture:default:with-metametrics`       | MetaMetrics opted in                              |
| `fixture:default:with-clean-banners`     | Clean banner state                                |

Modifiers are composable: `fixture:default:with-multiple-accounts:with-clean-banners`

To add a new preset, add a modifier function to `tests/visual/fixtures/presets.ts`:

```ts
const modifiers = {
  'with-my-state': (fb) => fb.withSomeBuilderMethod(),
};
```

### 3. Generate the baseline

```bash
yarn maestro:visual:update-baselines --flow tests/visual/flows/wallet/my-screen.yaml
```

### 4. Verify it passes

```bash
yarn maestro:visual --flow tests/visual/flows/wallet/my-screen.yaml
```

## Writing Flows

### Shared sub-flows

Always include these at the start of every flow:

- `../shared/dismiss-dev-screens.yaml` — dismisses the dev menu (debug builds)
- `../shared/unlock-app.yaml` — enters fixture password (`123123123`) and unlocks

### Finding testIDs

Use `testID` props from the app's component source to identify elements reliably. Test IDs are defined in `*.testIds.ts` files throughout the app. For example:

- `wallet-screen` — wallet home screen
- `wallet-send-button` — send button on wallet home
- `recipient-address-input` — address input on send screen
- `send_amount` — amount display on send screen

### Dismissing promo overlays

Some screens may show feature promos. Add a conditional dismiss:

```yaml
- runFlow:
    when:
      visible: 'Not now'
    commands:
      - tapOn: 'Not now'
      - extendedWaitUntil:
          notVisible: 'Not now'
          timeout: 5000
```

### Multiple screenshots per flow

A single flow can capture multiple screens — just use different `path` values:

```yaml
- assertScreenshot:
    path: ios/wallet/send-asset-selection.png
    thresholdPercentage: 95

# ... navigate to next screen ...

- assertScreenshot:
    path: ios/wallet/send-amount-input.png
    thresholdPercentage: 95
```

### Screenshot commands

- **`assertScreenshot`** — compares the current screen against a baseline image. Fails if similarity is below `thresholdPercentage`.
- **`takeScreenshot`** — captures a screenshot without comparison (used internally by `--update-baselines` mode, which rewrites `assertScreenshot` to `takeScreenshot`).

## Architecture

```
tests/visual/
├── baselines/              # Baseline screenshots (gitkeep, storage TBD)
├── fixtures/
│   └── presets.ts          # Composable fixture tag → FixtureBuilder registry
├── flows/
│   ├── shared/             # Reusable sub-flows (unlock, dismiss dev screens)
│   └── wallet/             # Flows organized by feature area
├── orchestrator/
│   ├── index.ts            # CLI entry point
│   ├── run-flow.ts         # Single flow executor (servers + Maestro)
│   ├── parse-fixture-tag.ts # Extracts fixture: tag from YAML metadata
│   ├── rewrite-flow.ts     # Rewrites assertScreenshot → takeScreenshot
│   ├── device.ts           # iOS simulator detection
│   ├── register.js         # Runtime hooks (module shims, Detox stubs)
│   └── empty-stub.js       # Stub for Playwright transitive imports
├── maestro.config.yaml     # Maestro configuration
└── tsconfig.json           # TypeScript config for orchestrator
```

The orchestrator starts a **FixtureServer** (port 12345) and **MockServerE2E** (port 8000) for each flow, providing deterministic app state and API responses. Maestro runs as a child process while the servers handle requests on the Node event loop.
