# wdio/ — AGENTS.md

This file guides AI coding agents when working **inside the `wdio/` folder**: legacy WebdriverIO/Appium infrastructure. It points to canonical sources instead of duplicating content.

## Context of This Folder

- **`wdio/helpers/`** — Legacy helpers (Accounts.js, Gestures.js, Selectors.js) for WebdriverIO/Appium.
- **`wdio/screen-objects/`** — Screen Object Model (SOM) classes (JavaScript): onboarding, browser, wallet, modals, Perps, Predict, etc., plus `testIDs/`.
- **`wdio/utils/`** — Utilities (e.g. generateTestId.js).

**Status**: The Appium/WebdriverIO/Cucumber E2E stack is **deprecated**. Performance testing (app launch times, upgrades) is now done with **Appwright** (Playwright-based). See [docs/readme/e2e-testing.md § Appium (Deprecated)](../docs/readme/e2e-testing.md) and [docs/readme/e2e-testing.md § Appwright](../docs/readme/e2e-testing.md).

- **Current E2E**: Detox + TypeScript framework in **`e2e/`** and **`tests/`** (see [e2e/AGENTS.md](../e2e/AGENTS.md), [tests/AGENTS.md](../tests/AGENTS.md)).
- **Current performance tests**: **`appwright/tests/`** (e.g. `appwright/tests/performance/`).

## Canonical Sources

### Legacy WDIO/Appium (Reference Only)

| Source | Scope |
|--------|--------|
| [docs/readme/e2e-testing.md § ~~Appium~~ (Deprecated)](../docs/readme/e2e-testing.md) | Legacy Appium/WebdriverIO/Cucumber docs (capabilities, BrowserStack, Bitrise), kept for reference |
| [docs/readme/e2e-testing.md § Appwright](../docs/readme/e2e-testing.md) | Current performance testing with Appwright, BrowserStack, local simulators/emulators |

### Current E2E & Project-Wide

| Topic | Path |
|-------|------|
| E2E specs, pages, framework | [e2e/AGENTS.md](../e2e/AGENTS.md), [tests/AGENTS.md](../tests/AGENTS.md) |
| E2E guidelines | [.cursor/rules/e2e-testing-guidelines.mdc](../.cursor/rules/e2e-testing-guidelines.mdc), [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md) |
| Root index | [AGENTS.md](../AGENTS.md) |
| Coding guidelines | [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md) |

## Before Working in wdio/

1. **Prefer not extending wdio**: New E2E and performance tests should use **Detox + `e2e/` + `tests/`** or **Appwright** (`appwright/`), not WebdriverIO/Appium.
2. **If maintaining wdio**: Use [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md) (legacy Appium section) for capabilities, BrowserStack, and run commands. Use **yarn** (e.g. `yarn test:wdio:ios`, `yarn test:wdio:android` if still defined in `package.json`).
3. **Performance / launch / upgrade tests**: Implement or run them under **`appwright/tests/`** and follow Appwright docs in [docs/readme/e2e-testing.md § Appwright](../docs/readme/e2e-testing.md).
