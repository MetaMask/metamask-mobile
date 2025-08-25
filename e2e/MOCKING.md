# E2E API Mocking Guide

This guide explains how to mock APIs in MetaMask Mobile E2E tests. The mocking system allows tests to run predictably by intercepting HTTP requests and returning controlled responses.

## Architecture Overview

The E2E mocking system consists of three main components:

1. **Default Mocks** (`e2e/api-mocking/mock-responses/defaults/`) - Shared mocks used across all tests
2. **Test-Specific Mocks** - Custom mocks defined within individual test files

### How Mocking Works

- All network requests go through a proxy server that can intercept and mock responses
- Default mocks are automatically loaded for all tests via `FixtureHelper.createMockAPIServer() -> startMockSerer()`
- Test-specific mocks take precedence over default mocks
- The mock server runs on a dedicated port and is automatically started/stopped by the test framework

## Default Mocks

Default mocks are organized by API category in `e2e/api-mocking/mock-responses/defaults/`:

```
defaults/
├── index.ts              # Aggregates all default mocks
├── accounts.ts           # Account-related API mocks
├── defi-adapter.ts       # DeFi protocol mocks
├── dapp-scanning.ts      # Dapp security scanning mocks
├── metametrics-test.ts   # Analytics mocks for testing
├── onramp-apis.ts        # Onramp service mocks
├── price-apis.ts         # Price feed mocks
├── staking.ts            # Staking API mocks
├── swap-apis.ts          # Swap/exchange API mocks
├── token-apis.ts         # Token metadata API mocks
├── user-storage.ts       # User storage service mocks
├── walletconnect.ts      # WalletConnect mocks
└── web-3-auth.ts         # Web3 authentication mocks
```

### Adding New Default Mocks

To add default mocks that all tests can benefit from:

1. **Create or edit a category file** in `defaults/` folder:

```typescript
// defaults/my-new-service.ts
import { MockApiEndpoint } from '../../framework/types';

export const MY_SERVICE_MOCKS = {
  GET: [
    {
      urlEndpoint: 'https://api.myservice.com/data',
      responseCode: 200,
      response: { success: true, data: [] },
    },
  ] as MockApiEndpoint[],
  POST: [
    {
      urlEndpoint: 'https://api.myservice.com/submit',
      responseCode: 201,
      response: { id: '123', status: 'created' },
    },
  ] as MockApiEndpoint[],
};
```

2. **Add to the main index file**:

```typescript
// defaults/index.ts
import { MY_SERVICE_MOCKS } from './my-new-service';

export const DEFAULT_MOCKS = {
  GET: [
    // ... existing mocks
    ...(MY_SERVICE_MOCKS.GET || []),
  ],
  POST: [
    // ... existing mocks
    ...(MY_SERVICE_MOCKS.POST || []),
  ],
  // ... other methods
};
```

Default mocks are automatically included in all tests through `FixtureHelper.createMockAPIServer()`.

## Test-Specific Mocks

Test-specific mocks are defined within individual test files and take precedence over default mocks.

### Method 1: Using testSpecificMock Parameter

Pass a `testSpecificMock` function to `withFixtures`:

```typescript
import { withFixtures } from '../framework/fixtures/FixtureHelper';
import { setupMockRequest } from '../api-mocking/mockHelpers';

describe('My Test Suite', () => {
  it('should handle custom API response', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupMockRequest(mockServer, {
        requestMethod: 'GET',
        url: 'https://api.example.com/custom',
        response: { customData: 'test' },
        responseCode: 200,
      });
    };

    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        testSpecificMock,
      },
      async ({ mockServer }) => {
        // Your test code here
      },
    );
  });
});
```

### Method 2: Using Mock Server Reference

Access the mock server directly within the test:

```typescript
await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
  },
  async ({ mockServer }) => {
    // Set up additional mocks within the test
    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: 'https://api.example.com/submit',
      response: { result: 'success' },
      responseCode: 201,
    });

    // Your test code here
  },
);
```

## Mock Helper Functions

The `e2e/api-mocking/mockHelpers.ts` file provides several utilities for mocking:

### setupMockRequest

For simple GET/POST/PUT/DELETE requests:

```typescript
await setupMockRequest(mockServer, {
  requestMethod: 'GET',
  url: 'https://api.example.com/data',
  response: { data: [] },
  responseCode: 200,
});
```

### setupMockPostRequest

For POST requests with body validation:

```typescript
await setupMockPostRequest(
  mockServer,
  'https://api.example.com/validate',
  { field: 'expectedValue' }, // Expected request body
  { result: 'validated' }, // Response
  {
    statusCode: 200,
    ignoreFields: ['timestamp'], // Fields to ignore in body validation
  },
);
```

## FixtureHelper Integration

### Automatic Mock Server Setup

`FixtureHelper.createMockAPIServer()` automatically:

1. Starts a mock server on the configured port
2. Loads all default mocks from `defaults/index.ts`
3. Applies test-specific mocks (if provided)
4. Calls `mockNotificationServices()` for notification-related mocks

### Notification Services Mocking

The `mockNotificationServices()` function in `FixtureHelper.ts` automatically sets up mocks for:

- Push notification APIs
- Notification list/read/update endpoints
- Feature announcement APIs
- Authentication services for notifications

This is applied to all tests automatically, so no additional setup is needed for basic notification functionality.

## Best Practices

### 1. Use Default Mocks for Common APIs

If multiple tests need the same API mocked, add it to the appropriate default mock file rather than duplicating it in each test.

### 2. Be Specific with URL Matching

Use specific URL patterns to avoid unintended matches:

```typescript
// Good - specific endpoint
urlEndpoint: 'https://api.metamask.io/prices/eth';

// Better - use regex for dynamic parts
urlEndpoint: /^https:\/\/api\.metamask\.io\/prices\/[a-z]+$/;

// Avoid - too broad
urlEndpoint: 'metamask.io';
```

### 3. Handle POST Request Bodies Properly

For POST requests, validate the request body when needed:

```typescript
await setupMockPostRequest(
  mockServer,
  'https://api.example.com/submit',
  {
    method: 'transfer',
    amount: '1000000000000000000', // Expected request body
  },
  { success: true },
  {
    ignoreFields: ['timestamp', 'nonce'], // Ignore dynamic fields
  },
);
```

### 4. Use Descriptive Response Codes

Always specify appropriate HTTP response codes:

```typescript
// Success cases
responseCode: 200, // OK
responseCode: 201, // Created
responseCode: 204, // No Content

// Error cases
responseCode: 400, // Bad Request
responseCode: 404, // Not Found
responseCode: 500, // Internal Server Error
```

### 5. Organize Test-Specific Mocks

For complex tests with many mocks, organize them in a setup function:

```typescript
const setupTestMocks = async (mockServer: Mockttp) => {
  // Price API mocks
  await setupMockRequest(mockServer, {
    /* ... */
  });

  // Token API mocks
  await setupMockRequest(mockServer, {
    /* ... */
  });

  // Swap API mocks
  await setupMockRequest(mockServer, {
    /* ... */
  });
};

// Use in test
await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    testSpecificMock: setupTestMocks,
  },
  async ({ mockServer }) => {
    // Test code
  },
);
```

## Debugging Mocks

### Live Request Validation

The mock server tracks requests that weren't mocked and logs them at the end of tests. Check the test output for warnings about unmocked requests. (This will soon be enforced to track new untracked request)

### Enable Debug Logging

Add debug logging to see which mocks are being hit:

```typescript
// The mock helpers automatically log when mocks are triggered
// Check test output for lines like:
// "Mocking GET request to: https://api.example.com/data"
```

### Common Issues

1. **Mock not triggering**: Check URL pattern matching
2. **Wrong response**: Verify mock takes precedence (test-specific > default)
3. **POST body validation failing**: Check `ignoreFields` and expected request body format
