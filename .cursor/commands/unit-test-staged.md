## Overview

Run unit tests for staged files and their related test files without coverage.

## Steps

1. **Get staged files**

   - Run `git diff --cached --name-only --diff-filter=ACMR`
   - Filter for JavaScript/TypeScript files with `.js`, `.jsx`, `.ts`, `.tsx` extensions
   - Display the list of staged files

2. **Find test files**

   - For each staged file, check if it's already a test file (contains `.test.`)
   - For source files, find related test files in the same directory
   - Look for files matching pattern: `{basename}.test.{ext}`
   - Exclude snapshot files (`.snap`)
   - Collect all unique test files

3. **Run tests**

   - Execute `yarn jest` with all found test files
   - Run tests without coverage information
   - Capture test results and output

4. **Report results**

   - Display test execution summary
   - Show pass/fail counts
   - Report any test failures with details

5. **Fix issues and re-test**
   - If tests fail, analyze the failure details
   - Identify the root cause of test failures
   - Fix implementation issues, missing mocks, or test problems
   - Re-run the same test files to verify fixes
   - Continue until all tests pass or issues are resolved

## Checklist

- [ ] All staged files identified
- [ ] Related test files found for each staged file
- [ ] Tests executed successfully
- [ ] All tests pass without failures
- [ ] No test timeouts or memory issues
- [ ] Issues fixed and tests re-run if failures occurred
- [ ] Final test run shows all tests passing

## Failure Actions

If tests fail:

1. **Analyze failures**: Review test output to identify specific failing tests
2. **Isolate issues**: Run individual test files to narrow down problems
3. **Check implementation**: Verify the code changes are correct
4. **Fix issues**: Address test failures, missing mocks, or implementation bugs
5. **Re-run tests**: Execute the same test files again to verify fixes
6. **Continue fixing**: Repeat steps 1-5 until all tests pass
7. **Final verification**: Ensure all tests pass before considering the command complete
