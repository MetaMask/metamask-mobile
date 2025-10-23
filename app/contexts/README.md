# Feature Flag Override Context

## Overview

The `FeatureFlagOverrideContext` provides a non-persistent, runtime override system for feature flags using React Context. This allows developers to test different feature flag combinations without modifying the stored configuration.

## Features

- ✨ **Non-persistent**: Overrides exist only during the current app session
- 🎯 **Runtime Control**: Toggle flags on-the-fly without app restart
- 📱 **Context-based**: Uses React Context for efficient state management
- 🔄 **Real-time Updates**: Changes are immediately reflected across the app
- 🧪 **Development Friendly**: Perfect for testing and debugging

## Usage

### Basic Hook Usage

```tsx
import {
  useFeatureFlagOverride,
  useFeatureFlag,
  featureFlags,
} from '../contexts/FeatureFlagOverrideContext';

const MyComponent = () => {
  // Access override methods and values
  const {
    setOverride,
    removeOverride,
    clearAllOverrides,
    getFeatureFlag,
    featureFlags,
  } = useFeatureFlagOverride();

  // Get a specific feature flag
  const isNewUIEnabled = getFeatureFlag('newUIEnabled');

  const handleToggleFlag = () => {
    setOverride('newUIEnabled', !isNewUIEnabled);
  };

  return (
    <View>
      <Text>New UI: {isNewUIEnabled ? 'Enabled' : 'Disabled'}</Text>
      <Button title="Toggle" onPress={handleToggleFlag} />
    </View>
  );
};
```

### Available Hooks

#### `useFeatureFlagStats()`

Returns statistics about feature flags (counts by type).

#### `useFeatureFlagOverride()`

Returns override management methods:

- `setOverride(key, value)` - Set an override
- `removeOverride(key)` - Remove an override
- `clearAllOverrides()` - Clear all overrides
- `hasOverride(key)` - Check if a key has an override
- `getOverride(key)` - Get override value
- `getAllOverrides()` - Get all overrides

## Migration from AsyncStorage Service

The old `FeatureFlagOverrideService` has been replaced with this context-based approach:

### Before (AsyncStorage)

```tsx
const overrideService = FeatureFlagOverrideService.getInstance();
await overrideService.setOverride('flagKey', true);
```

### After (Context)

```tsx
const { setOverride } = useFeatureFlagOverride();
setOverride('flagKey', true);
```

## Implementation Details

### Provider Setup

The `FeatureFlagOverrideProvider` is automatically wrapped around the app in `app/components/Views/Root/index.tsx`:

```tsx
<FeatureFlagOverrideProvider>
  <ThemeProvider>{/* Rest of app */}</ThemeProvider>
</FeatureFlagOverrideProvider>
```

### State Management

- Context holds local state that overlays the Redux feature flags
- Changes are immediately reflected without Redux updates
- Original flags remain unchanged in Redux store
- Overrides are lost on app restart (intentional for development)

### Type Safety

All hooks and context methods are fully typed with TypeScript for better developer experience.

## Development Tools

Access the Feature Flag Override screen through:

1. Set environment variable: `MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS=true`
2. Navigate to **Settings → Feature Flag Override**
3. Use the UI to toggle/modify flags in real-time

The screen provides:

- Search and filter flags
- Toggle boolean flags with switches
- Edit string/number values
- View complex object/array flags
- Visual indicators for overridden flags
- Bulk operations (expand all, clear all)

## Best Practices

1. **Use hooks in components**: Always use the provided hooks instead of selectors for override-aware access
2. **Reset during testing**: Use `clearAllOverrides()` to reset state between tests
3. **Check override status**: Use `hasOverride()` to provide visual feedback
4. **Environment gating**: Gate override UI behind development environment checks
5. **Type validation**: Consider adding runtime type validation for overrides
