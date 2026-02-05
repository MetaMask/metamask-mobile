# BUGBOT Rules

## Core Mission

Automated test quality enforcement and bug detection for MetaMask Mobile React Native codebase

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

- **ALWAYS** load and reference [component-view-testing](rules/component-view-testing.mdc)
- Verify test file naming pattern: `**/*.view.test.{ts,tsx,js,jsx}`
- Check for proper use of presets and renderers from `app/util/test/component-view/`

Use the rules in the [component-view-testing](rules/component-view-testing.mdc) to enforce the test quality and bug detection.
