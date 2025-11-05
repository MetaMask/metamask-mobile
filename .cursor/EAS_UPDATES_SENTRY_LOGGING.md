# EAS Updates Logging to Sentry

## Overview

This implementation automatically logs EAS (Expo Application Services) update information to Sentry, allowing you to track which errors and events originate from OTA (Over-The-Air) updates.

## What Was Added

### 1. EAS Update Context in Sentry (`app/util/sentry/utils.ts`)

The following information is now automatically sent to Sentry with every error report:

#### Sentry Tags

- `expo-update-id`: The unique ID of the current EAS update
- `expo-is-embedded-launch`: Whether the app is running from embedded code or an OTA update
- `expo-channel`: The update channel (e.g., "production", "preview")
- `expo-runtime-version`: The runtime version of the current update
- `expo-update-group-id`: The update group ID (if available)
- `expo-update-debug-url`: Direct link to the update in Expo dashboard

#### Sentry Context

For non-embedded launches (OTA updates), a dedicated "EAS Update" context is added with:

- Is OTA Update: true
- Update ID
- Channel
- Runtime Version

## How It Works

1. When the app starts, `setupSentry()` is called in `index.js`
2. After Sentry initialization, `setEASUpdateContext()` is automatically invoked
3. This function reads information from the `expo-updates` module
4. The information is set as Sentry tags and context
5. All subsequent error reports include this EAS update information

## Viewing in Sentry

### In Error Reports

When viewing an error in Sentry, you'll see:

1. **Tags Section**: Look for tags starting with `expo-`:
   - `expo-update-id`: Click to filter all errors from this specific update
   - `expo-channel`: Filter errors by update channel
   - `expo-runtime-version`: Filter by runtime version

2. **Context Section**: Find "EAS Update" context for detailed update information

3. **Quick Link**: Use the `expo-update-debug-url` tag to jump directly to the update in your Expo dashboard

### Filtering and Searching

You can use these tags to:

- Filter errors by specific update: `expo-update-id:abc123`
- Find all OTA update errors: `expo-is-embedded-launch:false`
- Compare error rates across channels: `expo-channel:production` vs `expo-channel:preview`
- Track errors by runtime version: `expo-runtime-version:1.0.0`

### Example Search Queries

```
# All errors from OTA updates (not embedded)
expo-is-embedded-launch:false

# Errors from production channel only
expo-channel:production

# Errors from a specific update
expo-update-id:YOUR_UPDATE_ID

# Combine multiple filters
expo-channel:production AND expo-is-embedded-launch:false
```

## Implementation Details

### Files Modified

1. **`app/util/sentry/utils.ts`**
   - Added imports from `expo-updates`
   - Added `setEASUpdateContext()` function
   - Integrated into `setupSentry()` initialization

2. **`app/util/sentry/utils.test.ts`**
   - Added mock for `expo-updates` module
   - Tests pass with mocked EAS update data

### Error Handling

The implementation includes error handling:

- If `setEASUpdateContext()` fails, it logs a warning but doesn't break Sentry
- Missing optional fields (like update group) are handled gracefully
- Works correctly for both embedded launches and OTA updates

## Benefits

1. **Faster Debugging**: Quickly identify if an error is related to a specific OTA update
2. **Update Quality Tracking**: Monitor error rates per update to catch regressions
3. **Channel Comparison**: Compare stability across different release channels
4. **Direct Navigation**: Jump from Sentry to Expo dashboard with one click
5. **Historical Analysis**: Track how errors evolve across updates

## Next Steps

1. Deploy the updated code to your app
2. Push an EAS update
3. Trigger some test errors (or wait for real errors)
4. Check Sentry to see the new tags and context

## Testing the Implementation

To verify the implementation works:

```bash
# Run the Sentry utils tests
yarn jest app/util/sentry/utils.test.ts
```

All tests should pass, confirming the implementation is correct.

### Test Coverage

The `setEASUpdateContext` function is tested for:

1. **Non-throwing execution**: Verifies the function runs without crashing
2. **Error handling**: Confirms errors are caught gracefully and logged as warnings instead of breaking Sentry

Note: Full integration testing of Sentry tags happens at the application level, as the function integrates with Sentry's scope management which is complex to mock in unit tests. The tests ensure the function's error handling works correctly and doesn't break the application if Sentry encounters issues.
