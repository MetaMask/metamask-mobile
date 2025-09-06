# E2E Testing for Segment Events

This guide explains how to test Segment analytics events in MetaMask Mobile E2E tests. **Segment is mocked by default** in all E2E tests, and you should **only use `withFixtures`** for test setup.

## Prerequisites

Ensure you have the necessary imports:

```typescript
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { EventPayload, getEventsPayloads } from '../analytics/helpers';
import { testSpecificMock } from './helpers/your-test-mocks'; // Your test-specific mocks
```

## Setting Up Segment Event Testing

### Basic Setup with withFixtures

Segment mocking is **automatically included** in all E2E tests. You don't need to set up any additional mocking - just use `withFixtures`:

```typescript
describe('Your Feature Analytics', () => {
  let capturedEvents: EventPayload[] = [];

  const EVENT_NAMES = {
    FEATURE_STARTED: 'Feature Started',
    FEATURE_COMPLETED: 'Feature Completed',
  };

  beforeEach(async () => {
    jest.setTimeout(120000);
  });

  it('should track analytics events during feature usage', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withMetaMetricsOptIn() // Required for event tracking
          .build(),
        testSpecificMock, // Your API mocks (not Segment mocks)
        restartDevice: true,
        endTestfn: async ({ mockServer }) => {
          try {
            // Capture events at the end of the test
            capturedEvents = await getEventsPayloads(
              mockServer,
              [EVENT_NAMES.FEATURE_STARTED, EVENT_NAMES.FEATURE_COMPLETED],
              30000, // timeout in ms
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`Error capturing events: ${errorMessage}`);
          }
        },
      },
      async () => {
        // Your test implementation here
        await loginToApp();
        // Trigger actions that generate events
        // ...
      },
    );
  });
});
```

## Event Verification

### Basic Event Verification

After capturing events, verify them in your test:

```typescript
it('should validate captured events', async () => {
  // Filter events by type
  const featureStartedEvents = capturedEvents.filter(
    (e) => e.event === EVENT_NAMES.FEATURE_STARTED,
  );

  const featureCompletedEvents = capturedEvents.filter(
    (e) => e.event === EVENT_NAMES.FEATURE_COMPLETED,
  );

  // Check event counts
  await Assertions.checkIfArrayHasLength(featureStartedEvents, 1);
  await Assertions.checkIfArrayHasLength(featureCompletedEvents, 1);

  // Verify event properties
  await Assertions.checkIfObjectContains(featureStartedEvents[0].properties, {
    source: 'MainView',
    chain_id: '1',
    user_type: 'imported',
  });
});
```

### Advanced Event Verification with SoftAssert

For comprehensive event testing with better error reporting:

```typescript
import SoftAssert from '../../utils/SoftAssert';

it('should validate all event properties', async () => {
  const softAssert = new SoftAssert();

  // Check event counts
  const checkEventCount = softAssert.checkAndCollect(
    () => Assertions.checkIfArrayHasLength(capturedEvents, 4),
    'Should have 4 total events',
  );

  const checkStartedCount = softAssert.checkAndCollect(
    () => Assertions.checkIfArrayHasLength(featureStartedEvents, 2),
    'Should have 2 feature started events',
  );

  // Verify properties for each event
  const propertyAssertions = [];
  for (let i = 0; i < featureStartedEvents.length; i++) {
    propertyAssertions.push(
      softAssert.checkAndCollect(async () => {
        Assertions.checkIfObjectContains(featureStartedEvents[i].properties, {
          action: 'Feature',
          source: 'MainView',
          chain_id: '1',
        });
      }, `Feature Started [${i}]: Check basic properties`),
      softAssert.checkAndCollect(
        () =>
          Assertions.checkIfValueIsDefined(
            featureStartedEvents[i].properties.timestamp,
          ),
        `Feature Started [${i}]: Check timestamp is defined`,
      ),
    );
  }

  // Execute all assertions
  await Promise.all([
    checkEventCount,
    checkStartedCount,
    ...propertyAssertions,
  ]);

  softAssert.throwIfErrors();
});
```

## Event Capture Patterns

### Pattern 1: Capture All Events (Recommended for Development)

```typescript
endTestfn: async ({ mockServer }) => {
  try {
    // Capture all events without filtering for debugging
    capturedEvents = await getEventsPayloads(mockServer, [], 30000);
    console.log('All captured events:', capturedEvents);
  } catch (error) {
    console.error(`Error capturing events: ${error}`);
  }
},
```

### Pattern 2: Capture Specific Events (Recommended for Production)

```typescript
endTestfn: async ({ mockServer }) => {
  try {
    // Only capture the events you're testing
    capturedEvents = await getEventsPayloads(
      mockServer,
      [EVENT_NAMES.SWAP_STARTED, EVENT_NAMES.SWAP_COMPLETED],
      30000
    );
  } catch (error) {
    console.error(`Error capturing events: ${error}`);
  }
},
```

## MetaMetrics Opt-in Requirements

### Always Use `.withMetaMetricsOptIn()`

For events to be tracked, users must have opted into MetaMetrics. Always include this in your fixture:

```typescript
fixture: new FixtureBuilder()
  .withGanacheNetwork()
  .withMetaMetricsOptIn() // Required for event tracking
  .build(),
```

### Exception: Onboarding Tests

When testing the onboarding flow, opt-in happens during the flow when the accept button is tapped:

```typescript
fixture: new FixtureBuilder()
  .withOnboardingFixture() // Opt-in happens during onboarding
  .build(),
```

## Common Event Properties to Verify

### Standard Properties

Most events should include these properties:

```typescript
{
  chain_id: '1',           // Current network chain ID
  account_type: 'Imported', // Account type
  source: 'MainView',      // Where the action was initiated
  action: 'Feature',       // Type of action
  name: 'FeatureName',     // Feature name
}
```

### Dynamic Properties

These properties are calculated at runtime and should be verified as defined:

```typescript
// Check that dynamic values exist
await Assertions.checkIfValueIsDefined(event.properties.timestamp);
await Assertions.checkIfValueIsDefined(event.properties.response_time);
await Assertions.checkIfValueIsDefined(event.properties.network_fees_USD);
```

## Best Practices

### 1. Use Descriptive Event Names

```typescript
const EVENT_NAMES = {
  SWAP_STARTED: 'Swap Started',
  SWAP_COMPLETED: 'Swap Completed',
  QUOTES_RECEIVED: 'Quotes Received',
} as const;
```

### 2. Capture Events at Test End

Always capture events in the `endTestfn` to ensure all events are collected:

```typescript
endTestfn: async ({ mockServer }) => {
  capturedEvents = await getEventsPayloads(mockServer, expectedEvents, 30000);
},
```

### 3. Test Both Success and Error Cases

```typescript
it('should track error events when transaction fails', async () => {
  // Test error scenario and verify error events
});
```

### 4. Use Timeouts for Event Capture

Set reasonable timeouts for event capture (typically 30 seconds):

```typescript
capturedEvents = await getEventsPayloads(mockServer, events, 30000);
```

Without this, Segment events will not be sent even if `sendMetaMetricsinE2E: true` is set in launch arguments.

## Troubleshooting

### Events Not Being Captured

1. **Check MetaMetrics opt-in**: Ensure `.withMetaMetricsOptIn()` is called
2. **Check event names**: Verify event names match exactly (case-sensitive)
3. **Check timing**: Events are captured at the end of the test in `endTestfn`
4. **Check mock server**: Ensure `mockServer` is passed correctly to `getEventsPayloads`

### Debugging Events

Use the capture-all pattern to see what events are being generated:

```typescript
// Temporary debugging - capture all events
capturedEvents = await getEventsPayloads(mockServer, [], 30000);
console.log(
  'All events:',
  capturedEvents.map((e) => e.event),
);
```

## Example: Complete Test Structure

```typescript
describe('Feature Analytics', () => {
  let capturedEvents: EventPayload[] = [];

  const EVENT_NAMES = {
    FEATURE_OPENED: 'Feature Opened',
    FEATURE_COMPLETED: 'Feature Completed',
  } as const;

  beforeEach(async () => {
    jest.setTimeout(120000);
  });

  it('should track feature analytics events', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withMetaMetricsOptIn()
          .build(),
        testSpecificMock,
        restartDevice: true,
        endTestfn: async ({ mockServer }) => {
          capturedEvents = await getEventsPayloads(
            mockServer,
            Object.values(EVENT_NAMES),
            30000,
          );
        },
      },
      async () => {
        await loginToApp();
        // Your test actions here
      },
    );

    // Verify events
    const openedEvents = capturedEvents.filter(
      (e) => e.event === EVENT_NAMES.FEATURE_OPENED,
    );

    await Assertions.checkIfArrayHasLength(openedEvents, 1);
    await Assertions.checkIfObjectContains(openedEvents[0].properties, {
      source: 'MainView',
      chain_id: '1',
    });
  });
});
```

Remember: **Segment is mocked by default** - no additional setup required. Just use `withFixtures` and focus on your test logic!
