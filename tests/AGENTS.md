# tests/ — AGENTS.md

Single agent index for **e2e/**, **tests/**, and **wdio/**. Pointers only; details live in the canonical sources below.

## Scope

- **e2e/** — `e2e/specs/`, `e2e/pages/`, `e2e/selectors/`, config. Specs, Page Objects, selectors. Consumes `tests/framework/` and fixtures.
- **tests/** — `tests/framework/`, `tests/api-mocking/`, `tests/docs/`, `tests/regression/`, `tests/smoke/`, etc. Framework, fixtures, mocking, regression/smoke specs.
- **wdio/** — `wdio/helpers/`, `wdio/screen-objects/`, `wdio/utils/`. Legacy WebdriverIO/Appium — **deprecated**. Use Detox + e2e/tests or Appwright for performance.
- **component view tests** — `app/**/*.view.test.tsx`. Jest component view tests.

### Component-View Tests (Mandatory)

- [.cursor/rules/component-view-testing.mdc](../.cursor/rules/component-view-testing.mdc) — Mock policy, presets/renderers, navigation, test structure.
- [app/util/test/component-view/README.md](../app/util/test/component-view/README.md) — Framework layout, usage, presets, renderers, platform matrix.
- [app/util/test/component-view/COMPONENT_VIEW_TEST_RULES.md](../app/util/test/component-view/COMPONENT_VIEW_TEST_RULES.md) — Detailed rules, allowed mocks, how to write component-view tests.

### Implementation Reference (Component-View)

- Mocks: [util/test/component-view/mocks.ts](../app/util/test/component-view/mocks.ts)
- Presets: [util/test/component-view/presets/](../app/util/test/component-view/presets/)
- Renderers: [util/test/component-view/renderers/](../app/util/test/component-view/renderers/)
- State fixture: [util/test/component-view/stateFixture.ts](../app/util/test/component-view/stateFixture.ts)

## Canonical Sources (read these, do not duplicate)

- [.cursor/rules/e2e-testing-guidelines.mdc](../.cursor/rules/e2e-testing-guidelines.mdc) — Patterns, Page Objects, assertions, gestures, prohibited patterns.
- [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md) — Setup, run commands, build types, Metro, Detox, Flask; legacy Appium; Appwright.
- [tests/docs/README.md](docs/README.md) — Framework structure, withFixtures, FixtureBuilder, anti-patterns, checklist.
- [tests/docs/MOCKING.md](docs/MOCKING.md) — API mocking, default and test-specific mocks.
- [tests/docs/CONTROLLER_MOCKING.md](docs/CONTROLLER_MOCKING.md) — Controller mocking.
- [tests/docs/MODULE_MOCKING.md](docs/MODULE_MOCKING.md) — Module mocking.
- [tests/framework/index.ts](framework/index.ts) — Assertions, Gestures, Matchers, Utilities, PlaywrightAdapter.
- [tests/framework/fixtures/FixtureHelper.ts](framework/fixtures/FixtureHelper.ts), [FixtureBuilder.ts](framework/fixtures/FixtureBuilder.ts) — Fixtures.
- [AGENTS.md](../AGENTS.md) — Root index; commands, architecture.
- [.github/guidelines/CODING_GUIDELINES.md](../.github/guidelines/CODING_GUIDELINES.md) — Coding standards.

Unit tests under `tests/` (e.g. framework tests): [.cursor/rules/unit-testing-guidelines.mdc](../.cursor/rules/unit-testing-guidelines.mdc).

## Before working

- **e2e/** — Use `withFixtures` + `FixtureBuilder`; Page Object methods only; no `TestHelpers.delay()`; selectors in `e2e/selectors/` or page folder; import from `tests/framework/index.ts`. Commands: [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md).
- **tests/** — Framework/mocking: read tests/docs/README and MOCKING; keep exports in `tests/framework/index.ts`. Regression/smoke: same as e2e (withFixtures, Page Objects, no delay). Yarn only.
- **wdio/** — Do not extend. New work: Detox + e2e/tests or Appwright (`appwright/tests/`). If maintaining: legacy section in [docs/readme/e2e-testing.md](../docs/readme/e2e-testing.md).

---

**Note:** All tests are being migrated into the **tests/** folder. Prefer adding or moving test code under `tests/` (framework, specs, mocking, resources) where possible; `e2e/` and `wdio/` remain for existing layout until migration completes.
