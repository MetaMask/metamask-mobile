# Smart Test Implementation for PR Coverage

Generate unit tests to achieve 80% coverage on PR changes, following MetaMask's testing guidelines.

**⚠️ CRITICAL: Follow `.cursor/rules/unit-testing-guidelines.mdc` strictly. Do NOT waste time creating tests for:**
- Constants/config files (perpsConfig.ts, etc.) - they're just static data
- Simple re-export index files (index.ts with just `export { default }`)
- Type definition files (types.ts with just interfaces)
- Style files

**✅ FOCUS ONLY on files with actual business logic that need behavioral testing:**
- React components with user interactions, state changes, conditional rendering
- Custom hooks with side effects, API calls, state management
- Controllers/services with business logic, error handling, data processing
- Utility functions with complex logic, validation, transformations

## Your Task

Fix broken tests first, then create focused unit tests ONLY for files with meaningful logic to meet 80% coverage on new code changes.

**🔧 Copy This Pattern (Redux Mocking):**
- `app/components/hooks/useNetworkSelection/useNetworkSelection.test.ts:248-259` - Proven selector matching
- `app/components/UI/Perps/__mocks__/index.ts` - Import: `import { createMockEngineContext, TEST_CONSTANTS } from '../__mocks__'`

## 🚨 PHASE 1: Test Stability Check (NEW - DO THIS FIRST!)

### Step 0: Run Preflight Check
Before adding any new tests, ensure existing tests still pass after your PR changes:
```bash
# Check if existing tests for changed files still pass
yarn coverage:preflight

# Or run the full workflow (preflight + coverage if tests pass)
yarn coverage:full
```

**If tests fail**, the preflight will show:
- Which test files failed ❌
- Error categories (mock_error, import_error, type_error)
- Specific fix suggestions
- Priority fixes (issues affecting multiple tests)

**Common fixes needed after refactoring:**
- **Mock errors**: Update mock return values/implementations to match new signatures
- **Import errors**: Fix changed import paths or missing modules
- **Type errors**: Update TypeScript types in tests to match refactored code

**Only proceed to Phase 2 after all tests pass!**

## 📊 PHASE 2: Coverage Analysis

### Step 1: Run Coverage Analysis
Before creating tests, analyze current coverage:
```bash
yarn coverage:analyze
```

This will:
- Identify files needing tests and their current coverage
- Generate branch-specific JSON report with LLM-friendly recommendations
- Export LCOV file for detailed line-by-line coverage analysis
- Show both overall coverage and new code coverage metrics
- Provide specific uncovered line numbers and test suggestions

### Step 2: Read Branch-Specific Coverage Reports
Review the generated coverage analysis (both JSON and LCOV):
```bash
# Read your branch-specific JSON report
cat scripts/reports/coverage-report-$(git branch --show-current | sed 's/[\/\\:*?"<>|]/-/g').json

# LCOV file is also available for detailed line coverage analysis:
head scripts/reports/coverage-lcov-$(git branch --show-current | sed 's/[\/\\:*?"<>|]/-/g').info
```

Focus on the `actionableRecommendations` section which provides:
- **filesNeedingImprovement**: Files below 80% coverage with specific uncovered line numbers
- **priorityFiles**: Files needing new tests with targeted suggestions
- **suggestedTestCases**: File-type specific test recommendations

### Step 3: Create Tests Based on Recommendations
Use the coverage report guidance to create focused tests:

**For files in `filesNeedingImprovement`:**
- Target the specific `uncoveredNewLines` mentioned in the report
- Focus on the `newCodeCoverage` metric (this is your SonarCloud-style target)
- Follow the `suggestedTestCases` for each file

**For files in `priorityFiles`:**
- Create comprehensive test files from scratch
- Use the file-type specific suggestions provided
- Follow project naming conventions (`.test.ts` or `.test.tsx`)

### Step 4: One-File-at-a-Time Workflow

**🎯 EFFICIENT: Do ONE file completely before next:**

1. **Pick ONE file** from coverage report
2. **Create basic test** - copy pattern from similar file type above
3. **Run immediately** - `npx jest path/to/file.test.tsx --passWithNoTests`
4. **Fix one error at a time** (mocks, imports, etc.)
5. **Validate coverage** - `yarn coverage:files path/to/source/file.tsx`
6. **Next file only after current passes**

## Redux Selector Mocking (Common Struggle Fix)

**Pattern 1 - Exact matching** (when you know selector name):
```typescript
mockUseSelector.mockImplementation((selector) => {
  if (selector === selectSpecificThing) return mockValue;
  return undefined;
});
```

**Pattern 2 - Call order matching** (when selector unclear):
```typescript
let callCount = 0;
mockUseSelector.mockImplementation(() => {
  callCount++;
  if (callCount === 1) return 'first-selector-value';
  if (callCount === 2) return 'second-selector-value';
  return null;
});
```

### Step 5: Priority Testing Areas
**High-Impact Code Paths (focus here first):**
- Complex conditional logic and branching
- Error handling and error states
- React hooks and their side effects
- User interaction handlers (onPress, onChange)
- State management updates
- API calls and data transformations
- Form validation and input handling

**React Component Testing:**
- Rendering with different props/states
- User interactions (fireEvent.press, fireEvent.changeText)
- Conditional rendering based on props/state
- Error boundaries and error states
- Loading states and async behavior

**Hook Testing:**
- Return values for different inputs
- Side effects (API calls, state updates)
- Dependencies and cleanup
- Error scenarios and edge cases

### Step 6: Implementation Process
1. **Create/Update Test Files**: Follow AAA pattern and naming conventions
2. **Import Required Mocks**: Use existing mocks from `__mocks__` directories
3. **Write Focused Tests**: Target uncovered lines identified in coverage analysis
4. **Use Test Utilities**: Leverage React Native Testing Library helpers
5. **Handle Async Code**: Proper async/await testing for promises and effects

### Step 7: Validation & Quality Assurance
**Validate your test implementation:**

**Step 7a: Lint and type check**
```bash
# Fix lint issues in your new test files
npx eslint path/to/your/new/test/file.test.tsx --fix

# Run TypeScript check
yarn lint:tsc
```

**Step 7b: Test execution**
```bash
# Test both individually AND together (critical for mock isolation)
npx jest path/to/your/test/file.test.tsx --testNamePattern="specific test"  # Individual test
npx jest path/to/your/test/file.test.tsx --passWithNoTests                 # Full file

# Example for Perps files:
npx jest app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.test.tsx --passWithNoTests
```

**Step 7c: Coverage verification**
```bash
# Verify coverage improvement by running the analysis again
yarn coverage:analyze

# Compare the new vs previous newCodeCoverage percentage
# Target: 80%+ coverage on new code lines
```

### ⚠️ Test Isolation Issues & Mock Contamination

**Problem**: Tests pass individually but fail when run together due to mock state leaking between tests.

**Symptoms**:
- `expect(mockMethod).toHaveBeenCalled()` shows "Number of calls: 0"
- Methods return `undefined` instead of mocked values
- Individual tests pass: `npx jest file.test.ts --testNamePattern="single test"` ✅
- All tests fail: `npx jest file.test.ts` ❌

**Common Causes**:
- Constructor mocks not properly reset with `mockReset()`
- Multiple test files sharing mocked modules in parallel execution
- Jest's `clearAllMocks()` insufficient for constructor mock implementations

**Best Practices to Prevent**:
- Use `mockRestore()` then re-establish mock implementation in `beforeEach`
- Test both individually AND together before marking as complete
- For constructor mocks: Reset with `mockReset()` then re-establish `mockImplementation()`
- Ensure fresh mock instances are created after reset in each `beforeEach`

**Quality Checks:**
- All tests have meaningful names
- No brittle snapshots (avoid `toMatchSnapshot` for logic testing)
- Strong assertions with specific expectations
- Mock usage is justified and minimal
- Tests fail when code is broken (test the test)

### 🏆 Best Practice: Reuse Existing Mock Infrastructure

**Problem**: Need to test complex edge cases (e.g., feature flags disabled) without creating duplicate test infrastructure.

**❌ WRONG Way** (creates bloated tests):
```typescript
// DON'T do this - creates duplicate mocks and wrappers
const TestWrapper = ({ children }) => {
  const store = configureStore({ /* duplicate store setup */ });
  return <Provider store={store}>{children}</Provider>;
};
```

**✅ CORRECT Way** (leverage existing mocks):
```typescript
// Find existing mock in test file:
// jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
//   selectRewardsEnabledFlag: jest.fn().mockReturnValue(true),
// }));

// Then modify it in your test:
it('should handle rewards disabled', async () => {
  const { selectRewardsEnabledFlag } = jest.requireMock(
    '../../../../selectors/featureFlagController/rewards',
  );
  selectRewardsEnabledFlag.mockReturnValue(false); // Change behavior

  // Use existing createWrapper() and test infrastructure
  const { result } = renderHook(() => useYourHook(), { wrapper: createWrapper() });
  // ... your assertions
});
```

**Key Benefits:**
1. **Minimal code** - 3 lines instead of 50+ lines
2. **Leverages existing infrastructure** - no duplicate mocks/wrappers
3. **Maintainable** - changes to mock setup affect all tests consistently
4. **Targeted coverage** - hits specific uncovered lines (early returns, feature flags)

**Success Story**: This pattern took us from 79% to 80% coverage with just one simple test that reused existing mocks to hit the `!rewardsEnabled` early return path.

### Step 8: Success Criteria & Measurement
**Key Metrics (measured by running `yarn coverage:analyze` again):**
- **80%+ newCodeCoverage** (the SonarCloud-style metric for changed lines)
- **Improved overall coverage** for files that were below target
- **All tests pass** without errors or warnings
- **TypeScript compilation** succeeds without errors
- **ESLint validation** passes (with auto-fixes applied)

**Quality Standards:**
- **Follow project guidelines** from `.cursor/rules/unit-testing-guidelines.mdc`
- **Reuse existing infrastructure** (mocks, utilities, patterns)
- **Target specific uncovered lines** identified in the coverage report
- **Use file-type specific test patterns** from the LLM recommendations

**Efficiency Focus:**
Create the minimum number of high-quality tests that provide maximum coverage of:
1. **Critical code paths** identified in `uncoveredNewLines`
2. **Complex logic, error handling, and user interactions** (as suggested in the report)
3. **New code changes** rather than testing everything

**Validation:**
Run `yarn coverage:analyze` before and after test creation to measure improvement in the `newCodeCoverage` metric - this is your success indicator. The command generates both JSON reports for actionable recommendations and LCOV files for detailed line-by-line coverage analysis.

Arguments: $ARGUMENTS