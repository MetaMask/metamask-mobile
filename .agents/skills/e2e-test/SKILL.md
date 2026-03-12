---
name: e2e-test
description:
  Add and fix Detox E2E tests (smoke and regression) for MetaMask Mobile using
  withFixtures, Page Objects, and tests/framework. Use when creating a new spec,
  fixing a failing E2E test, or adding page objects and selectors.
---

# E2E Test Builder — Skill

> **One source of truth** for adding Detox E2E tests to MetaMask Mobile.
> Applies to: Claude Code (`.claude/commands/e2e-test.md`), Cursor, Copilot, Windsurf, and other AI agents.

**Before writing or changing any E2E code:** read this skill once, then open the reference(s) indicated by the decision tree for your task.

## What This Skill Does

Guides you through adding a new E2E regression or smoke test end-to-end:

1. Plans the test (type, location, infrastructure needed)
2. Creates or reuses Page Objects and selectors
3. Writes the spec using the mandatory framework patterns and the **correct tag** (see Golden rule 8; check `tests/tags.js` and existing specs in the feature folder)
4. Runs lint and type checks
5. Executes the test locally via Detox
6. Iterates until the test passes

Your job is to figure out whether the user needs to **write a new spec**, **fix a failing test**, or **add page objects/selectors**, then follow the corresponding path and open the relevant reference when that path indicates.

**Decision tree — which reference to use:**

```
Task → What do you need?
├─ Write new spec or add test steps
│  → Open references/writing-tests.md (spec structure, templates, FixtureBuilder patterns)
│  → If you need POM/selectors: also open references/page-objects.md
│  → If you need API or feature-flag mocks: also open references/mocking.md
│  → After writing: run lint/tsc, then open references/running-tests.md to run and debug
│
├─ Create or update Page Objects / selectors
│  → Open references/page-objects.md (POM structure, Matchers, Gestures, Assertions, selector conventions)
│  → When writing the spec: open references/writing-tests.md
│
├─ Mock API or feature flags
│  → Open references/mocking.md (testSpecificMock, setupRemoteFeatureFlagsMock, setupMockRequest)
│  → When writing the spec: open references/writing-tests.md
│
└─ Run tests, debug failures, or self-review
   → Open references/running-tests.md (build check, detox commands, common failures, retry patterns)
```

Do not read the full reference files until the decision tree or workflow sends you there.

---

## 10 Golden Rules

1. **Always use `withFixtures`** — every spec must be wrapped; no exceptions
2. **Always use Page Object Model** — no `element(by.id())` in spec files
3. **Always import from `tests/framework/index.ts`** — never from individual files
4. **Always add `description`** to every `Gestures.*` and `Assertions.*` call
5. **Never use `TestHelpers.delay()`** — use `Assertions.*` which has auto-retry
6. **Use `FixtureBuilder` for state** — do not set state through UI interactions
7. **Selectors live in `*.testIds.ts`** (co-located) or `tests/selectors/` (legacy)
8. **Tag correctly** — Use the tag that matches your feature and test type. Options include `SmokeE2E`, `SmokeTrade`, `SmokePredictions`, `SmokePerps`, `SmokeConfirmations`, `RegressionTrade`, `RegressionWallet`, etc. Check **`tests/tags.js`** for the full list and descriptions, and **existing specs in the same feature folder** to see which tag they use.
9. **Descriptive test names** — no 'should' prefix (e.g., `'opens market details'`)
10. **Fix lint/tsc before running** — never run with known errors

---

## Workflow Overview

```
Step 0 → Understand requirement + choose type (smoke/regression)
Step 1 → Discover / create Page Objects and selectors
Step 2 → Write the spec (withFixtures + POM + correct tag)
Step 3 → Lint + TSC (fix all errors)
Step 4 → Run detox test locally
Step 5 → Iterate (fix → lint → run) until green
```

---

## Reference files (when to use)

Documentation is split by **action**. Open only the reference that matches what you are doing.

| Action                                        | File                                                       | When to open it                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Writing or updating a spec**                | [references/writing-tests.md](references/writing-tests.md) | New spec file, spec structure, FixtureBuilder patterns, smoke/regression templates.               |
| **Page Objects and selectors**                | [references/page-objects.md](references/page-objects.md)   | Create or update POM classes, selector/testId conventions, Matchers/Gestures/Assertions API.      |
| **API and feature flag mocking**              | [references/mocking.md](references/mocking.md)             | testSpecificMock, setupRemoteFeatureFlagsMock, setupMockRequest, shared mock files.               |
| **Running tests, debugging, fixing failures** | [references/running-tests.md](references/running-tests.md) | Build check, detox run commands, lint/tsc, common failures table, retry patterns, iteration loop. |
