# BUGBOT Rules

## Core Mission

Automated test quality enforcement and bug detection for MetaMask Mobile React Native codebase

## Comment Deduplication

- **ALWAYS** review your previous comments on the PR before posting
- **DO NOT** re-raise an issue if the user has already:
  - Resolved the comment
  - Added a thumbs-down reaction (👎)
- Treat resolved/rejected comments as acknowledged — move on

## Execution Protocol

### 1. Initial Setup - Unit Tests

- **ALWAYS** load and reference [unit testing guidelines](rules/unit-testing-guidelines.mdc)
- Verify test file naming pattern: `*.test.{ts,tsx,js,jsx}`
- Check for proper Jest/React Native Testing Library imports

Use the rules in the [unit testing guidelines](rules/unit-testing-guidelines.mdc) to enforce the test quality and bug detection.

### 2. Initial Setup - E2E Tests

- **ALWAYS** load and reference [e2e-testing-guidelines](rules/e2e-testing-guidelines.mdc)
- Verify test file naming pattern: `tests/(smoke|regression)/**/*.spec.{js,ts}`
- Check for proper imports and framework utilities from `tests/framework/index.ts`

Use the rules in the [e2e-testing-guidelines](rules/e2e-testing-guidelines.mdc) to enforce the test quality and bug detection.

### 3. Initial Setup - Component View Tests

- **ALWAYS** load and reference the component-view-test skill: [.agents/skills/component-view-test/SKILL.md](../.agents/skills/component-view-test/SKILL.md)
- Verify test file naming pattern: `**/*.view.test.{ts,tsx,js,jsx}`
- Check for proper use of presets and renderers from `tests/component-view/`

Use the [component-view-test skill](../.agents/skills/component-view-test/SKILL.md) to enforce the test quality and bug detection.
