# Unit Test Runner

**Goal**: Run unit tests for all changed files and their related test files.

## Steps

1. **Get changed files**

   - Run `git diff --name-only --diff-filter=ACMR` for all changes (staged + unstaged)
   - Filter for `.js`, `.jsx`, `.ts`, `.tsx` files
   - Display list

2. **Find test files**

   - Check if file is already a test file (contains `.test.`)
   - For source files, find related tests: `{basename}.test.{ext}`
   - Exclude snapshots (`.snap`)
   - Collect unique test files

3. **Run tests**

   - Execute `yarn jest` with all found test files
   - Run without coverage
   - Capture results

4. **Report & fix**
   - Show pass/fail summary
   - If failures: Analyze → Fix issues → Re-run tests
   - Continue until all pass

## Checklist

- [ ] Changed files identified
- [ ] Test files found
- [ ] Tests executed
- [ ] All tests pass
- [ ] Issues fixed and re-tested if needed

## Failure Actions

1. Analyze failures → Isolate issues → Fix (implementation/mocks/tests) → Re-run → Repeat until pass

## Quick Commands

```bash
yarn jest <filename>                         # Run test file
yarn jest <filename> -t "test name"          # Run specific test by name
yarn jest <filename> --no-coverage           # Faster execution (skip coverage)
yarn jest <filename> --verbose               # Detailed output for debugging
```

## Success Criteria

All tests pass • No errors/timeouts • All changed files tested
