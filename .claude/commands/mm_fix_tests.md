# Fix Failing Tests After PR Changes

This guide helps fix test failures detected by the preflight check after making code changes in a PR.

## Prerequisites

First, identify which tests are failing:
```bash
# Run preflight check to find failing tests
yarn coverage:preflight

# Or check specific files
yarn coverage:preflight --files app/path/to/changed/file.tsx
```

## Reading the Preflight Report

The preflight check generates a JSON report with categorized failures:
```bash
# Read the failure report (branch name is auto-detected)
cat scripts/reports/preflight-failures-$(git branch --show-current | sed 's/[\/\\:*?"<>|]/-/g').json
```

## Common Test Failure Categories & Fixes

### 1. Mock Errors
**Symptom**: `expect(mockFunction).toHaveBeenCalled()` fails with "Number of calls: 0"

**Common Causes & Fixes:**

```typescript
// BEFORE (your code change modified the function signature)
someFunction(oldParam: string): void

// AFTER (new signature)
someFunction(newParam: string, options?: Options): void

// FIX THE TEST MOCK:
// Find the mock in the test file
const mockSomeFunction = jest.fn();

// Update mock implementation to match new signature
mockSomeFunction.mockImplementation((newParam, options) => {
  // Return value matching new behavior
});
```

### 2. Import/Module Errors  
**Symptom**: `Cannot find module 'path/to/module'`

**Common Fixes:**

```typescript
// If you moved/renamed a file, update test imports:

// OLD TEST
import { Component } from '../old/path/Component';

// FIX
import { Component } from '../new/path/Component';

// If module needs mocking, add to test file:
jest.mock('../path/to/module', () => ({
  exportedFunction: jest.fn(),
  ExportedClass: jest.fn().mockImplementation(() => ({}))
}));
```

### 3. Type Errors
**Symptom**: `TypeError: Cannot read property 'x' of undefined`

**Common Fixes:**

```typescript
// If you changed prop types or state shape:

// OLD COMPONENT PROPS
interface Props {
  value: string;
}

// NEW COMPONENT PROPS  
interface Props {
  value: string;
  onChange?: (val: string) => void;  // Added new prop
}

// FIX THE TEST:
// Update test renders to include new props
const { getByText } = render(
  <Component 
    value="test"
    onChange={jest.fn()}  // Add the new prop
  />
);

// Or update mock data structure
const mockData = {
  value: 'test',
  newField: 'default'  // Add new required fields
};
```

### 4. Redux Selector Changes
**Symptom**: Selectors returning undefined or wrong values

**Common Fixes:**

```typescript
// If you changed Redux state structure:

// Find the mock selector in test
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: mockUseSelector
}));

// Update mock return values to match new state shape
mockUseSelector.mockImplementation((selector) => {
  // Match selector by reference or name
  if (selector === selectNewStructure) {
    return { 
      newField: 'value',  // Match new state structure
      updatedField: true
    };
  }
  return null;
});
```

## Step-by-Step Fix Process

### 1. Start with Priority Fixes
The preflight report shows priority fixes - issues affecting multiple tests:
```json
{
  "priorityFixes": [{
    "category": "mock_error",
    "affectedCount": 5,
    "message": "Fix mock error issues first - affecting 5 test files"
  }]
}
```
Fix these first as they likely have a common root cause.

### 2. Run Individual Test to Debug
```bash
# Run single test file for faster iteration
npx jest path/to/failing.test.tsx

# Run with verbose output to see exact errors
npx jest path/to/failing.test.tsx --verbose

# Run specific test case
npx jest path/to/failing.test.tsx --testNamePattern="should handle click"
```

### 3. Common Quick Fixes

#### Update Mock Return Values
```typescript
// Quick fix for changed return types
mockFunction.mockReturnValue(newExpectedValue);
mockAsyncFunction.mockResolvedValue(newAsyncValue);
```

#### Reset Mocks Properly
```typescript
beforeEach(() => {
  jest.clearAllMocks();  // Clear call history
  // Re-establish mock implementations
  mockFunction.mockImplementation(() => defaultReturn);
});
```

#### Handle New Optional Parameters
```typescript
// If function now has optional params, update test calls
// OLD: functionCall(param1);
// NEW: functionCall(param1, undefined); // or with default
```

### 4. Validate Each Fix
After fixing each test file:
```bash
# Verify single test passes
npx jest path/to/fixed.test.tsx

# Re-run preflight to see progress
yarn coverage:preflight
```

## Advanced Debugging

### When Tests Pass Individually but Fail Together

**Issue**: Mock contamination between tests

**Fix**:
```typescript
// In each test file, ensure proper cleanup
afterEach(() => {
  jest.restoreAllMocks();  // Restore original implementations
});

// Or use mockImplementationOnce for single-use mocks
mockFunction.mockImplementationOnce(() => specificValue);
```

### Finding What Changed

Compare your changes to understand what broke:
```bash
# See all changes in the file
git diff main -- path/to/changed/file.tsx

# See what imports/exports changed
git diff main -- path/to/changed/file.tsx | grep -E "^[+-](import|export)"

# See function signature changes
git diff main -- path/to/changed/file.tsx | grep -E "^[+-].*function|^[+-].*\("
```

## Success Criteria

✅ All tests pass in preflight check:
```bash
yarn coverage:preflight  # Should show "✅ All impacted tests passed!"
```

✅ Then proceed to coverage improvements:
```bash
yarn coverage:analyze  # Now safe to add new tests for coverage
```

## Tips for Efficiency

1. **Fix by category**: All import errors, then all mock errors, etc.
2. **Use find & replace**: If you renamed something consistently
3. **Check other test files**: Similar components often have similar test patterns
4. **Don't over-mock**: Only mock what's necessary for the test
5. **Keep tests simple**: Complex mocks often break with refactoring

## Common Patterns to Copy

Look for working test examples in the codebase:
- Component tests: `app/components/UI/*/*.test.tsx`
- Hook tests: `app/components/hooks/*/*.test.ts`  
- Utility tests: `app/util/*/*.test.ts`
- Redux tests: `app/store/*/*.test.ts`

Arguments: $ARGUMENTS
