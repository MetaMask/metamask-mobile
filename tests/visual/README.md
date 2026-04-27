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
    path: tests/visual/baselines/ios/wallet/my-screen.png
    thresholdPercentage: 95
```

### 2. Choose a fixture preset

The `fixture:` tag in your YAML tells the orchestrator which app state to load. Available presets are defined in `tests/maestro/fixtures/presets.ts`:

| Tag                                      | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| `fixture:default`                        | Standard wallet with default account and networks |
| `fixture:default:with-multiple-accounts` | Multiple accounts                                 |
| `fixture:default:with-metametrics`       | MetaMetrics opted in                              |
| `fixture:default:with-clean-banners`     | Clean banner state                                |

Modifiers are composable: `fixture:default:with-multiple-accounts:with-clean-banners`

To add a new preset, add a modifier function to `tests/maestro/fixtures/presets.ts`:

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

### Prefer testIDs over text or coordinates

Always use `id:` (testID) selectors when possible. They are stable across device sizes, OS versions, and locales. Avoid coordinate-based taps (`point: "x%,y%"`) — they break on different screen sizes.

```yaml
# Good — works on any device
- tapOn:
    id: 'fast-refresh'

# Bad — breaks on different screen sizes
- tapOn:
    point: '93%,37%'
```

Test IDs are defined in `*.testIds.ts` files throughout the app. For example:

- `wallet-screen` — wallet home screen container
- `total-balance-text` — portfolio balance text
- `token-list` — token list on wallet home
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
    path: tests/visual/baselines/ios/wallet/send-asset-selection.png
    thresholdPercentage: 95

# ... navigate to next screen ...

- assertScreenshot:
    path: tests/visual/baselines/ios/wallet/send-amount-input.png
    thresholdPercentage: 95
```

### Screenshot commands

- **`assertScreenshot`** — compares the current screen against a baseline image. Fails if similarity is below `thresholdPercentage`.
- **`takeScreenshot`** — captures a screenshot without comparison (used internally by `--update-baselines` mode, which rewrites `assertScreenshot` to `takeScreenshot`).

## Architecture

```
tests/maestro/                 # Shared Maestro infrastructure (all test types)
├── orchestrator/
│   ├── index.ts               # Shared CLI orchestrator (flow discovery, execution loop)
│   ├── run-flow.ts            # Single flow executor (fixture/mock servers + Maestro)
│   ├── parse-tags.ts          # Extracts fixture: and mock: tags from YAML metadata
│   ├── device.ts              # iOS simulator detection
│   ├── register.js            # Runtime hooks (module shims, Detox stubs)
│   └── empty-stub.js          # Stub for Playwright transitive imports
├── fixtures/
│   └── presets.ts             # Composable fixture tag → FixtureBuilder registry
└── mocks/
    ├── registry.ts            # Mock tag → setup function mapping
    └── send-balances.ts       # Send flow mock overrides

tests/visual/                  # Visual regression tests (uses shared orchestrator)
├── baselines/ios/wallet/      # Baseline screenshots
├── cli.ts                     # Visual CLI entry point (adds --update-baselines)
├── rewrite-flow.ts            # Rewrites assertScreenshot → takeScreenshot
├── flows/
│   ├── shared/                # Reusable sub-flows (unlock, dismiss dev screens)
│   └── wallet/                # Visual flow YAMLs
├── maestro.config.yaml        # Maestro configuration
└── README.md
```

The shared orchestrator (`tests/maestro/`) starts a **FixtureServer** (port 12345) and **MockServerE2E** (port 8000) for each flow, providing deterministic app state and API responses. Maestro runs as a child process while the servers handle requests on the Node event loop.

The visual CLI (`tests/visual/cli.ts`) wraps the shared orchestrator and adds `--update-baselines` mode, which rewrites `assertScreenshot` commands to `takeScreenshot` before running Maestro.
