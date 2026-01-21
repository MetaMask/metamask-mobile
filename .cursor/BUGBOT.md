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
- Verify test file naming pattern: `tests/**/*.spec.{js,ts}`
- Check for proper imports and framework utilities from `tests/framework/index.ts`

Use the rules in the [e2e-testing-guidelines](rules/e2e-testing-guidelines.mdc) to enforce the test quality and bug detection.
