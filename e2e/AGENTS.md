# e2e/ — AGENTS.md

This file guides AI coding agents when working **inside the `e2e/` folder**: E2E test specs, Page Objects, selectors, and E2E configuration. It points to canonical sources instead of duplicating content.

## Context of This Folder

- **`e2e/specs/`** — E2E test files organized by feature (confirmations, identity, multichain, networks, onboarding, perps, send, snaps, swaps, wallet, etc.). Tests use Detox (and optionally Playwright via the unified framework).
- **`e2e/pages/`** — Page Object Model (POM) classes: one folder per screen/flow (Browser, Onboarding, Settings, wallet, etc.). **All UI access in specs must go through Page Objects**, not direct selectors.
- **`e2e/selectors/`** — Element selectors by feature (`.selectors.ts` / `.selectors.js`). Used by Page Objects; avoid using selectors directly in specs.
- **`e2e/` config** — `playwright.config.ts`, `jest.e2e.config.js`, `environment.js`, `init.js`, `helpers.js`, `tags.js`, `viewHelper.ts`. Entry point and tags for E2E runs.

Tests in `e2e/specs/` depend on the **TypeScript framework** and **fixtures** in `tests/framework/` and `tests/framework/fixtures/`. Imports must use `tests/framework/index.ts` (and `FixtureHelper` / `FixtureBuilder` from `tests/framework/fixtures/`).

## Canonical Sources

### E2E Guidelines (Mandatory)

| Source                                                                                  | Scope                                                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [.cursor/rules/e2e-testing-guidelines.mdc](../.cursor/rules/e2e-testing-guidelines.mdc) | E2E patterns, Page Objects, assertions, gestures, prohibited patterns                       |
| [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md)                             | Setup, run commands, build types (main/flask), Metro, Detox, Flask E2E                      |
| [tests/docs/README.md](../tests/docs/README.md)                                         | E2E framework structure, withFixtures, FixtureBuilder, anti-patterns, code review checklist |

### Framework & Fixtures (Implementation)

| Topic             | Path                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework exports | [tests/framework/index.ts](../tests/framework/index.ts) — Assertions, Gestures, Matchers, Utilities, PlaywrightAdapter                                        |
| Fixtures          | [tests/framework/fixtures/FixtureHelper.ts](../tests/framework/fixtures/FixtureHelper.ts), [FixtureBuilder.ts](../tests/framework/fixtures/FixtureBuilder.ts) |
| API mocking       | [tests/docs/MOCKING.md](../tests/docs/MOCKING.md) — Default mocks, test-specific mocks                                                                        |

### Project-Wide

- **Root index**: [AGENTS.md](../AGENTS.md) — Commands, Cursor rules, architecture, before implementing.
- **Coding guidelines**: [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md).

## Before Working in e2e/

1. Read [.cursor/rules/e2e-testing-guidelines.mdc](../.cursor/rules/e2e-testing-guidelines.mdc) and [tests/docs/README.md](../tests/docs/README.md).
2. **Specs**: Use `withFixtures` + `FixtureBuilder`; call Page Object methods only (no `element(by.id(...))` in specs).
3. **Pages**: Put selectors in `e2e/selectors/` or in the page folder; use framework `Matchers`, `Gestures`, `Assertions` from `tests/framework/index.ts`.
4. **No** `TestHelpers.delay()`; use framework assertions/waiting with `description` parameters.
5. Use **yarn** only (e.g. `yarn test:e2e:ios:debug:run`, `yarn test:e2e:android:debug:run`); see [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md) for full commands.
