# E2E Performance Metrics System

This guide explains how to use the new, robust, and native-module-free performance metrics system for E2E tests.

## Overview

- Collects performance metrics in memory during E2E tests
- Saves metrics as JSON files after each run in `e2e-performance-results/`
- Compare metrics across runs using a simple script

## Setup

### 1. Import the utilities

```typescript
import {
  saveTestSuiteMetrics,
  clearTestMetrics,
  measureAction,
  measureActionSync,
  e2ePerformance,
} from './performance-utils';
```

### 2. Basic Usage

Wrap any async or sync operation you want to measure:

```typescript
it('does something', async () => {
  await measureAction('my-operation', async () => {
    // ... your test code ...
  });
});
```

Or for sync code:

```typescript
it('does something sync', () => {
  measureActionSync('my-sync-operation', () => {
    // ... your sync code ...
  });
});
```

### 3. Test Hooks Example

```typescript
describe('My Feature Performance Tests', () => {
  beforeEach(() => {
    clearTestMetrics();
  });

  afterAll(async () => {
    await saveTestSuiteMetrics('MyFeature', 'my-feature-tests');
  });

  it('should measure something', async () => {
    await measureAction('some-action', async () => {
      // ...
    });
  });
});
```

## Output & Comparison

- After each run, a JSON file is saved in `e2e-performance-results/`.
- To compare two runs:

```bash
node scripts/compare-e2e-performance.js compare MyFeature-my-feature-tests
```

- To list all available results:

```bash
node scripts/compare-e2e-performance.js list
```

## Data Structure

Each JSON file contains:

```json
{
  "suiteName": "MyFeature",
  "testName": "my-feature-tests",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metrics": [
    { "name": "some-action", "startTime": 1704067200000, "endTime": 1704067200010, "duration": 10 }
  ],
  "summary": {
    "totalDuration": 10,
    "averageDuration": 10,
    "metricCount": 1
  }
}
```

## Best Practices

1. **Clear metrics between tests**: Use `clearTestMetrics()` in `beforeEach()`
2. **Save at suite end**: Use `saveTestSuiteMetrics()` in `afterAll()`
3. **Use descriptive names**: For both suite and test for easy comparison
4. **Wrap all important actions**: Use `measureAction` for any operation you want to track

## Example Workflow

1. **Setup**: Import utilities and configure in test hooks
2. **Run tests**: Execute your E2E tests
3. **Collect data**: Metrics are saved to `e2e-performance-results/`
4. **Compare**: Use the comparison script to see performance changes

## Troubleshooting

- **No metrics saved**: Ensure you are calling `measureAction` and `saveTestSuiteMetrics`
- **Files not found**: Check the `e2e-performance-results/` directory
- **Empty metrics**: Make sure you are wrapping actions with `measureAction`