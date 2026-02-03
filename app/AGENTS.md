# app/ — AGENTS.md

This file guides AI coding agents when working **inside `app/`**: source code and tests that live under this folder — unit tests (`*.test.{ts,tsx,js,jsx}`) and component-view tests (`*.view.test.*`) are colocated with code across `app/`. It points to canonical sources instead of duplicating content.

## Context of This Folder

- **`app/`** — Application code and app-level tests:
  - **Unit tests**: Colocated under `app/` (e.g. `app/core/Engine/Engine.test.ts`, `app/components/.../*.test.tsx`). Run with `yarn test:unit`. Follow [.cursor/rules/unit-testing-guidelines.mdc](../.cursor/rules/unit-testing-guidelines.mdc).
  - **Component-view tests**: Specs are `*.view.test.*` colocated with components (e.g. under `app/components/`). Framework and presets/renderers live in [util/test/component-view/](./util/test/component-view/). Run with `yarn test:view`. Follow [.cursor/rules/component-view-testing.mdc](../.cursor/rules/component-view-testing.mdc).
  - **Test utilities**: Shared setup and helpers in [util/test/](./util/test/) (`testSetup.js`, `testSetupView.js`, `renderWithProvider.tsx`, `platform.ts`, etc.).

Unit and component-view tests are spread across `app/`; this file is the agent index for working on any of them.

## Canonical Sources

### Unit Tests (Mandatory)

| Source                                                                                    | Scope                                                                                         |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [.cursor/rules/unit-testing-guidelines.mdc](../.cursor/rules/unit-testing-guidelines.mdc) | Patterns, mocking, AAA, naming; use for all `*.test.*` under app/ (excluding `*.view.test.*`) |
| [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md)     | TypeScript, file organization, testing                                                        |

### Component-View Tests (Mandatory)

| Source                                                                                                               | Scope                                                            |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [.cursor/rules/component-view-testing.mdc](../.cursor/rules/component-view-testing.mdc)                              | Mock policy, presets/renderers, navigation, test structure       |
| [app/util/test/component-view/README.md](./util/test/component-view/README.md)                                       | Framework layout, usage, presets, renderers, platform matrix     |
| [app/util/test/component-view/COMPONENT_VIEW_TEST_RULES.md](./util/test/component-view/COMPONENT_VIEW_TEST_RULES.md) | Detailed rules, allowed mocks, how to write component-view tests |

### Implementation Reference (Component-View)

| Topic         | Path                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| Mocks         | [util/test/component-view/mocks.ts](./util/test/component-view/mocks.ts)               |
| Presets       | [util/test/component-view/presets/](./util/test/component-view/presets/)               |
| Renderers     | [util/test/component-view/renderers/](./util/test/component-view/renderers/)           |
| State fixture | [util/test/component-view/stateFixture.ts](./util/test/component-view/stateFixture.ts) |

### Other Test Areas (Root-Level Indexes)

| Folder                       | AGENTS.md                             | Context                                              |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------- |
| [e2e/](../e2e/AGENTS.md)     | [e2e/AGENTS.md](../e2e/AGENTS.md)     | E2E specs, Page Objects, Detox/Playwright            |
| [tests/](../tests/AGENTS.md) | [tests/AGENTS.md](../tests/AGENTS.md) | E2E framework, fixtures, mocking, regression & smoke |
| [wdio/](../wdio/AGENTS.md)   | [wdio/AGENTS.md](../wdio/AGENTS.md)   | Legacy WebdriverIO/Appium (deprecated)               |

### Project-Wide

- **Root index**: [AGENTS.md](../AGENTS.md) — Commands, Cursor rules, architecture.
- **Coding guidelines**: [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md).

## Before Working on App Code or App Tests

1. **Unit tests**: Read [.cursor/rules/unit-testing-guidelines.mdc](../.cursor/rules/unit-testing-guidelines.mdc). Use **yarn** only (e.g. `yarn test:unit`, `yarn test:unit -- <path>`).
2. **Component-view tests**: Read [.cursor/rules/component-view-testing.mdc](../.cursor/rules/component-view-testing.mdc) and [util/test/component-view/COMPONENT_VIEW_TEST_RULES.md](./util/test/component-view/COMPONENT_VIEW_TEST_RULES.md). Import mocks from `util/test/component-view/mocks`; use presets/renderers from [util/test/component-view/](./util/test/component-view/). Run with `yarn test:view` or `yarn test:unit -- --testPathPattern="\.view\.test\."`. Prefer `--coverage=false` during iteration for speed.
