---
name: component-view-test
description:
  Write, fix, and update component view tests (*.view.test.tsx) for MetaMask
  Mobile using the tests/component-view/ framework. Use when creating a new view test
  file, fixing a failing view test, updating tests after a component change, or creating
  a new renderer or preset for a view.
---

# Component View Test Agent

**Goal**: Create, update, and fix component view tests (`*.view.test.tsx`) in the MetaMask Mobile codebase using the `tests/component-view/` framework.

Use this skill whenever you need to:

- Write a new component view test file
- Update tests after a component or preset has changed
- Diagnose and fix a failing component view test

Your job is to figure out whether the user needs to **write a new test**, **fix a failing test**, or **update tests after a component/preset change**, then follow the corresponding path and open the relevant reference when that path indicates.

**Decision tree — which reference to use:**

```
Task → What do you need?
├─ Write new test or update after change
│  → Read component + existing tests
│  → Open references/writing-tests.md (use cases, coverage, renderer/preset, file structure)
│  → If test needs navigation: also open references/navigation-mocking.md
│  → After writing: run tests, then open references/reference.md for self-review
│
├─ Fix failing test
│  → Run: yarn jest -c jest.config.view.js <path> --runInBand --silent --coverage=false
│  → Identify error type → Open references/reference.md (Diagnosing Failures)
│
└─ Run tests or self-review after tests pass
   → Open references/reference.md (Run the Tests, Self-Review Checklist)
```

Do not read the full reference files until the decision tree or workflow sends you there.

---

## What Are Component View Tests?

Component view tests are **integration-level** tests that test views through real Redux state — no mocked hooks or selectors. They live alongside the component as `ComponentName.view.test.tsx` and use a dedicated framework in `tests/component-view/`.

Key constraint: **only Engine and allowed native modules may be mocked** (enforced at runtime by `app/util/test/testSetupView.js` and by ESLint override in `.eslintrc.js` for `**/*.view.test.*`).

---

## The Framework at a Glance

```
tests/component-view/
├── mocks.ts              ← Engine + native mocks (import this first, always)
├── render.tsx            ← renderComponentViewScreen, renderScreenWithRoutes
├── stateFixture.ts       ← StateFixtureBuilder (createStateFixture)
├── presets/              ← initialState<Feature>() builders — one file per feature area
└── renderers/            ← render<Feature>View() functions — one file per feature area
```

---

## Workflow (summary)

- **Write new test**: Read component and existing tests → list use cases and map to test patterns → check coverage and deduplicate → use or create renderer/preset → write test (use `renderScreenWithRoutes` if asserting navigation). Every test must have at least one of: `fireEvent`, `waitFor`/`findBy`, `store.dispatch`/`act`, or Engine spy (no render-only scenarios). Run tests, then run the self-review checklist in `references/reference.md`.
- **Fix failing test**: Run with `jest.config.view.js` → identify error type from the table in `references/reference.md` (Diagnosing Failures) → apply the fix (remove disallowed mock, add state override, add preset, wrap in `waitFor`, add `deterministicFiat`, etc.) → re-run.
- **Update after change**: Same as write — review existing tests, extend preset/renderer if needed, update tests, run and self-review.

For full detail (use cases, coverage, presets, route probes, self-review checklist, failure table), use the reference files when the decision tree sends you there.

---

## Run the tests

Always use `jest.config.view.js` — the default Jest config does not apply component view test rules.

**Run tests (no coverage):**

```bash
yarn jest -c jest.config.view.js <path> --runInBand --silent --coverage=false
```

Example: `yarn jest -c jest.config.view.js app/components/UI/Bridge/Views/BridgeView/BridgeView.view.test.tsx --runInBand --silent --coverage=false`

**Coverage for a feature folder** (use this instead of `--coverage` to avoid OOM):

```bash
yarn test:view:coverage:folder app/components/UI/MyFeature
```

For run-by-name, watch mode, or other options, see `references/reference.md` (Run the Tests).

---

## Golden Rules (Enforced)

1. **Only mock Engine and allowed native modules** — no arbitrary `jest.mock()` in `*.view.test.*` files. Allowed:
   - `../../app/core/Engine`
   - `../../app/core/Engine/Engine`
   - `react-native-device-info`
   - (these are already handled by `tests/component-view/mocks.ts`)

2. **Drive all behavior through Redux state** — no mocking of hooks or selectors. Provide data via state overrides.

3. **Reuse presets and renderers** — never rebuild the full state manually from scratch.

4. **No fake timers** — never use `jest.useFakeTimers()`, `jest.advanceTimersByTime()`, or `jest.useRealTimers()`.

5. **Test behavior, not snapshots** — use `toBeOnTheScreen()`, `not.toBeOnTheScreen()`, interaction assertions.

6. **Follow AAA** — Arrange → Act → Assert, blank lines between each section. One test = one user journey or business outcome; multiple chained actions in a single test are fine.

7. **No render scenarios** — every test must have at least one of: `fireEvent`, `waitFor`/`findBy`, `store.dispatch`/`act`, or an Engine spy. Static visibility checks are not tests. See [`references/writing-tests.md`](references/writing-tests.md) for examples.

8. **Use selector ID constants, never raw strings** — every `getByTestId` / `findByTestId` / `queryByTestId` must reference a constant from `ComponentName.testIds.ts`. Create the file if it does not exist.

9. **Every view with async data needs one data-completeness test** — wait for the load and validate all significant fields of all items in the base mock using `within()` per row. One per independent async data flow.

10. **Filter / segmentation tests must assert both sides** — after selecting a filter, assert both what appears (positive `findByTestId`) and what disappears (negative `queryByTestId(...).not.toBeOnTheScreen()`).

---

## Reference files (when to use)

Documentation is split by **action**. Open only the reference that matches what you are doing.

| Action                                          | File                                                                   | When to open it                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Writing or updating view tests**              | [`references/writing-tests.md`](references/writing-tests.md)           | New test file, new or updated preset/renderer. Read before writing, use cases and coverage, file structure, renderers, presets, route params.  |
| **Testing navigation**                          | [`references/navigation-mocking.md`](references/navigation-mocking.md) | Route probes, single nav push, multi-screen renderer, cross-screen journey, external/API mocking.                                              |
| **Running tests, self-review, fixing failures** | [`references/reference.md`](references/reference.md)                   | Run the Tests, Self-Review Checklist, Diagnosing Failures, assertion patterns, Deterministic Fiat Assertions, What NOT to Do, Quick Reference. |

**Where self-review and What NOT to Do live:** Both are in `references/reference.md`. Self-review is the checklist you run after tests pass. What NOT to Do is the antipatterns section in the same file. Keeping them there means when you run tests or fix failures you have run commands, the checklist, the failure table, and the antipatterns in one place — open that reference for any run/fix/review task.
