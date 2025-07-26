# MetaMetrics Debugging Guide

This guide provides strategies and tools for debugging MetaMetrics events in the MetaMask Mobile application.

## Overview

MetaMetrics is the analytics system used in MetaMask Mobile for tracking user interactions and events.
This guide covers both verifying that events are working correctly and debugging issues when they aren't appearing as expected.

## Quick Verification Checklist

Before diving into detailed debugging, verify these basics:

- [ ] Is analytics enabled? (check `IS_TEST` environment variable is NOT set to `true`)
- [ ] Is the user opted into analytics? (`isEnabled()` from `useMetrics` hook)
- [ ] Are you using the correct event builder pattern?
- [ ] Are events being flushed? (automatic every 30s or 20 events, or custom interval via env vars)
- [ ] Are you in the correct environment? (development vs production)
- [ ] Can you see events in Segment source?
- [ ] Can you see events in Mixpanel?

## Environment Variables

### IS_TEST Flag

The most common cause of missing events is the `IS_TEST=true` environment variable.
If set to true, events will not be sent to Segment.
This is intentional for testing environments.

**Impact**: When `IS_TEST=true`, the Segment client is replaced with a mock that does nothing.

### Segment Flush Policy Override

For development purposes, you can override the default flush policy using environment variables in `.js.env`:

```bash
# Optional for dev purpose: Segment flush interval in seconds
# example for 1 second flush interval
export SEGMENT_FLUSH_INTERVAL="1"

# example for flush when 1 event is queued
export SEGMENT_FLUSH_EVENT_LIMIT="1"
```

**Default Behavior**: Events are automatically flushed every 30 seconds or when the queue reaches 20 events.

**Development Override**: Use the environment variables above to flush events immediately for easier debugging.

### Development Logging

In development mode, MetaMetrics provides detailed logging to help you verify events are being tracked correctly. Look for these log patterns:

#### Initial Configuration

```log
[MetaMask DEBUG]: MetaMetrics client configured with: {
  "writeKey": "[key]",
  "proxy": "https://fn.segmentapis.com/?b=[token]",
  "debug": true,
  "flushInterval": "1",
  "flushAt": "1"
}

[MetaMask DEBUG]: MetaMetrics configured with ID: [Your Metrics ID]
```

#### User Opt-in and Identification

```log
INFO  IDENTIFY event saved {"traits": {"Theme": "dark", "platform": "ios", ...}, "type": "identify", "userId": "[Your Metrics ID]"}
INFO  TRACK event saved {"event": "Analytics Preference Selected", "properties": {"is_metrics_opted_in": true}, "type": "track"}
```

#### Event Tracking log examples

```log
INFO  TRACK event saved {"event": "Welcome Message Viewed", "properties": {}, "type": "track"}
INFO  TRACK event saved {"event": "Onboarding Started", "properties": {}, "type": "track"}
INFO  TRACK event saved {"event": "Banner Display", "properties": {"name": "solana"}, "type": "track"}
INFO  TRACK event saved {"event": "Navigation Drawer", "properties": {"action": "Navigation Drawer", "name": "Settings"}, "type": "track"}
```

#### Event Flushing

```log
INFO  Sent 2 events
```

**What to Look For**:

- ✅ **Configuration logs**: Confirm MetaMetrics is properly configured
- ✅ **User ID**: Verify a unique user ID is generated, should display in place of [Your Metrics ID] in the examples
- ✅ **Event tracking**: See your events being saved
- ✅ **Event flushing**: Confirm events are being sent to Segment
- ✅ **Properties**: Verify your event properties are included

## Event Tracking Verification

### 1. Verify Event Builder Usage

Ensure you're using the correct event builder pattern:

```typescript
// ✅ Correct
trackEvent(
  createEventBuilder(MetaMetricsEvents.MY_EVENT)
    .addProperties({ key: 'value' })
    .build(),
);

// ❌ Incorrect - missing .build()
trackEvent(
  createEventBuilder(MetaMetricsEvents.MY_EVENT).addProperties({
    key: 'value',
  }),
);
```

### 2. Check Event Properties

Verify that your event properties are correctly structured:

```typescript
// Regular properties (non-sensitive)
.addProperties({
  network: 'ethereum',
  source: 'navigation'
})

// Sensitive properties (triggers anonymous events)
.addSensitiveProperties({
  amount: '0.1',
  recipient: '0x1234...'
})
```

### 3. Verify Event Names

Ensure you're using predefined events from `MetaMetrics.events.ts`:

```typescript
// ✅ Correct - using predefined event
MetaMetricsEvents.SEND_TRANSACTION_STARTED;

// ❌ Incorrect - custom event name
('custom_event_name');
```

## Event Verification Workflow

Follow these steps to verify your events are working correctly:

### Step 1: Verify Event is Fired

MetaMetrics automatically logs all events in development mode. Look for these log patterns to verify your events are being tracked:

```log
INFO  TRACK event saved {"event": "MY_EVENT", "properties": {"debug": true}, "type": "track"}
```

### Step 2: Get Your Metrics ID

To find your specific events in Segment and Mixpanel, you need your metrics ID:

#### Development Environment

- **Check Console Logs**: Look for `[MetaMask DEBUG]: MetaMetrics configured with ID: [Your Metrics ID]` in the console

#### QA/Production Environment

1. **Lock the App**: Lock MetaMask Mobile
2. **Access Login Screen**: Go to the login screen
3. **Touch Fox Logo**: Touch the MetaMask fox logo for at least 10 seconds
4. **Wait for Export**: The device will generate a state export file (this can take time due to file size)
5. **Find Metrics ID**: Open the exported JSON file and look for the `metametricsId` value

**Note**: The state export is large, so be patient while the device generates the file. Keep your finger on the fox logo.

### Step 3: Verify Event Reaches Segment

Check that events are being sent to Segment:

1. **Request Access**: Ask helpdesk for access to the Segment website
2. **Navigate to Debugger**: Go to the correct source debugger:
   - **Mobile Dev**: For local development testing
   - **Mobile QA**: For QA build testing
   - **Mobile Prod**: For production events
3. **Find Your Events**: Use your metrics ID to filter events
4. **Verify Event Properties**: Ensure all properties are present

**Example URL**: `https://app.segment.com/consensys-analytics/sources/raw_segment_metamask_mobile_dev/debugger`

### Step 4: Verify Event Reaches Mixpanel

Confirm events are appearing in Mixpanel:

1. **Request Access**: Ask helpdesk for access to Mixpanel
2. **Navigate to Events**: Go to Events → Live View
3. **Find Your Events**: Use your metrics ID to filter events
4. **Check Properties**: Verify all properties are correctly received

## Common Debugging Scenarios

### Scenario 1: Events Not Appearing in Segment

**Symptoms**: Events are being tracked but don't appear in Segment dashboard

**Debugging Steps**:

1. Check `IS_TEST` environment variable
2. Verify user consent (`isEnabled()`)
3. Check network connectivity
4. Verify Segment configuration in your `.js.env` file
5. Check flush policy override in your `.js.env` file

### Scenario 2: Events Not Appearing in Mixpanel

**Symptoms**: Events appear in Segment but not in Mixpanel

Send a Slack message in the #data channel to explain your issue

### Scenario 3: Anonymous Events Not Working

**Symptoms**: Sensitive properties are being tracked but anonymous events aren't generated

**Debugging Steps**:

1. Verify `addSensitiveProperties()` is being used
2. Check that sensitive properties contain actual data
3. Check the events for the anonymous user ID `0x0000000000000000` (note: this will show many events from all users)

## Privacy Considerations

When debugging analytics, remember to respect user privacy:

1. **Don't log sensitive data**: Avoid logging personal information in debug statements
2. **Use test data**: Use mock data when testing sensitive properties (avoid private keys or any data that could link to other sensitive information)

## Getting Help

If you're still experiencing issues after following this guide, ask for help in #metamask-mobile-dev Slack channel.

## Related Documentation

- [Analytics Module README](../../app/core/Analytics/README.md)
- [Testing Guide](testing.md)
- [Environment Setup](environment.md)
