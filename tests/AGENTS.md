# tests/ — AGENTS.md

Single agent index for **tests/**, and **wdio/**. Pointers only; details live in the canonical sources below.

## Scope

- **tests/smoke** — `tests/smoke/`, `tests/regression/` , `tests/page-objects/`, `tests/selectors/`, config. Specs, Page Objects, selectors. Consumes `tests/framework/` and fixtures.
- **tests/regression** — `tests/smoke/`, `tests/regression/` , `tests/page-objects/`, `tests/selectors/`, config. Specs, Page Objects, selectors. Consumes `tests/framework/` and fixtures.
- **tests/** — `tests/framework/`, `tests/api-mocking/`, `tests/docs/`, `tests/regression/`, `tests/smoke/`, etc. Framework, fixtures, mocking, regression/smoke specs.
- **wdio/** — `wdio/helpers/`, `wdio/screen-objects/`, `wdio/utils/`. Legacy WebdriverIO/Appium — **deprecated**. Use Detox + tests/smoke or Playwright for performance.
- **component view tests** — `app/**/*.view.test.tsx`. Jest component view tests.

### Component-View Tests (Mandatory)

- [tests/component-view/AGENTS.md](component-view/AGENTS.md) — Agent index for component view tests: framework, canonical skill, run commands, enforcement.

### E2E Tests (Detox smoke/regression)

- [docs/testing/e2e-testing.md](../docs/testing/e2e-testing.md) — Canonical guide: patterns, Page Objects, assertions, gestures, prohibited patterns.

## Canonical Sources (read these, do not duplicate)

- [docs/testing/e2e-testing.md](../docs/testing/e2e-testing.md) — Patterns, Page Objects, assertions, gestures, prohibited patterns.
- [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md) — Setup, run commands, build types, Metro, Detox, Flask; legacy Appium; Playwright.
- [.github/guidelines/E2E_DECISION_TREE.md](../.github/guidelines/E2E_DECISION_TREE.md) — CI decision flow: when E2E runs, which labels gate it (pr-not-ready-for-e2e, skip-e2e, skip-smart-e2e-selection), AI test selection logic.
- [tests/docs/README.md](docs/README.md) — Framework structure, withFixtures, FixtureBuilder, anti-patterns, checklist.
- [tests/docs/PLAYWRIGHT_LOCAL_EMULATOR.md](docs/PLAYWRIGHT_LOCAL_EMULATOR.md) — Local `buildPath` vs pre-installed app, `fullReset` / `noReset` for `EmulatorConfigBuilder`.
- [tests/docs/MOCKING.md](docs/MOCKING.md) — API mocking, default and test-specific mocks.
- [tests/docs/analytics-e2e.md](docs/analytics-e2e.md) — MetaMetrics E2E: `analyticsExpectations` on `withFixtures`, presets, `runAnalyticsExpectations`.
- [tests/docs/CONTROLLER_MOCKING.md](docs/CONTROLLER_MOCKING.md) — Controller mocking.
- [tests/docs/MODULE_MOCKING.md](docs/MODULE_MOCKING.md) — Module mocking.
- [tests/framework/index.ts](framework/index.ts) — Assertions, Gestures, Matchers, Utilities, PlaywrightAdapter.
- [tests/framework/fixtures/FixtureHelper.ts](framework/fixtures/FixtureHelper.ts), [FixtureBuilder.ts](framework/fixtures/FixtureBuilder.ts) — Fixtures.
- [AGENTS.md](../AGENTS.md) — Root index; commands, architecture.
- [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md) — Coding standards.

Unit tests under `tests/` (e.g. framework tests): [docs/testing/unit-testing.md](../docs/testing/unit-testing.md).

## Before working

- **tests/** — Use `withFixtures` + `FixtureBuilder`; Page Object methods only; no `TestHelpers.delay()`; selectors in `tests/selectors/` or page folder; import from `tests/framework/index.ts`. Commands: [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md).
- **tests/** — Framework/mocking: read tests/docs/README and MOCKING; keep exports in `tests/framework/index.ts`. Regression/smoke: same as e2e (withFixtures, Page Objects, no delay). Yarn only.
- **component view tests** — No fake timers (`jest.useFakeTimers` / `advanceTimersByTime`); use `waitFor` or real delays. See [docs/testing/component-view-tests.md](../docs/testing/component-view-tests.md).
- **wdio/** — Do not extend. New work: Detox + tests/smoke|regression or Appwright (`tests/`). If maintaining: legacy section in [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md).
