# E2E Testing for Segment Events

This guide explains how to set up E2E tests for tracking Segment events in MetaMask Mobile.

## Prerequisites

1. Ensure you have the necessary imports:
```javascript
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from './helpers';
import { EVENT_NAME } from '../../../app/core/Analytics/MetaMetrics.events';
```

## Required Launch Arguments

To enable Segment event tracking in E2E tests, you must include the following launch argument:
```javascript
launchArgs: {
  sendMetaMetricsinE2E: true
}
```

Without this flag, the app will not send Segment events during testing.

## Two Approaches to Mocking Segment Events

### 1. Using withFixtures (Recommended for Most Cases)

This approach is simpler and integrates well with the existing test fixtures.

```javascript
const testSpecificMock = {
  POST: [mockEvents.POST.segmentTrack]
};

await withFixtures({
  fixture: new FixtureBuilder().withOnboardingFixture().build(),
  restartDevice: true,
  testSpecificMock,
  launchArgs: {
    sendMetaMetricsinE2E: true,
  }
}, async ({ mockServer }) => {
  // Your test code here
  
  // Get and verify events
  const events = await getEventsPayloads(mockServer, [
    EVENT_NAME.WALLET_IMPORTED,
    EVENT_NAME.WALLET_SETUP_COMPLETED
  ]);
});
```

### 2. Using startMockServer Directly

This approach gives you more control over the mock server setup and is useful when you need to handle complex mocking scenarios.

```javascript
const TEST_SPECIFIC_MOCK_SERVER_PORT = 8001;
const segmentMock = {
  POST: [mockEvents.POST.segmentTrack]
};

mockServer = await startMockServer(segmentMock, TEST_SPECIFIC_MOCK_SERVER_PORT);

await TestHelpers.launchApp({
  newInstance: true,
  delete: true,
  launchArgs: { 
    mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT), 
    sendMetaMetricsinE2E: true 
  }
});
```

## Verifying Events

After setting up the mocks and running your test, you can verify the events using `getEventsPayloads`:

```javascript
const events = await getEventsPayloads(mockServer, [
  EVENT_NAME.WALLET_IMPORTED,
  EVENT_NAME.WALLET_SETUP_COMPLETED
]);

// Check number of events
await Assertions.checkIfArrayHasLength(events, 2);

// Find specific events
const walletImportedEvent = events.find(
  (event) => event.event === EVENT_NAME.WALLET_IMPORTED
);

// Verify event properties
await Assertions.checkIfObjectsMatch(
  walletImportedEvent.properties,
  { biometrics_enabled: false }
);
```

## Best Practices

1. Always include `sendMetaMetricsinE2E: true` in launch arguments
2. Use `getEventsPayloads` to retrieve and verify events
3. Clean up mock servers after tests using `stopMockServer`
4. Use appropriate assertions to verify event properties
5. Consider testing both positive and negative cases (e.g., with and without metrics opt-in)

## Important: MetaMetrics Opt-in State

When testing Segment events, it's crucial to ensure the MetaMetrics opt-in state is properly set. There are two scenarios to consider:

### 1. Using Onboarding Fixture
When using `withOnboardingFixture()`, the opt-in state is automatically set during the onboarding flow **WHEN THE ACCEPT BUTTON IS TAPPED**. No additional configuration is needed.

```javascript
await withFixtures({
  fixture: new FixtureBuilder().withOnboardingFixture().build(),
  // ... other config
});
```

### 2. Using Injected State (Without Onboarding)
When using injected state without the onboarding flow, you **must** explicitly set the MetaMetrics opt-in state using `withMetaMetricsOptIn()`:

```javascript
await withFixtures({
  fixture: new FixtureBuilder()
    .withFoo()
    .withMetaMetricsOptIn() // Required when not using onboarding
    .build(),
  // ... other config
});
```

Without this, Segment events will not be sent even if `sendMetaMetricsinE2E: true` is set in launch arguments.

## Troubleshooting

If events are not being captured:
1. Verify `sendMetaMetricsinE2E: true` is set in `launchArgs`
2. Check mock server setup
3. Ensure correct event names are being used
4. If using injected state without onboarding, verify `withMetaMetricsOptIn()` is called