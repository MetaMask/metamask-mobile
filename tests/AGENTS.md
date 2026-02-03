# tests/ — AGENTS.md

This file guides AI coding agents when working **inside the `tests/` folder**: E2E framework, fixtures, API/controller/module mocking, regression and smoke specs, flows, page-objects, resources, seeder, and tools. It points to canonical sources instead of duplicating content.

## Context of This Folder

- **`tests/framework/`** — TypeScript E2E framework: Assertions, Gestures, Matchers, Utilities, FixtureHelper, FixtureBuilder, FixtureServer, PlaywrightAdapter, EncapsulatedElement, FrameworkDetector. **All E2E specs must import from `tests/framework/index.ts`.** Contains `fixtures/` (FixtureHelper, FixtureBuilder, FixtureServer, FixtureUtils) and `config/`.
- **`tests/api-mocking/`** — API mocking for E2E: MockServerE2E, default and feature-specific mock responses, helpers (e.g. remoteFeatureFlags). Used by fixtures when starting the mock server.
- **`tests/controller-mocking/`** — Controller-level mocks and mock config (e.g. perps).
- **`tests/module-mocking/`** — Module mocks (e.g. Sentry).
- **`tests/docs/`** — README (framework + E2E patterns), MOCKING.md, CONTROLLER_MOCKING.md, MODULE_MOCKING.md.
- **`tests/regression/`** — Regression test specs (accounts, assets, ramps, wallet, etc.).
- **`tests/smoke/`** — Smoke specs (accounts, assets, card, predict, ramps, rewards, stake, wallet) and API spec tests (`api-specs/`).
- **`tests/flows/`** — Reusable flow definitions (e.g. accounts).
- **`tests/page-objects/`** — Additional page objects (e.g. Predict, Trending) used by specs.
- **`tests/resources/`** — Static resources (networks, mock configs, JSON).
- **`tests/seeder/`** — Anvil/Ganache seeding and network state for E2E.
- **`tests/tools/`** — E2E tooling (e.g. e2e-ai-analyzer).
- **`tests/constants/`**, **`tests/helpers/`**, **`tests/locators/`** — Shared constants, helpers, and selectors.

E2E specs live in **`e2e/specs/`**; they consume this framework and fixtures. Page Objects for the main app screens live in **`e2e/pages/`**; `tests/page-objects/` holds extra/feature-specific ones.

## Canonical Sources

### Framework & E2E Patterns

| Source                                                                                  | Scope                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [tests/docs/README.md](docs/README.md)                                                  | E2E framework structure, withFixtures, FixtureBuilder, best practices, anti-patterns, code review checklist |
| [.cursor/rules/e2e-testing-guidelines.mdc](../.cursor/rules/e2e-testing-guidelines.mdc) | E2E patterns, Page Objects, assertions, gestures, prohibited patterns                                       |
| [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md)                             | Setup, run commands, build types, Metro, Detox, Flask E2E                                                   |

### Mocking

| Topic              | Path                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| API mocking        | [tests/docs/MOCKING.md](docs/MOCKING.md) — Default mocks, test-specific mocks, MockServerE2E |
| Controller mocking | [tests/docs/CONTROLLER_MOCKING.md](docs/CONTROLLER_MOCKING.md)                               |
| Module mocking     | [tests/docs/MODULE_MOCKING.md](docs/MODULE_MOCKING.md)                                       |

### Implementation Reference

| Topic             | Path                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework exports | [tests/framework/index.ts](framework/index.ts)                                                                                              |
| Fixtures          | [tests/framework/fixtures/FixtureHelper.ts](framework/fixtures/FixtureHelper.ts), [FixtureBuilder.ts](framework/fixtures/FixtureBuilder.ts) |
| E2E specs & pages | [e2e/specs/](../e2e/specs/), [e2e/pages/](../e2e/pages/)                                                                                    |

### Project-Wide

- **Root index**: [AGENTS.md](../AGENTS.md) — Commands, Cursor rules, architecture, before implementing.
- **Coding guidelines**: [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md).
- **Unit testing**: [.cursor/rules/unit-testing-guidelines.mdc](../.cursor/rules/unit-testing-guidelines.mdc) — for unit tests under `tests/` (e.g. framework tests).

## Before Working in tests/

1. **Framework changes**: Read [tests/docs/README.md](docs/README.md) and [.cursor/rules/e2e-testing-guidelines.mdc](../.cursor/rules/e2e-testing-guidelines.mdc). Keep exports in `tests/framework/index.ts`; no deprecated patterns in new code.
2. **Mocking**: Read [tests/docs/MOCKING.md](docs/MOCKING.md) (and CONTROLLER_MOCKING / MODULE_MOCKING if relevant). Default mocks live under `tests/api-mocking/mock-responses/defaults/`; test-specific mocks are passed via `withFixtures` options.
3. **Regression/smoke specs**: Same rules as `e2e/specs/`: use `withFixtures`, Page Objects, framework imports from `tests/framework/index.ts`; no `TestHelpers.delay()`.
4. Use **yarn** only; E2E commands are in [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md).
