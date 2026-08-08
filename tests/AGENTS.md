# tests/ — AGENTS.md

Single agent index for **tests/**. Pointers only; details live in the canonical sources below.

## Scope

- **tests/smoke-appium** — Appium smoke specs (Playwright). Primary E2E path for new coverage.
- **tests/page-objects**, **tests/selectors** — Shared Page Objects and selectors used by Appium smoke.
- **tests/** — `tests/framework/`, `tests/api-mocking/`, `tests/docs/`, `tests/smoke-appium/`, etc. Framework, fixtures, mocking, smoke specs.
- **tests/smoke** — Legacy Detox smoke (do not add new coverage here; treat as gone for new work).
- **wdio/** — Removed / deprecated legacy WebdriverIO. Do not extend.
- **component view tests** — `app/**/*.view.test.tsx`. Jest component view tests.
- **integration tests** — `app/**/*.integration.test.ts?(x)`. Jest controller-app integration tests that use `tests/integration/` harnesses and `jest.config.integration.js`.

### Component-View Tests (Mandatory)

- [tests/component-view/AGENTS.md](component-view/AGENTS.md) — Agent index for component view tests: framework, canonical skill, run commands, enforcement.

### Integration Tests (Optional — PoC)

- [tests/integration/AGENTS.md](integration/AGENTS.md) — Agent index for integration tests: harnesses, layer boundaries, canonical skill, run commands, enforcement.

### E2E Tests (Appium smoke)

- [docs/testing/e2e-testing.md](../docs/testing/e2e-testing.md) — Canonical guide: patterns, Page Objects, assertions, gestures, prohibited patterns.
- [docs/testing/appium-smoke-testing.md](../docs/testing/appium-smoke-testing.md) — Appium smoke: main-e2e builds, `yarn appium-smoke:*`, local setup, CI.

## Canonical Sources (read these, do not duplicate)

- [docs/testing/e2e-testing.md](../docs/testing/e2e-testing.md) — Patterns, Page Objects, assertions, gestures, prohibited patterns.
- [docs/testing/appium-smoke-testing.md](../docs/testing/appium-smoke-testing.md) — Appium smoke tests: builds, run commands, local/CI setup.
- [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md) — Setup, run commands, build types, Metro; Appium smoke quick start.
- [.github/guidelines/E2E_DECISION_TREE.md](../.github/guidelines/E2E_DECISION_TREE.md) — CI decision flow: when E2E runs, which labels gate it, AI test selection logic.
- [tests/docs/README.md](docs/README.md) — Framework structure, withFixtures, FixtureBuilder, anti-patterns, checklist.
- [tests/docs/UNIFIED_E2E_ARCHITECTURE.md](docs/UNIFIED_E2E_ARCHITECTURE.md) — Appium layered architecture.
- [tests/docs/UNIFIED_GESTURES_MIGRATION.md](docs/UNIFIED_GESTURES_MIGRATION.md) — Migrate off UnifiedGestures → Gestures.
- [tests/docs/PLAYWRIGHT_LOCAL_EMULATOR.md](docs/PLAYWRIGHT_LOCAL_EMULATOR.md) — Local `buildPath` vs pre-installed app, `fullReset` / `noReset` for `EmulatorConfigBuilder`.
- [tests/docs/MOCKING.md](docs/MOCKING.md) — API mocking, default and test-specific mocks.
- [tests/docs/analytics-e2e.md](docs/analytics-e2e.md) — MetaMetrics E2E: `analyticsExpectations` on `withFixtures`, presets, `runAnalyticsExpectations`.
- [tests/docs/CONTROLLER_MOCKING.md](docs/CONTROLLER_MOCKING.md) — Controller mocking.
- [tests/docs/MODULE_MOCKING.md](docs/MODULE_MOCKING.md) — Module mocking.
- [tests/integration/AGENTS.md](integration/AGENTS.md) — Integration test harnesses and rules.
- [tests/framework/index.ts](framework/index.ts) — Assertions, Gestures, Matchers, Utilities, PlaywrightAdapter.
- [tests/framework/fixtures/FixtureHelper.ts](framework/fixtures/FixtureHelper.ts), [FixtureBuilder.ts](framework/fixtures/FixtureBuilder.ts) — Fixtures.
- [AGENTS.md](../AGENTS.md) — Root index; commands, architecture.
- [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md) — Coding standards.

Unit tests under `tests/` (e.g. framework tests): [docs/testing/unit-testing.md](../docs/testing/unit-testing.md).

## Before working

- **E2E (new work)** — Appium smoke only (`tests/smoke-appium/`). Use `withFixtures` + `FixtureBuilder`; Page Object methods only; wait with Assertions (not fixed delays); selectors in `tests/selectors/` or page folder; import `Gestures` / `Assertions` / `Matchers` from `tests/framework/index.ts`. **Do not** import `UnifiedGestures`. Runbook: [docs/testing/appium-smoke-testing.md](../docs/testing/appium-smoke-testing.md).
- **tests/framework** — Framework/mocking: read tests/docs/README and MOCKING; keep exports in `tests/framework/index.ts`. Yarn only.
- **component view tests** — No fake timers (`jest.useFakeTimers` / `advanceTimersByTime`); use `waitFor` or real delays. See [docs/testing/component-view-tests.md](../docs/testing/component-view-tests.md).
- **integration tests** — Use `tests/integration/harnesses/<domain>.ts`; no test-local `jest.mock(...)`; run with `yarn jest -c jest.config.integration.js`. See [tests/integration/AGENTS.md](integration/AGENTS.md).
- **wdio/** / **tests/smoke (Detox)** — Do not extend. New coverage goes to Appium smoke.
