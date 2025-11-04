# Test Timing Generator

A script to generate a JSON file containing test names and their execution times from Jest test runs.

## Overview

This script runs your Jest tests and collects detailed timing information for each test, including:
- Test names and their file paths
- Execution duration for each test
- Test status (passed, failed, skipped)
- Summary statistics (average, min, max, median durations)
- Test results sorted by execution time

## Usage

### Basic Usage

Run all tests with default settings:

```bash
yarn test:timing
```

Or using Node directly:

```bash
node scripts/generate-test-timing.js
```

### Run Specific Test Paths

Test a specific directory or file pattern:

```bash
node scripts/generate-test-timing.js ./app/components
node scripts/generate-test-timing.js ./app/components/hooks
node scripts/generate-test-timing.js ./app/**/*.test.tsx
```

### Custom Output File

Specify a custom output file name:

```bash
node scripts/generate-test-timing.js --output my-test-results.json
node scripts/generate-test-timing.js -o results/timing-report.json
```

### Combine Options

Run specific tests and save to a custom file:

```bash
node scripts/generate-test-timing.js ./app/components --output component-tests.json
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output file path | `test-timing-results.json` |
| `[test-path]` | - | Jest test path pattern | `./app/ ./locales/ ./e2e/**/*.test.ts .github/**/*.test.ts` |

## Output Format

The script generates a JSON file with the following structure:

### Summary Section

```json
{
  "summary": {
    "totalTests": 150,
    "passedTests": 145,
    "failedTests": 3,
    "skippedTests": 2,
    "totalTime": 45230,
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": "2024-01-15T10:30:45.230Z"
  }
}
```

- `totalTests`: Total number of tests executed
- `passedTests`: Number of tests that passed
- `failedTests`: Number of tests that failed
- `skippedTests`: Number of tests that were skipped
- `totalTime`: Total execution time in milliseconds
- `startTime`: ISO timestamp when test run started
- `endTime`: ISO timestamp when test run completed

### Statistics Section

```json
{
  "statistics": {
    "averageDuration": 301.53,
    "minDuration": 5,
    "maxDuration": 5234,
    "medianDuration": 234,
    "totalDuration": 45230
  }
}
```

- `averageDuration`: Average test execution time in milliseconds
- `minDuration`: Fastest test execution time in milliseconds
- `maxDuration`: Slowest test execution time in milliseconds
- `medianDuration`: Median test execution time in milliseconds
- `totalDuration`: Sum of all test execution times in milliseconds

### Tests Section

```json
{
  "tests": [
    {
      "name": "should render component correctly",
      "suite": "/path/to/Component.test.tsx",
      "status": "passed",
      "duration": 5234,
      "durationSeconds": "5.234",
      "failureMessages": []
    },
    {
      "name": "should handle user interaction",
      "suite": "/path/to/Component.test.tsx",
      "status": "failed",
      "duration": 1234,
      "durationSeconds": "1.234",
      "failureMessages": [
        "Error: Expected value to be...",
        "at Object.<anonymous> (test.js:45:10)"
      ]
    }
  ]
}
```

Each test entry contains:
- `name`: Test name/description
- `suite`: Full path to the test file
- `status`: Test status (`passed`, `failed`, `pending`, or `skipped`)
- `duration`: Execution time in milliseconds
- `durationSeconds`: Execution time in seconds (formatted to 3 decimal places)
- `failureMessages`: Array of error messages (empty if test passed)

**Note**: Tests are sorted by duration in descending order (slowest tests first).

## Example Output

When you run the script, you'll see output like this:

```
🧪 Running tests to collect timing data...
📁 Test path: ./app/ ./locales/ ./e2e/**/*.test.ts .github/**/*.test.ts
📄 Output file: test-timing-results.json

⏳ Executing: yarn jest ./app/ ./locales/ ./e2e/**/*.test.ts .github/**/*.test.ts --json --no-coverage

✅ Test timing data collected successfully!

📊 Summary:
   Total Tests: 150
   Passed: 145
   Failed: 3
   Skipped: 2
   Total Execution Time: 45230ms

⏱️  Timing Statistics:
   Average: 301.53ms
   Min: 5ms
   Max: 5234ms
   Median: 234ms

📄 Results written to: /Users/sallem/Desktop/metamask-mobile/test-timing-results.json

🔝 Top 10 slowest tests:
   1. should render complex component (5234ms) - /path/to/Component.test.tsx
   2. should handle large data set (3421ms) - /path/to/DataComponent.test.tsx
   3. should perform async operations (2341ms) - /path/to/AsyncComponent.test.tsx
   ...
```

## Use Cases

### 1. Identify Slow Tests

Use the output to identify which tests are taking the longest:

```bash
node scripts/generate-test-timing.js --output slow-tests.json
# Then check the top tests in the JSON file
```

### 2. Track Test Performance Over Time

Run the script regularly and compare results:

```bash
# Run today
node scripts/generate-test-timing.js --output results/timing-2024-01-15.json

# Run tomorrow
node scripts/generate-test-timing.js --output results/timing-2024-01-16.json

# Compare the files to see if tests are getting slower
```

### 3. Focus on Specific Areas

Test specific components or modules:

```bash
# Test only component library
node scripts/generate-test-timing.js ./app/component-library --output component-lib-timing.json

# Test only hooks
node scripts/generate-test-timing.js ./app/components/hooks --output hooks-timing.json
```

### 4. CI/CD Integration

Include test timing in your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Generate Test Timing Report
  run: yarn test:timing --output test-timing-results.json
- name: Upload Test Timing Report
  uses: actions/upload-artifact@v3
  with:
    name: test-timing-report
    path: test-timing-results.json
```

## Notes

- The script runs tests with `--no-coverage` flag to speed up execution
- Test execution times are collected from Jest's internal timing
- The script will exit with code 1 if tests fail (unless JSON parsing succeeds)
- Large test suites may take several minutes to complete
- The output JSON file is overwritten if it already exists

## Troubleshooting

### Script fails to parse Jest output

If you see "Failed to parse Jest JSON output", try:
1. Ensure Jest is properly installed: `yarn install`
2. Run tests manually first: `yarn test:unit` to verify Jest works
3. Check that the test path is correct

### Output file not created

- Verify you have write permissions in the current directory
- Check that Jest completed successfully (some tests may fail, but JSON should still be generated)

### Tests take too long

- Use `--maxWorkers` flag when running Jest to limit parallelism
- Test specific paths instead of all tests
- Consider running in CI/CD environments with better resources

## Related Scripts

- `yarn test:unit` - Run unit tests normally
- `yarn test:unit:update` - Update test snapshots
- `yarn coverage:analyze` - Analyze test coverage

