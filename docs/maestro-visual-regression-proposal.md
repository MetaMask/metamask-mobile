# Maestro Visual Regression Testing — Proposal (v2)

> **Jira**: MMQA-1618
> **Reference PRs**: [#27264](https://github.com/MetaMask/metamask-mobile/pull/27264) (initial POC), `cferreira/test-mcp-poc` (experimental branch)
> **Reference**: [Maestro Visual Testing Blog](https://maestro.dev/blog/visual-testing) · [assertScreenshot docs](https://docs.maestro.dev/reference/commands-available/assertscreenshot) · [takeScreenshot docs](https://docs.maestro.dev/reference/commands-available/takescreenshot) · [Tags docs](https://docs.maestro.dev/maestro-flows/workspace-management/test-discovery-and-tags)
> **Scope**: Local developer workflow only (CI integration deferred)

---

## 1. Overview

Add visual regression testing using [Maestro](https://docs.maestro.dev/) to catch unintended UI changes during development. Maestro flows navigate through critical screens, capture screenshots, and compare them against committed baselines.

This is complementary to — not a replacement for — the existing Detox E2E suite. Detox tests verify **behavior** (tap X, assert Y). Maestro visual tests verify **appearance** (does the screen still look right?).

### What Changed in v2

The original proposal assumed flows would interact with whatever state the app happened to be in — requiring fragile onboarding/unlock flows to reach testable screens. This revision introduces **fixture support**, reusing the project's existing FixtureBuilder infrastructure to put the app into a known state before each visual test.

Key changes:

- **Fixture-driven state management** via tags in Maestro YAML (Section 3)
- **Node.js orchestrator** wraps `maestro test` with fixture setup/teardown (Section 5) — developers run `yarn maestro:visual` instead of calling `maestro test` directly, because the orchestrator must build and serve the fixture state before Maestro can run the flow. Under the hood, the orchestrator still invokes `maestro test` to execute the actual flow.
- **Shared sub-flows for `clearState`/`launchApp`/unlock** — reusable YAML sub-flows handle app lifecycle
- **Composable fixture tags** using colon-delimited base + modifiers

### Assumptions

- The app is **already built and installed** on a simulator/emulator
- The app uses an **E2E/QA build** that supports fixture loading (reads from `ReadOnlyNetworkStore`)
- Flows handle `clearState`, `launchApp`, and unlock via shared sub-flows — the orchestrator handles fixture/mock server lifecycle
- Flows handle non-deterministic UI defensively using `optional: true` and `extendedWaitUntil`

### Design Principles

- **Fixture-driven** — Each flow declares the app state it needs via a tag; no manual setup required
- **Reuse existing infrastructure** — FixtureBuilder, FixtureServer, and ReadOnlyNetworkStore are battle-tested across 100+ E2E tests
- **Composable** — Fixtures use a base + modifiers pattern; flows use `runFlow:` for shared navigation
- **Defensive against non-determinism** — Use `cropOn`, `optional: true`, and `extendedWaitUntil` to handle dynamic UI
- **Cost-conscious** — Start small (~15 screenshots), iOS-only, local-only; expand only after the workflow is proven

---

## 2. Directory Structure

```
tests/maestro/                       # Shared Maestro infrastructure (all test types)
├── orchestrator/
│   ├── index.ts                     # Shared CLI orchestrator (flow discovery, execution loop)
│   ├── run-flow.ts                  # Single flow executor (fixture/mock servers + Maestro)
│   ├── parse-tags.ts                # Extracts fixture: and mock: tags from YAML metadata
│   ├── device.ts                    # iOS simulator detection
│   ├── register.js                  # Runtime hooks (module shims, Detox stubs)
│   └── empty-stub.js               # Stub for Playwright transitive imports
├── fixtures/
│   └── presets.ts                   # Composable fixture tag → FixtureBuilder registry
└── mocks/
    ├── registry.ts                  # Mock tag → setup function mapping
    └── send-balances.ts             # Send flow mock overrides

tests/visual/                        # Visual regression tests (uses shared orchestrator)
├── README.md                        # Setup, usage, guidelines
├── maestro.config.yaml              # Global Maestro config (testOutputDir, env)
├── cli.ts                           # Visual CLI entry point (adds --update-baselines)
├── rewrite-flow.ts                  # Rewrites assertScreenshot → takeScreenshot
├── flows/                           # Maestro YAML flows
│   ├── shared/                      # Reusable sub-flows (unlock, dismiss dev screens)
│   │   ├── dismiss-dev-screens.yaml
│   │   └── unlock-app.yaml
│   └── wallet/
│       ├── wallet-home.yaml
│       └── send-eth.yaml
├── .tmp/                            # Temp rewritten flows (gitignored, auto-cleaned)
└── baselines/                       # Golden screenshots (committed)
    └── ios/
        └── wallet/
```

### Why `tests/maestro/` + `tests/visual/`

- Consistent with existing convention: all test artifacts live under `tests/`
- Discoverable alongside `tests/smoke/`, `tests/regression/`, `tests/performance/`
- Shared orchestrator in `tests/maestro/` supports multiple test types (visual, functional E2E, performance)
- Visual-specific code (CLI, flow rewriter, baselines) stays in `tests/visual/`

### Baselines in Git

Start with baselines committed to git. For the initial scope (~15-20 screens, iOS only), this adds ~2-5 MB. If it grows significantly, consider Git LFS or an external artifact store later.

---

## 3. Fixture System — Tags as Fixture Identifiers

### The Problem

Maestro flows are YAML. Fixtures are built in TypeScript via `FixtureBuilder`. We need a bridge that:

1. Lets each flow **declare** what fixture it needs
2. Is **native to Maestro** (no custom YAML extensions)
3. Supports **composability** (base state + modifiers)

### The Solution: Colon-Delimited Fixture Tags

Each Maestro flow declares its fixture needs via a single tag in the YAML frontmatter:

```
fixture:<base>:<modifier1>:<modifier2>:...
```

- The first segment after `fixture:` is the **base** (starting FixtureBuilder state)
- Subsequent segments are **modifiers** applied in order (left-to-right)

### Examples

```yaml
# Wallet home with default state
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default
---
- extendedWaitUntil:
    visible:
      id: 'wallet-screen'
    timeout: 15000
- assertScreenshot:
    path: tests/visual/baselines/ios/wallet/home.png
    thresholdPercentage: 95
```

```yaml
# Wallet home with tokens and multiple accounts
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default:with-tokens:with-multiple-accounts
---
- clearState
- launchApp
- runFlow: ../shared/dismiss-dev-screens.yaml
- runFlow: ../shared/unlock-app.yaml
- extendedWaitUntil:
    visible:
      id: 'wallet-screen'
    timeout: 15000
- assertScreenshot:
    path: tests/visual/baselines/ios/wallet/home-tokens-multi-account.png
    thresholdPercentage: 95
```

```yaml
# Send flow — needs tokens to send
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default:with-tokens
---
- clearState
- launchApp
- runFlow: ../shared/dismiss-dev-screens.yaml
- runFlow: ../shared/unlock-app.yaml
- extendedWaitUntil:
    visible:
      id: 'wallet-screen'
    timeout: 15000
- tapOn:
    id: 'send-button'
- extendedWaitUntil:
    visible:
      id: 'send-screen'
    timeout: 10000
- assertScreenshot:
    path: tests/visual/baselines/ios/wallet/send-amount-entry.png
    thresholdPercentage: 95
```

### Why Tags?

- **Maestro-native** — tags are a first-class Maestro feature, no custom parsing of YAML body needed
- **Filterable** — `maestro test --include-tags=visual` runs all visual tests (though we use the orchestrator, not direct `maestro test`)
- **Discoverable** — `grep "fixture:" tests/visual/flows/` shows all fixture usage at a glance
- **Single tag per flow** — no ambiguity about which tags are fixture-related vs. organizational

### Tag Conventions

| Tag                          | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `visual`                     | All visual regression flows (for filtering) |
| `fixture:<base>:<modifiers>` | Declares the fixture this flow needs        |

---

## 4. Fixture Presets Registry

### Base + Modifier Architecture

```typescript
// tests/maestro/fixtures/presets.ts
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import type { Fixture } from '../../framework/fixtures/types';

type FixtureFn = (fb: FixtureBuilder) => FixtureBuilder;

/**
 * Base fixtures — the starting point for a FixtureBuilder chain.
 * Each base creates a new FixtureBuilder with a specific initial state.
 */
const bases: Record<string, () => FixtureBuilder> = {
  default: () => new FixtureBuilder().withDefaultFixture(),
  onboarding: () => new FixtureBuilder({ onboarding: true }),
};

/**
 * Modifiers — applied in order on top of a base to customize the fixture.
 * Each modifier receives a FixtureBuilder and returns a FixtureBuilder.
 */
const modifiers: Record<string, FixtureFn> = {
  // Token addresses should use real values from tests/framework/fixtures/constants.ts
  'with-tokens': (fb) =>
    fb.withTokens('0x1', [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
        image: '',
      },
      {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        decimals: 6,
        image: '',
      },
    ]),

  'with-multiple-accounts': (fb) => fb.withMultipleAccounts(3),

  'with-connected-dapp': (fb) => fb.withDappConnections(['https://test.dapp']),

  'with-testnetworks': (fb) => fb.withTestNetworksOff(),

  'with-metametrics': (fb) => fb.withMetaMetricsOptIn(),

  'with-clean-banners': (fb) => fb.withCleanBannerState(),
};

/**
 * Build a Fixture from a colon-delimited tag string.
 *
 * @param tag - e.g. "fixture:default:with-tokens:with-multiple-accounts"
 * @returns Built Fixture object ready for FixtureServer
 * @throws If the base or any modifier is unknown
 *
 * @example
 * const fixture = buildFromTag('fixture:default:with-tokens');
 */
export function buildFromTag(tag: string): Fixture {
  const segments = tag.split(':');
  const prefix = segments.shift(); // "fixture"

  if (prefix !== 'fixture') {
    throw new Error(
      `Invalid fixture tag: "${tag}" — must start with "fixture:"`,
    );
  }

  const baseName = segments.shift();
  if (!baseName || !bases[baseName]) {
    const available = Object.keys(bases).join(', ');
    throw new Error(
      `Unknown fixture base: "${baseName}" in tag "${tag}". Available bases: ${available}`,
    );
  }

  let fb = bases[baseName]();

  for (const mod of segments) {
    if (!modifiers[mod]) {
      const available = Object.keys(modifiers).join(', ');
      throw new Error(
        `Unknown fixture modifier: "${mod}" in tag "${tag}". Available modifiers: ${available}`,
      );
    }
    fb = modifiers[mod](fb);
  }

  return fb.build();
}

export { bases, modifiers };
```

### Adding New Presets

To support a new visual test scenario:

1. **If a new base is needed** (rare): Add an entry to `bases` that creates a `new FixtureBuilder(...)` with the desired starting config
2. **If a new modifier is needed** (common): Add an entry to `modifiers` that takes a `FixtureBuilder` and returns a modified one
3. **Reference in the flow**: Add the tag `fixture:<base>:<new-modifier>` to the Maestro YAML

---

## 5. Orchestrator — The Bridge Between Fixtures and Maestro

### Why an Orchestrator?

Maestro has no concept of fixtures, HTTP servers, or app launch arguments. The shared orchestrator (`tests/maestro/orchestrator/`) is a Node.js module that:

1. Scans flow YAML files for `fixture:*` and `mock:*` tags
2. Builds the fixture using `buildFromTag()`
3. Starts `MockServerE2E` (port 8000) and `FixtureServer` (port 12345)
4. Optionally transforms the flow file (e.g. rewrite screenshots for baseline capture)
5. Runs the Maestro flow
6. Tears down servers and cleans up temp files

Test-type-specific CLIs (e.g. `tests/visual/cli.ts`) wrap the shared orchestrator with their own options.

### Flow Execution Sequence

```
yarn maestro:visual --flow [path]
         |
         v
+---------------------------+
|  Visual CLI (cli.ts)      |  <-- tests/visual/cli.ts
|  Wraps shared orchestrator|
|  with --update-baselines  |
|  and transformFlow hook   |
+---------------------------+
         |
         v
+---------------------------+
|  Shared Orchestrator      |  <-- tests/maestro/orchestrator/index.ts
|                           |
|  1. Discover flows        |  <-- Scans flows dir for *.yaml with fixture: tags
|  2. Parse fixture/mock    |  <-- Extracts fixture:* and mock:* from YAML
|     tags                  |
|                           |
|  For each flow:           |
|  +---------------------+  |
|  | 3. Build fixture     |  |  <-- buildFromTag('fixture:default:with-eth-balance')
|  | 4. Start mock server |  |  <-- MockServerE2E on port 8000
|  | 5. Start fixture srv |  |  <-- FixtureServer on port 12345
|  | 6. Terminate app     |  |  <-- simctl terminate (stale instance)
|  | 7. Transform flow    |  |  <-- Optional: rewrite assertScreenshot → takeScreenshot
|  |    (if hook provided)|  |
|  | 8. Run Maestro       |  |  <-- async spawn: maestro test --device <UDID>
|  | 9. Collect results   |  |  <-- Pass/fail
|  | 10. Teardown         |  |  <-- Stop servers, kill ports, clean temp files
|  +---------------------+  |
|                           |
|  11. Report results       |  <-- Summary of pass/fail per flow
+---------------------------+
```

### Tag Parsing

```typescript
// tests/maestro/orchestrator/parse-tags.ts
import { parse } from 'yaml';
import { readFileSync } from 'fs';

/**
 * Extract the fixture tag from a Maestro flow YAML file.
 * Returns the full tag string (e.g., "fixture:default:with-tokens") or null.
 */
export function parseFixtureTag(flowPath: string): string | null {
  const content = readFileSync(flowPath, 'utf-8');

  // Maestro YAML uses --- to separate config from commands
  const configSection = content.split('---')[0];
  const config = parse(configSection);

  if (!config?.tags || !Array.isArray(config.tags)) {
    return null;
  }

  const fixtureTag = config.tags.find((tag: string) =>
    tag.startsWith('fixture:'),
  );
  return fixtureTag ?? null;
}
```

### App Launch

The existing E2E infrastructure uses `react-native-launch-arguments` to pass the fixture server port. For Maestro visual tests, the orchestrator uses the same mechanism:

**iOS**: `xcrun simctl launch <UDID> io.metamask.MetaMask --fixtureServerPort <PORT>`

The app's `shim.js` reads this via `LaunchArguments.value()` and passes it to `ReadOnlyNetworkStore`, which fetches fixture state from `http://localhost:<PORT>/state.json`.

> **Note**: The `xcrun simctl launch` approach for passing `fixtureServerPort` needs to be validated against `react-native-launch-arguments`. If it doesn't work, we may need to use a fixed fallback port (12345) instead.

**Android** (future): Uses `adb reverse` to map fallback port 12345 to the actual port, so the app always connects to `localhost:12345`.

### Temp File Cleanup

In `--update-baselines` mode, the orchestrator creates temporary rewritten YAML files (with `assertScreenshot` replaced by `takeScreenshot`). These temp files are written to `tests/visual/.tmp/` and managed as follows:

- The `.tmp/` directory is cleared at the **start** of every orchestrator run
- Each temp file is deleted immediately after Maestro finishes that flow
- The `.tmp/` directory is cleared again at the **end** of the run as a safety net
- `tests/visual/.tmp/` is added to `.gitignore` to prevent accidental commits if the orchestrator crashes mid-run and leaves stale files behind

### Screenshot Output Directory

The `maestro.config.yaml` must set `testOutputDir` to point at the baselines directory so both `takeScreenshot` (during baseline capture) and `assertScreenshot` (during regression) reference the same location:

```yaml
# tests/visual/maestro.config.yaml
testOutputDir: baselines
```

When the orchestrator invokes `maestro test`, it passes `--test-output-dir=baselines` (or relies on this config) so screenshots are read from and written to `tests/visual/baselines/`.

### Running a Single Flow

The orchestrator shells out to `maestro test <flow.yaml> --device <UDID> --no-ansi` and checks the exit code. Non-zero exit means a screenshot mismatch (test failure).

> **Implementation note**: The orchestrator should use `execFile` (or the project's `execFileNoThrow` utility) instead of `exec` to avoid shell injection risks when constructing commands with file paths or device UDIDs.

---

## 6. Existing Infrastructure Reuse

The visual regression system **consumes** the existing E2E fixture and mock infrastructure without modifying it. No changes are made to FixtureBuilder, FixtureServer, MockServerE2E, ReadOnlyNetworkStore, the JSON fixture files, or shim.js. The new fixture-related file is `tests/maestro/fixtures/presets.ts`, which is a thin registry that calls existing FixtureBuilder methods. Mock overrides are registered in `tests/maestro/mocks/registry.ts`.

Reused components:

| Component              | Location                                     | How It's Reused                                        |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `FixtureBuilder`       | `tests/framework/fixtures/FixtureBuilder.ts` | Builds app state from preset definitions               |
| `FixtureServer`        | `tests/framework/fixtures/FixtureServer.ts`  | Serves fixture state at `/state.json`                  |
| `ReadOnlyNetworkStore` | `app/util/test/network-store.js`             | App-side: fetches fixture state on launch              |
| `PortManager`          | `tests/framework/PortManager.ts`             | Allocates dynamic ports for the fixture server         |
| `default-fixture.json` | `tests/framework/fixtures/json/`             | Base state for `FixtureBuilder().withDefaultFixture()` |
| Launch arguments       | `shim.js`                                    | Passes `fixtureServerPort` to the app at runtime       |

### What's New (Not Reused)

| Component                           | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `tests/maestro/orchestrator/`       | Shared CLI that bridges fixture/mock setup with Maestro       |
| `tests/maestro/fixtures/presets.ts` | Named base + modifier registry for test fixtures              |
| `tests/maestro/mocks/`              | Mock tag → setup function mapping for test-specific overrides |
| `tests/visual/cli.ts`               | Visual CLI wrapper (adds `--update-baselines`)                |
| `tests/visual/rewrite-flow.ts`      | Rewrites `assertScreenshot` → `takeScreenshot` for captures   |
| `tests/visual/flows/*.yaml`         | Maestro flow files with fixture tags                          |
| `tests/visual/baselines/`           | Golden screenshots                                            |

---

## 7. Flow Authoring Guidelines

### Do

- **Declare a fixture tag** in every flow. Flows without a `fixture:*` tag will be skipped by the orchestrator.
- **Start flows from a loaded state.** The orchestrator handles launch + fixture loading. Flows should begin with `extendedWaitUntil` for the expected screen, then navigate and capture.
- **Use `id:` selectors (testIDs) over `text:` or coordinates.** TestID-based targeting is resilient to copy changes and localization.
- **Use `cropOn` to scope screenshots to stable containers.** Exclude the status bar, timestamps, balances, and user-specific content.
- **Use `optional: true` for non-deterministic UI.** Promo modals, feature flags, and banners may or may not appear.
- **Use `extendedWaitUntil` before conditional `runFlow`.** The `when: visible:` check is instant — it doesn't wait.
- **Comment the testID source.** Add a YAML comment noting where the testID is defined:
  ```yaml
  # testID from: app/components/Views/WalletHome/WalletHome.testIds.ts
  - tapOn:
      id: 'wallet-screen'
  ```

### Don't

- **Don't skip `clearState`/`launchApp`/unlock sub-flows.** Every flow must start with these to ensure a clean state.
- **Don't use `takeScreenshot` in flows.** Always use `assertScreenshot`. The orchestrator handles the rewrite to `takeScreenshot` when updating baselines.
- **Don't duplicate testID strings.** Reference existing `.testIds.ts` constants.
- **Don't commit placeholder baselines.** Every baseline must be a real screenshot captured via `yarn maestro:visual:update-baselines`.
- **Don't take full-screen screenshots.** Always use `cropOn` to exclude the status bar.
- **Don't use coordinate taps for interactive elements.** `point: "50%,53%"` is fragile.

### Flows Always Use `assertScreenshot`

Flows are always written with `assertScreenshot` — they are the "tests." Developers never manually switch between `takeScreenshot` and `assertScreenshot` in the YAML.

When baselines need to be created or updated, the orchestrator handles the mode switch. When run with `--update-baselines`, the orchestrator dynamically rewrites `assertScreenshot` to `takeScreenshot` (stripping the `.png` extension from the path) before passing the flow to Maestro. This is analogous to running `jest --updateSnapshot` — the test file stays the same, the tooling controls the mode.

```yaml
# What developers write in flows (always assertScreenshot):
- assertScreenshot:
    path: tests/visual/baselines/ios/wallet/home.png
    thresholdPercentage: 95

# What the rewriter (rewrite-flow.ts) passes to Maestro in --update-baselines mode:
# (dynamically rewritten, never checked in)
- takeScreenshot:
    path: tests/visual/baselines/ios/wallet/home
```

### Threshold Guidelines

| Screen Type                           | Threshold         | Rationale                             |
| ------------------------------------- | ----------------- | ------------------------------------- |
| General screens                       | **95%** (default) | Tolerates minor rendering differences |
| Pixel-sensitive UI (charts, icons)    | **98-99%**        | Catches subtle regressions            |
| Screens with residual dynamic content | **90-93%**        | Avoids false positives                |

---

## 8. Example: Complete Wallet Home Flow

```yaml
# tests/visual/flows/wallet/wallet-home.yaml
#
# Visual regression test for the wallet home screen in its default state.
# Fixture provides a pre-configured wallet with default account and networks.
#
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default
---
# Clear app state and relaunch so ReadOnlyNetworkStore refetches from fixture server.
- clearState
- launchApp

# Dismiss developer screens (debug builds only)
- runFlow: ../shared/dismiss-dev-screens.yaml

# Unlock the app with fixture default password
- runFlow: ../shared/unlock-app.yaml

# Wait for wallet home to load
- extendedWaitUntil:
    visible:
      id: 'wallet-screen'
    timeout: 30000

# Capture wallet home — tokens tab (default view)
- assertScreenshot:
    path: tests/visual/baselines/ios/wallet/home-default.png
    thresholdPercentage: 95
```

---

## 9. Local Developer Workflow

### Prerequisites

```bash
# Install Maestro CLI (requires v2.2.0+ for visual testing)
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro --version

# App must be built with E2E/QA configuration
# (so ReadOnlyNetworkStore fetches from FixtureServer)
```

### Baseline Lifecycle

The baseline workflow mirrors how snapshot testing works in Jest:

```
1. Write a new flow (with assertScreenshot)
        |
        v
2. Run: yarn maestro:visual:update-baselines
        |  Orchestrator rewrites assertScreenshot -> takeScreenshot
        |  Captures screenshots into tests/visual/baselines/
        v
3. Review the captured baselines visually
        |
        v
4. Commit baselines to git
        |
        v
5. Run: yarn maestro:visual
        |  Orchestrator runs flows as-is (assertScreenshot)
        |  Maestro compares live screen against committed baselines
        v
6. Tests pass (screens match) or fail (diff generated)
        |
        v
7. If UI changed intentionally:
        |  Run: yarn maestro:visual:update-baselines
        |  Review + commit updated baselines
        v
   Back to step 5
```

### Running Visual Tests

```bash
# Run all visual regression tests (assert mode — compares against baselines)
yarn maestro:visual

# Run a specific flow
yarn maestro:visual --flow tests/visual/flows/wallet/wallet-home.yaml

# Run all wallet flows
yarn maestro:visual --flow tests/visual/flows/wallet/
```

### When a Test Fails

Maestro generates a **visual diff image** highlighting changed pixels. Use this diff to determine whether the change is intentional (update baseline) or a regression (fix the code).

### Establishing or Updating Baselines

```bash
# Capture baselines (orchestrator rewrites assertScreenshot -> takeScreenshot)
yarn maestro:visual:update-baselines

# Can also target specific flows
yarn maestro:visual:update-baselines --flow tests/visual/flows/wallet/wallet-home.yaml

# Review what changed
git diff tests/visual/baselines/

# Commit if the new baselines look correct
git add tests/visual/baselines/
git commit -m "chore: update visual regression baselines"
```

This is the same command whether you're creating baselines for a brand-new flow or updating baselines after an intentional UI change. The orchestrator handles the `assertScreenshot` -> `takeScreenshot` rewrite transparently.

### Package.json Scripts

```json
{
  "maestro:visual": "ts-node --transpile-only -r ./tests/maestro/orchestrator/register.js tests/visual/cli.ts",
  "maestro:visual:update-baselines": "ts-node --transpile-only -r ./tests/maestro/orchestrator/register.js tests/visual/cli.ts --update-baselines"
}
```

---

## 10. TestID Strategy

### Reuse Existing TestIDs

The app has **201 `.testIds.ts` files**. Maestro flows reference the same string values.

**When a testID exists:**

```yaml
# Uses WalletHomeSelectorsIDs.WALLET_SCREEN
# from: app/components/Views/WalletHome/WalletHome.testIds.ts
- extendedWaitUntil:
    visible:
      id: 'wallet-screen'
    timeout: 15000
```

**When a testID is missing:**

1. Add it to the component's existing `.testIds.ts` file
2. Wire it into the component's TSX
3. Reference it in the Maestro flow

### TestIDs for `cropOn`

Visual tests benefit from container-level testIDs on major screen roots. When adding new testIDs for Maestro, prioritize container/wrapper elements that encompass the stable content area (excluding status bar and navigation chrome).

### Maintaining a TestID Mapping

`tests/visual/testid-mapping.md` maps Maestro flow references to their source `.testIds.ts` files to catch drift when testIDs are renamed.

---

## 11. Initial Scope

Start with **Wallet Home** to validate the end-to-end workflow (orchestrator + fixtures + Maestro + baselines).

### Phase 1: Wallet Home (~3-5 screenshots)

| Flow              | Fixture Tag                              | Screenshot                          |
| ----------------- | ---------------------------------------- | ----------------------------------- |
| Default view      | `fixture:default`                        | `ios/wallet/home-default.png`       |
| With tokens       | `fixture:default:with-tokens`            | `ios/wallet/home-tokens.png`        |
| Multiple accounts | `fixture:default:with-multiple-accounts` | `ios/wallet/home-multi-account.png` |

### Phase 2: Expansion Candidates

| Area      | Fixture Tag                   | Rationale                         |
| --------- | ----------------------------- | --------------------------------- |
| Send flow | `fixture:default:with-tokens` | Multi-screen flow, complex layout |
| Settings  | `fixture:default`             | Frequently modified               |
| Swaps     | `fixture:default:with-tokens` | Active development area           |

---

## 12. Platform Considerations

### iOS (Primary Target)

- **Bundle ID**: `io.metamask.MetaMask`
- **Device selection**: Must pass `--device <UDID>` when multiple devices connected
- **Status bar**: Always use `cropOn` to exclude it
- **Accessibility label merging**: iOS merges adjacent text nodes — prefer `id:` selectors
- **Simulator consistency**: Use the same simulator model across the team

### Android (Deferred to Phase 2)

- Android fixture loading uses `adb reverse` to map fallback ports to actual ports
- When added, the orchestrator will need Android-specific launch logic

---

## 13. Known Limitations

- **iOS only initially.** Android support deferred.
- **No CI integration yet.** Local-only; CI requires simulator provisioning and artifact storage.
- **Requires E2E/QA build.** The fixture loading path (`ReadOnlyNetworkStore`) is only active when `isTest` is true.
- **Dynamic content.** Balances, timestamps, and network data cause false positives. Use `cropOn` aggressively.
- **Maestro can't import TypeScript.** TestID strings in YAML flows may drift if renamed. The `testid-mapping.md` mitigates this.
- **Launch argument passing needs validation.** The `xcrun simctl launch` approach for passing `fixtureServerPort` needs to be verified against `react-native-launch-arguments`.
- **YAML rewrite for baseline updates.** The orchestrator's `assertScreenshot` -> `takeScreenshot` rewrite is a text/YAML transform. It must handle both inline (`- assertScreenshot: path.png`) and block syntax (with `cropOn`, `thresholdPercentage`) correctly, and strip the `.png` extension from the path. The rewriter should be tested against all flow files before relying on it.
- **Requires Maestro CLI v2.2.0+** for visual testing commands.

---

## 14. Lessons Learned (from v1 exploration)

### Blockers That Led to v2

| Issue                                        | Impact                                   | v2 Solution                                                   |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| testIDs not always visible to Maestro on iOS | Couldn't reliably tap password fields    | Fixtures skip onboarding/login entirely                       |
| App launch timing (Metro bundle reload)      | 10-30s delays, flaky `extendedWaitUntil` | Orchestrator manages launch + readiness                       |
| Post-login modals blocking `wallet-screen`   | Timeout failures after successful login  | Fixture provides post-onboarding state with modals suppressed |
| Multiple connected devices                   | Maestro targets wrong device             | Orchestrator passes `--device <UDID>` explicitly              |
| Onboarding flow fragility                    | Flow changes break tests                 | Fixture loads pre-onboarded state; no onboarding flow needed  |

### From PR #27264

| Issue                                      | Fix                                           |
| ------------------------------------------ | --------------------------------------------- |
| Zero-distance swipe as delay               | Use `- pause: {duration: N}`                  |
| Duplicate baseline images                  | Only commit real screenshots from actual runs |
| New testIds files duplicate existing ones  | Reuse existing `.testIds.ts` constants        |
| `update-baselines.sh` swallows failures    | Let errors propagate                          |
| Coordinate taps for buttons                | Use `id:` with testIDs instead                |
| Full-screen screenshots capture status bar | Use `cropOn` to isolate stable UI containers  |

---

## 15. Open Items / Future Work

- **Fixture grouping optimization**: Flows sharing the same fixture tag could reuse the same server session, avoiding re-launch between them. Worth exploring once there are enough flows to benefit.
- **CI integration**: Simulator provisioning, baseline artifact storage, PR commenting with diff images.
- **Android support**: `adb reverse` port mapping, Android-specific launch arguments.
- **~~Mock server integration~~**: ✅ Implemented — `MockServerE2E` runs on port 8000 with `DEFAULT_MOCKS`, deterministic feature flags, and optional test-specific overrides via `mock:` tags.
- **Baseline management tooling**: Script to review and approve baseline changes interactively.
- **App readiness detection**: The orchestrator currently relies on Maestro's `extendedWaitUntil` in the flow to handle app readiness after launch. If Maestro starts the flow before the app has loaded its fixture state, the wait may not be enough. May need an orchestrator-level readiness check (e.g., polling a health endpoint or waiting for a known delay after `simctl launch`) before invoking Maestro.
