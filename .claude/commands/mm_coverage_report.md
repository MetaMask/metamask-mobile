# Coverage Analysis Report for PR Changes

Analyze test coverage on PR changes and provide a strategic plan to reach 80% coverage targets.

**⚠️ IMPORTANT: Follow `.cursor/rules/unit-testing-guidelines.mdc` - Focus ONLY on files with actual logic that need behavioral testing. Do NOT create tests for:**
- Constants/config files (they're just data)
- Simple export index files
- Type definitions
- Style files

**✅ DO create tests for files with logic:**
- React components with user interactions
- Hooks with side effects and state management
- Controllers with business logic
- Utility functions with complex logic

## Your Task

Run the enhanced coverage analysis script and provide a formatted report with actionable recommendations for files that actually need behavioral testing.

**🔧 Study This First (Redux Mocking Pattern):**
- `app/components/hooks/useNetworkSelection/useNetworkSelection.test.ts:248-259` - Proven Redux selector mocking
- `app/components/UI/Perps/__mocks__/index.ts` - Centralized mocks

### Step 1: Run Coverage Analysis
Execute the coverage analysis script:
```bash
yarn coverage:analyze
```

This script will:
- Use `gh` CLI to get PR changed files (or fallback to git diff)
- Filter out useless files (styles, mocks, types)
- Run Jest coverage on existing tests
- Calculate both overall file coverage AND new code coverage
- Generate branch-specific JSON report with LLM-friendly recommendations
- Export LCOV file for detailed line-by-line coverage analysis

### Step 2: Read and Format the Branch-Specific Reports
Read the generated branch-specific reports (both JSON and LCOV):
```bash
# Find the current branch reports
ls scripts/reports/coverage-report-*.json
ls scripts/reports/coverage-lcov-*.info

# Read the JSON report (replace with actual branch name)
cat scripts/reports/coverage-report-$(git branch --show-current | sed 's/[\/\\:*?"<>|]/-/g').json

# The LCOV file is also generated for LLM-based test generation:
head scripts/reports/coverage-lcov-$(git branch --show-current | sed 's/[\/\\:*?"<>|]/-/g').info
```

### Step 3: Analyze Enhanced Coverage Metrics
The report now includes both metrics (like SonarCloud):

**📊 Dual Coverage Summary:**
- **Overall Files Coverage**: X% (covered/total lines) - Y/Z files ≥80%
- **New Code Only Coverage**: X% (changed lines covered) - **This is the key metric!**
- Files needing improvement vs files with good coverage
- Branch and timestamp information

**🎯 LLM-Ready Actionable Recommendations:**
The report includes `actionableRecommendations` section with:
- **filesNeedingImprovement**: Files below 80% with specific uncovered line numbers
- **priorityFiles**: Files needing new tests with file-type specific suggestions
- **suggestedTestCases**: Context-aware test suggestions (components, hooks, controllers, utils)

**🔧 Smart Test Suggestions:**
Based on file analysis, you'll see targeted recommendations like:
- **React Components**: "Test user interactions (onPress, onChange events)"
- **Hooks**: "Test hook return values with different inputs"
- **Controllers**: "Test error handling and validation logic"
- **Utils**: "Test utility functions with edge cases"

### Step 4: Create Strategic Implementation Plan
Based on the actionable recommendations in the report, provide:

**📋 Priority Action Plan:**
1. **Focus on New Code Coverage**: Target the specific uncovered line numbers shown in the report
2. **Files Below Target**: Address files in `filesNeedingImprovement` first
3. **No Tests Needed**: Create comprehensive test suites for files in `priorityFiles`

**🔧 Implementation Steps:**
1. **Use existing mocks** from `app/__mocks__/` and component-specific `__mocks__/` folders
2. **Follow the suggested test cases** provided in the report for each file type
3. **Target specific lines** mentioned in `uncoveredNewLines` arrays
4. **Reference testing guidelines** in `.cursor/rules/unit-testing-guidelines.mdc`

**✅ Success Criteria:**
- **80%+ coverage** on new code (the `newCodeCoverage` metric)
- **All tests pass** without errors or warnings
- **Follow AAA pattern** (Arrange, Act, Assert)
- **Strong assertions** (`toBeOnTheScreen` vs `toBeDefined`)
- **Test public behavior**, not implementation details

**🎯 Key Focus Areas:**
The report provides file-type specific guidance - prioritize:
- **Components**: User interactions and conditional rendering
- **Hooks**: Return values and side effects
- **Controllers**: Error handling and state management
- **Utils**: Edge cases and input validation

Use the branch-specific reports (both JSON and LCOV) as your roadmap to efficiently reach the 80% coverage target on new code changes. The LCOV file provides line-by-line coverage data that's particularly useful for LLM-based analysis and targeted test generation.