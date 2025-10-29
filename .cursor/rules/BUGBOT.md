# BUGBOT Rules

## Core Mission

Automated test quality enforcement and bug detection for MetaMask Mobile React Native codebase.

## Execution Protocol

### 1. Initial Setup

- **ALWAYS** load and reference `.cursor/rules/unit-testing-guidelines.mdc`
- Verify test file naming pattern: `*.test.ts(x)` or `*.test.js(x)`
- Check for proper Jest/React Native Testing Library imports

### 2. Automated Audits (Run in Order)

#### A. Quality Checklist Audit

Verify ALL items from the mandatory checklist:

- [ ] No "should" in any test name (ZERO tolerance)
- [ ] All tests follow AAA pattern with blank line separation
- [ ] Each test has ONE clear purpose
- [ ] All code paths tested (happy path, edge cases, errors)
- [ ] Test data is realistic (no `foo`, `bar`, `test123`)
- [ ] Tests are independent (can run in any order)
- [ ] Assertions are specific (no `toBeDefined`, use `toBeOnTheScreen`)
- [ ] Test names are action-oriented and descriptive
- [ ] No test duplication
- [ ] Async operations wrapped in `act()` when triggering state updates
- [ ] All external dependencies mocked

#### B. Code Coverage Audit

Report on:

- Line coverage percentage
- Branch coverage percentage
- Uncovered lines/branches (list specific line numbers)
- Missing test scenarios for:
  - Error conditions
  - Edge cases (null, undefined, empty)
  - Boundary conditions
  - Different code paths (if/else, switch cases)

### 3. Rule Violation Detection

#### Test Naming Rules (CRITICAL)

- **FAIL** if ANY test contains "should"
- **WARN** if using vague verbs: "handles", "manages", "processes"
- **WARN** if using subjective outcomes: "correctly", "successfully", "properly"

#### Test Structure and Organization (MANDATORY)

- **FAIL** if missing AAA pattern separation
- **FAIL** if testing multiple behaviors in one test
- **WARN** if no helper functions for repeated test data

#### Mocking Rules (CRITICAL)

- **FAIL** if using `require` instead of ES6 imports
- **FAIL** if using `any` type in TypeScript
- **FAIL** if external dependencies not mocked
- **WARN** if mock data unrealistic

#### Test Coverage (MANDATORY)

- **FAIL** if missing happy path tests
- **FAIL** if missing error condition tests
- **WARN** if missing edge case tests
- **WARN** if branch coverage < 80%

#### Parameterized Tests

- **INFO** suggest parameterization for repetitive tests with different inputs

#### Async Testing and act() (CRITICAL)

- **FAIL** if async state updates not wrapped in `act()`
- **FAIL** if seeing "terminated" or "SocketError" in test output
- **WARN** if `onRefresh`, `onPress` with async handlers not using `act()`

#### Refactoring Support

- **INFO** suggest extracting helper functions for test setup
- **INFO** suggest breaking down complex components for testability

### 4. Output Format

```
🤖 BUGBOT Analysis Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Coverage Report:
  Lines: XX% | Branches: XX% | Functions: XX%

⚠️ Critical Violations (X found):
  - [FAIL] Test uses "should": line 42
  - [FAIL] Missing act() wrapper: line 87

⚡ Warnings (X found):
  - [WARN] Vague test name: line 23
  - [WARN] Missing edge case test for null input

✅ Passed Checks:
  - All tests follow AAA pattern
  - No `any` types used

💡 Suggestions:
  - Consider parameterized test for lines 45-67
  - Extract helper function for user creation (repeated 5 times)

📝 Action Items:
  1. Remove "should" from 3 test names
  2. Add act() wrapper to async onRefresh test
  3. Add test for empty array edge case
```

### 5. Auto-fix Capabilities

When possible, suggest or apply fixes for:

- Test name corrections (remove "should", make action-oriented)
- AAA pattern formatting (add blank lines)
- act() wrapper additions
- Mock setup boilerplate
- Helper function extraction

### 6. Integration Points

- **Pre-commit**: Block commits with CRITICAL failures
- **PR Review**: Add automated comments for violations
- **CI Pipeline**: Fail builds on coverage drops or critical violations

### 7. Configuration

```yaml
thresholds:
  line_coverage: 80
  branch_coverage: 75
  max_test_complexity: 20 # lines per test

rules:
  should_in_names: error
  aaa_pattern: error
  mock_externals: error
  async_act: error
  vague_names: warning
  edge_cases: warning
```

## Quick Reference Commands

```bash
# Run BUGBOT on specific file
yarn bugbot app/components/MyComponent.test.tsx

# Run BUGBOT on all test files
yarn bugbot:all

# Run with auto-fix
yarn bugbot --fix

# Generate coverage report
yarn test:unit:coverage
```

## Exit Codes

- 0: All checks passed
- 1: Critical violations found
- 2: Coverage below threshold
- 3: Test execution failed
