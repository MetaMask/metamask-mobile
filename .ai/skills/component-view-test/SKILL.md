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
- Fix a failing component view test
- Diagnose why a component view test is failing
- Create a new renderer or preset for a new view

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

## Workflow Overview

```mermaid
flowchart TD
    START([Task]) --> WHAT{What do you need?}

    WHAT -->|Write new test| READ0[Step 0: Read component + existing tests]
    WHAT -->|Fix failing test| FIX_RUN[Run with jest.config.view.js]
    WHAT -->|Update existing test| READ0

    READ0 --> USE_CASES[Step 0.5: List user actions on this screen]
    USE_CASES --> MAP_CATS[Map each action to test category]
    MAP_CATS --> DEDUP[Check existing view tests for duplication]
    DEDUP --> RUN_COV[Run coverage report]
    RUN_COV --> CANDIDATE[Build candidate list ordered by coverage impact]
    CANDIDATE --> NO_CANDIDATES{Any valid candidates?}
    NO_CANDIDATES -->|No| DONE([Done — no tests needed])
    NO_CANDIDATES -->|Yes| NEW_RENDERER

    NEW_RENDERER{Renderer exists for this view?}
    NEW_RENDERER -->|Yes| NEW_PRESET{Preset covers needed state?}
    NEW_RENDERER -->|No| CREATE_RENDERER[Create renderer in tests/component-view/renderers/]
    CREATE_RENDERER --> CREATE_PRESET[Create preset in tests/component-view/presets/]
    CREATE_PRESET --> NEW_PRESET

    NEW_PRESET -->|Yes| LOCAL_HELPER[Extract local helper wrapping the renderer]
    NEW_PRESET -->|No| EXTEND_PRESET[Extend preset with .withOverrides / new builder calls]
    EXTEND_PRESET --> LOCAL_HELPER

    LOCAL_HELPER --> WRITE_TEST[Write the test]

    WRITE_TEST --> NAV_TEST{Test needs to assert navigation?}
    NAV_TEST -->|Yes| USE_ROUTES[renderScreenWithRoutes + route probe component]
    NAV_TEST -->|No| USE_RENDERER[renderComponentViewScreen via feature renderer]

    USE_ROUTES --> FIAT{Asserting exact currency values?}
    USE_RENDERER --> FIAT
    FIAT -->|Yes| DET_FIAT[deterministicFiat: true]
    FIAT -->|No| QUALITY_CHECK

    DET_FIAT --> QUALITY_CHECK

    QUALITY_CHECK{Test has fireEvent / waitFor / store.dispatch / Engine spy?}
    QUALITY_CHECK -->|No — render scenario| REWRITE[Rewrite: add user interaction or system reaction]
    REWRITE --> QUALITY_CHECK
    QUALITY_CHECK -->|Yes| RUN_NEW[Run: yarn jest -c jest.config.view.js]

    RUN_NEW --> PASS{Tests pass?}
    PASS -->|Yes| SELF_REVIEW[Self-review: check all rules]
    PASS -->|No| FIX_RUN

    SELF_REVIEW --> SR1{Any render scenario?\nno fireEvent / waitFor / dispatch / spy?}
    SR1 -->|Yes| REWRITE2[Rewrite the offending test]
    REWRITE2 --> RUN_NEW
    SR1 -->|No| SR2

    SR2{Async view has a data-completeness test?\nall fields of all base-mock items validated with within?}
    SR2 -->|Missing| ADD_COMPLETENESS[Add data-completeness test]
    ADD_COMPLETENESS --> RUN_NEW
    SR2 -->|Yes| SR3

    SR3{Filter / segmentation test has paired assertions?\nboth positive findBy AND negative queryBy.not?}
    SR3 -->|Missing negatives| ADD_NEGATIVES[Add negative queryByTestId assertions]
    ADD_NEGATIVES --> RUN_NEW
    SR3 -->|Yes| SR4

    SR4{Any raw string in getByTestId / findByTestId / queryByTestId\nnot from a testIds file?}
    SR4 -->|Yes| ADD_TESTIDS[Create / update ComponentName.testIds.ts\nreplace raw strings with constants]
    ADD_TESTIDS --> RUN_NEW
    SR4 -->|No| SR5

    SR5{Any arbitrary jest.mock not for Engine\nor allowed native modules?}
    SR5 -->|Yes| FLAG_MOCK[Add eslint-disable comment + link to tracking issue]
    FLAG_MOCK --> DONE
    SR5 -->|No| DONE

    FIX_RUN --> READ_ERROR{Error type?}

    READ_ERROR -->|jest.mock not allowed| REMOVE_MOCK[Remove jest.mock\nDrive via state override instead]
    READ_ERROR -->|Unable to find testID| CHECK_STATE[Add state override or check render condition\nUse debug to inspect tree]
    READ_ERROR -->|Cannot read property X| ADD_PRESET[Add .withMinimalXController or override in preset]
    READ_ERROR -->|act warning| WRAP_ACT[Wrap in waitFor / act]
    READ_ERROR -->|Flakey number assertion| ADD_DET[Add deterministicFiat: true]
    READ_ERROR -->|Passes locally fails CI| USE_WAITFOR[Replace inline assertion with waitFor]

    REMOVE_MOCK --> RUN_FIX[Re-run]
    CHECK_STATE --> RUN_FIX
    ADD_PRESET --> RUN_FIX
    WRAP_ACT --> RUN_FIX
    ADD_DET --> RUN_FIX
    USE_WAITFOR --> RUN_FIX

    RUN_FIX --> PASS2{Tests pass?}
    PASS2 -->|Yes| SELF_REVIEW
    PASS2 -->|No| READ_ERROR
```

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

## Supporting Files

For detailed guidance, examples, and code templates, consult these files:

| File                                                                   | Content                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`references/writing-tests.md`](references/writing-tests.md)           | Step 0 (read before writing), Step 0.5 (enumerate use cases, deduplicate, coverage), Step 1 (test file structure, good examples, minimal template, import order), Step 2 (renderers, presets, React Query, route params) |
| [`references/navigation-mocking.md`](references/navigation-mocking.md) | Step 3 (route probes, single nav push, multi-screen renderer, cross-screen journey, userEvent) + Step 4 (external service / API mocking, MSW placeholder)                                                                |
| [`references/reference.md`](references/reference.md)                   | Step 5 (fiat), Step 6 (run commands), Step 6.5 (self-review checklist), Step 7 (failure diagnosis), Assertion Patterns, What NOT to Do, Quick Reference                                                                  |
