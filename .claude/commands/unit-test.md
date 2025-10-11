# Unit Test Runner

**Goal**: Run unit tests for all changed files and their related test files.

## Steps

1. **Get changed files**

   - Run `git diff --name-only --diff-filter=ACMR` to get all changed files (staged and unstaged)
   - Filter for JavaScript/TypeScript files with `.js`, `.jsx`, `.ts`, `.tsx` extensions
   - Display the list of changed files

2. **Find test files**

   - For each changed file, check if it's already a test file (contains `.test.`)
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

- [ ] All changed files identified
- [ ] Related test files found for each changed file
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

## Quick Commands

```bash
# Run tests on specific files
yarn jest <filename>

# Run tests with verbose output
yarn jest <filename> --verbose

# Debug failing test
yarn jest <filename> --no-coverage --verbose
```

## Success Criteria

- All tests pass
- No test failures or errors
- Tests run without timeouts or memory issues
- All changed files have their related tests executed
