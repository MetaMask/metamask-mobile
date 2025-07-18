# E2E Bridges

This directory contains bridges that connect the app to E2E testing infrastructure. These bridges are only used during E2E testing and should not be included in production builds.

## Bridges

### PerformanceBridge

The `PerformanceBridge` connects the app's Redux performance tracking to the E2E fixture server. It allows E2E tests to collect and analyze performance metrics during test execution.

**Location**: `e2e/bridge/PerformanceBridge.ts`

**Usage**: 
- Automatically enabled when `process.env.IS_TEST === 'true'`
- Sends performance metrics and session data to the fixture server
- Used by the Redux performance slice to bridge performance data to E2E tests

**API**:
- `sendMetric(metric)` - Send a performance metric to fixture server
- `sendSession(session)` - Send session data to fixture server  
- `clearPerformanceData()` - Clear performance data on fixture server
- `getPerformanceData()` - Get performance data from fixture server

## Architecture

```
App (Redux Performance Slice)
    ↓
PerformanceBridge (e2e/bridge/PerformanceBridge.ts)
    ↓ HTTP
Fixture Server (e2e/fixtures/fixture-server.js)
    ↓
E2E Tests (app/features/*/e2e/redux-performance-utils.ts)
```

## Adding New Bridges

When adding new bridges for E2E testing:

1. Create the bridge file in `e2e/bridge/`
2. Export it from `e2e/bridge/index.ts`
3. Ensure it only runs in test mode (`process.env.IS_TEST === 'true'`)
4. Document the bridge in this README

## Importing

```typescript
// Import specific bridge
import { performanceBridge } from '../../e2e/bridge/PerformanceBridge';

// Or import from index
import { performanceBridge } from '../../e2e/bridge';
``` 