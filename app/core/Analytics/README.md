# Analytics Module

The Analytics module provides a comprehensive tracking system for MetaMask Mobile using Segment as the analytics provider. This module enables privacy-conscious event tracking with support for both anonymous and identified user events.

## Overview

The Analytics module consists of several key components:

- **MetaMetrics**: Main analytics service class that wraps Segment SDK
- **MetricsEventBuilder**: Builder pattern for constructing tracking events
- **MetaMetricsPrivacySegmentPlugin**: Privacy plugin for anonymous event handling
- **Event Definitions**: Comprehensive event catalog in `MetaMetrics.events.ts`

## Architecture

```
Analytics/
├── MetaMetrics.ts                    # Main analytics service
├── MetaMetrics.types.ts             # TypeScript interfaces and types
├── MetaMetrics.events.ts            # Event definitions and constants
├── MetricsEventBuilder.ts           # Event builder utility
├── MetaMetricsPrivacySegmentPlugin.ts # Privacy plugin for Segment
├── MetaMetrics.constants.ts         # Constants (anonymous ID)
├── MetaMetricsTestUtils.ts          # Testing utilities
├── helpers/                         # Helper utilities
├── events/                          # Event-specific modules
└── index.ts                         # Public API exports
```

## Key Features

### Privacy-First Design

- **Anonymous Tracking**: Events can be marked as anonymous using sensitive properties
- **User Consent**: Respects user opt-in/opt-out preferences
- **Data Deletion**: Supports GDPR-compliant data deletion requests
- **Privacy Plugin**: Automatically handles anonymous event routing

### Event Tracking

- **Structured Events**: Predefined event catalog with consistent naming
- **Property Management**: Separate regular and sensitive properties
- **Builder Pattern**: Fluent API for constructing complex events
- **Type Safety**: Full TypeScript support with comprehensive types

### User Management

- **Anonymous Mode**: Default state with shared anonymous ID
- **User Identification**: Support for user traits and identification

## Quick Start

> [!NOTE]
> The code examples in this section are demonstration code designed to show how to use the analytics system. They may not follow all the specific patterns and best practices used in the actual MetaMask Mobile app, but they illustrate the correct usage of the analytics API.

### 1. Using the useMetrics Hook (Recommended)

The `useMetrics` hook provides a clean, React-friendly interface for analytics:

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics';
import { View, Button } from 'react-native';

function MyComponent() {
  const { trackEvent, createEventBuilder, isEnabled } = useMetrics();

  const handleTransactionStart = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SEND_TRANSACTION_STARTED)
        .addProperties({
          network: 'ethereum',
          token: 'ETH',
        })
        .addSensitiveProperties({
          amount: '0.1',
          recipient: '0x1234...',
        })
        .build(),
    );
  };

  const handleWalletOpen = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_OPENED)
        .addProperties({ source: 'navigation' })
        .build(),
    );
  };

  return (
    <View>
      <Button title="Send Transaction" onPress={handleTransactionStart} />
      <Button title="Open Wallet" onPress={handleWalletOpen} />
    </View>
  );
}
```

### 2. Event Builder Pattern

Always use the `MetricsEventBuilder` to construct events. This ensures proper event structure and type safety. The builder pattern allows you to create the event builder early and add properties throughout the component lifecycle, preventing direct modification of event objects and reducing the risk of unintended side effects.

#### Basic Usage

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics';

const { trackEvent, createEventBuilder } = useMetrics();

// Simple event
trackEvent(createEventBuilder(MetaMetricsEvents.APP_OPENED).build());

// Event with regular properties
trackEvent(
  createEventBuilder(MetaMetricsEvents.WALLET_OPENED)
    .addProperties({
      network: 'ethereum',
      source: 'navigation',
    })
    .build(),
);

// Event with sensitive properties (anonymous)
trackEvent(
  createEventBuilder(MetaMetricsEvents.SEND_TRANSACTION_STARTED)
    .addProperties({
      network: 'ethereum',
      token: 'ETH',
    })
    .addSensitiveProperties({
      amount: '0.1',
      recipient: '0x1234...',
    })
    .build(),
);

// Event with data recording control
trackEvent(
  createEventBuilder(MetaMetricsEvents.ERROR)
    .addProperties({ errorType: 'network' })
    .setSaveDataRecording(false)
    .build(),
);
```

#### Lifecycle-Based Event Building

The builder pattern shines when you need to collect properties throughout the component lifecycle:

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics';
import { useState, useEffect } from 'react';
import { View, Button, TextInput } from 'react-native';

function TransactionComponent() {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [transactionBuilder, setTransactionBuilder] = useState(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  // Create the event builder early
  useEffect(() => {
    const builder = createEventBuilder(
      MetaMetricsEvents.SEND_TRANSACTION_STARTED,
    ).addProperties({
      network: 'ethereum',
      token: 'ETH',
    });
    setTransactionBuilder(builder);
  }, []);

  // Add properties as they become available
  useEffect(() => {
    if (transactionBuilder && amount) {
      transactionBuilder.addSensitiveProperties({ amount });
    }
  }, [amount, transactionBuilder]);

  useEffect(() => {
    if (transactionBuilder && recipient) {
      transactionBuilder.addSensitiveProperties({ recipient });
    }
  }, [recipient, transactionBuilder]);

  const handleTransactionSubmit = () => {
    if (transactionBuilder) {
      // Build and track the event only when needed
      trackEvent(transactionBuilder.build());
    }
  };

  return (
    <View>
      <TextInput value={amount} onChangeText={setAmount} placeholder="Amount" />
      <TextInput
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Recipient"
      />
      <Button title="Submit Transaction" onPress={handleTransactionSubmit} />
    </View>
  );
}
```

#### Benefits of the Builder Pattern

1. **Immutable Event Construction**: Events are built step-by-step without direct object modification
2. **Lifecycle Flexibility**: Properties can be added at different stages of component lifecycle
3. **Type Safety**: TypeScript ensures proper event structure throughout the building process
4. **Error Prevention**: Prevents accidental modification of event objects after creation
5. **Clean Separation**: Event construction is separated from event tracking

### 3. User Management with Hook

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';
import { View, Button } from 'react-native';

function UserProfile() {
  const { addTraitsToUser } = useMetrics();

  const handleUserUpdate = async () => {
    await addTraitsToUser({
      walletType: 'imported',
      accountCount: 3,
    });
  };

  return (
    <View>
      <Button title="Update Profile" onPress={handleUserUpdate} />
    </View>
  );
}
```

### 4. Non-Functional React Components

For class components (legacy code) or non-component code, different approaches are needed:

#### Class Components (Legacy)

Use the Higher-Order Component (HOC) for class components:

```typescript
import { withMetricsAwareness } from '@/components/hooks/useMetrics/withMetricsAwareness';
import { MetaMetricsEvents } from '@/core/Analytics';
import { MetricsEventBuilder } from '@/core/Analytics/MetricsEventBuilder';

class LegacyComponent extends React.Component {
  static propTypes = {
    metrics: PropTypes.object, // Injected by withMetricsAwareness HOC
  };

  handleTransaction = () => {
    const { metrics } = this.props;
    metrics.trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SEND_TRANSACTION_STARTED,
      )
        .addProperties({ network: 'ethereum' })
        .build(),
    );
  };

  render() {
    return <Button onPress={this.handleTransaction} title="Send" />;
  }
}

export default withMetricsAwareness(LegacyComponent);
```

#### Non-Component Code (Utils, Services)

For utility functions, services, or other non-component code, use the singleton instance:

```typescript
import MetaMetrics from '@/core/Analytics';
import { MetaMetricsEvents } from '@/core/Analytics';

export function processTransaction(amount: string) {
  const metrics = MetaMetrics.getInstance();

  metrics.trackEvent(
    createEventBuilder(MetaMetricsEvents.SEND_TRANSACTION_STARTED)
      .addSensitiveProperties({ amount })
      .build(),
  );
}
```

## Privacy Features

### Anonymous Events

When you add sensitive properties to an event, the analytics system automatically generates **two separate events** for privacy protection:

1. **User Event** (with actual user ID): Contains only non-sensitive properties - we know **WHO** but not **WHAT**
2. **Anonymous Event** (with anonymous ID): Contains both sensitive and non-sensitive properties - we know **WHAT** but not **WHO**

This dual-event approach ensures that sensitive data is never associated with user identities, while still allowing for meaningful analytics.

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';
import { MetaMetricsEvents } from '@/core/Analytics';

const { trackEvent, createEventBuilder } = useMetrics();

// This generates two events:
// 1. User event: { userId: "actual-user-id", properties: { network: "ethereum" } }
// 2. Anonymous event: { userId: "0x0000000000000000", properties: { network: "ethereum", amount: "0.1" } }
trackEvent(
  createEventBuilder(MetaMetricsEvents.SEND_TRANSACTION_STARTED)
    .addProperties({ network: 'ethereum' })
    .addSensitiveProperties({ amount: '0.1' })
    .build(),
);
```

## User Consent and GDPR Compliance

The analytics system provides comprehensive support for user consent management and GDPR compliance, including data deletion requests and consent tracking.

### Data Deletion

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';

const {
  createDataDeletionTask,
  checkDataDeleteStatus,
  getDeleteRegulationId,
  getDeleteRegulationCreationDate,
} = useMetrics();

// Request data deletion
const response = await createDataDeletionTask();

// Check deletion status
const status = await checkDataDeleteStatus();

// Get deletion request details
const regulationId = getDeleteRegulationId();
const creationDate = getDeleteRegulationCreationDate();
```

### User Consent

```typescript
import { useMetrics } from '@/components/hooks/useMetrics';

const { isEnabled, isDataRecorded } = useMetrics();

// Check if analytics is enabled
const analyticsEnabled = isEnabled();

// Check if data has been recorded since the last deletion request
const hasRecordedData = isDataRecorded();
```

## Event Catalog

All available events are defined in `MetaMetrics.events.ts`. This file contains a comprehensive catalog of predefined events organized by category including app events, wallet interactions, transactions, security events, onboarding flows, and network operations.

## Testing

### E2E Test Utilities

The module provides testing utilities in `MetaMetricsTestUtils.ts` specifically designed for end-to-end testing:

```typescript
import MetaMetricsTestUtils from '@/core/Analytics/MetaMetricsTestUtils';

// Mock MetaMetrics for e2e testing
const mockMetrics = MetaMetricsTestUtils.createMockMetaMetrics();

// Verify event tracking in e2e scenarios
expect(mockMetrics.trackEvent).toHaveBeenCalledWith(expectedEvent);
```

### E2E Test Configuration

```typescript
// Configure test environment for e2e testing
MetaMetricsTestUtils.configureTestEnvironment();

// Clean up after e2e tests
MetaMetricsTestUtils.cleanup();
```

## Configuration

### Environment Variables

The module respects the following environment configurations:

- `__DEV__` - Development mode logging
- `isE2E` - End-to-end testing mode
- Segment configuration from app settings

### Storage Keys

The module uses the following storage keys:

- `METRICS_OPT_IN` - User consent preference
- `METAMETRICS_ID` - User tracking ID
- `ANALYTICS_DATA_RECORDED` - Data recording status
- `METAMETRICS_DELETION_REGULATION_ID` - Deletion request ID

## Best Practices

### Event Design

1. **Use the useMetrics Hook**: Always use the `useMetrics` hook instead of manually instantiating MetaMetrics
2. **Use Event Builder**: Always construct events using `createEventBuilder()` instead of manual event creation
3. **Use Predefined Events**: Always use events from `MetaMetrics.events.ts`
4. **Separate Properties**: Use regular properties for non-sensitive data, sensitive properties for personal data
5. **Consistent Naming**: Follow the established event naming conventions
6. **Minimal Data**: Only track necessary data for analytics purposes

### Privacy Compliance

1. **Safe to Call**: `trackEvent()` is safe to call even when analytics is disabled - the method handles this internally
2. **Sensitive Data Protection**: Use sensitive properties for any personal data to trigger anonymous event routing
3. **Data Minimization**: Only collect data necessary for analytics
4. **Deletion Support**: Support user data deletion requests
5. **Use Hook Methods**: Use the `isEnabled()` method from the `useMetrics` hook when you need to check the current state

### Performance

1. **Automatic Flushing**: Events are automatically flushed every 30 seconds or when the queue reaches 20 events
2. **Manual Flushing**: Use `flush()` to override the default policy and immediately send queued events
3. **Environment Override**: Flush policy can be overridden by environment variables (typically for development)
4. **Async Operations**: Handle async operations properly
5. **Error Handling**: Implement proper error handling for tracking failures

## Troubleshooting

### Common Issues

1. **Events Not Tracking**: Check if analytics is enabled with `isEnabled()` from the `useMetrics` hook (though `trackEvent()` is safe to call regardless)
2. **Events Not Appearing in Analytics**: If `IS_TEST=true` environment variable is set, the Segment client is replaced with a mock that does nothing - check your environment variables
3. **Anonymous Events**: Verify sensitive properties are set correctly using `addSensitiveProperties()`
4. **Event Builder Errors**: Always use `createEventBuilder()` and call `.build()` to finalize events

## Contributing

When adding new events or modifying the analytics system:

1. **Use the Hook**: Always use the `useMetrics` hook in components
2. **Use Event Builder**: Always construct events using `createEventBuilder()`
3. **Add Events**: Define new events in `MetaMetrics.events.ts`
4. **Update Types**: Ensure TypeScript types are updated
5. **Add Tests**: Include comprehensive test coverage
6. **Document**: Update this README with new features
7. **Privacy Review**: Ensure new events respect privacy requirements

## Related Documentation

- [Segment Analytics Documentation](https://segment.com/docs/)
- [MetaMetrics Debugging Guide](../../../docs/readme/metametrics-debugging.md) - Comprehensive guide for debugging analytics events
