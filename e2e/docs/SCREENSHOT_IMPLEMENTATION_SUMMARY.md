# Screenshot Implementation Summary

## What Was Implemented

Automatic screenshot capture functionality for navigation actions in E2E tests.

## Files Added/Modified

### Modified Files:

1. **`e2e/framework/Utilities.ts`**

   - Added `takeScreenshot(name, options)` method
   - Added `executeWithScreenshot(operation, options)` method
   - Both methods include automatic timestamp generation and name sanitization

2. **`e2e/framework/index.ts`**
   - Exported new NavigationHelpers module

### New Files:

3. **`e2e/framework/NavigationHelpers.ts`**

   - `withNavigationScreenshots()` - Wrap navigation with automatic screenshots
   - `captureNavigationFlow()` - Capture multi-step navigation flows
   - `captureScreenshot()` - Convenience wrapper for Utilities.takeScreenshot
   - `createScreenshotNavigationWrapper()` - Create reusable navigation wrappers

4. **`e2e/docs/screenshots-navigation.md`**

   - Comprehensive documentation with examples
   - API reference
   - Best practices
   - Troubleshooting guide

5. **`e2e/docs/SCREENSHOTS_QUICKSTART.md`**

   - Quick start guide with common patterns
   - Copy-paste ready examples

6. **`e2e/docs/screenshot-examples.spec.ts`**
   - Complete example test file
   - 8 different usage patterns demonstrated

## Key Features

### 1. Automatic Screenshot Capture

```typescript
await withNavigationScreenshots(() => TabBarComponent.tapBrowser(), {
  name: 'navigate-to-browser',
});
```

### 2. Before/After Capture

```typescript
await withNavigationScreenshots(() => CommonView.tapBackButton(), {
  name: 'go-back',
  captureBeforeAction: true,
  captureAfterAction: true,
});
```

### 3. Multi-Step Flows

```typescript
await captureNavigationFlow('settings-flow', [
  { name: 'open-menu', action: () => WalletView.tapBurgerIcon() },
  { name: 'open-settings', action: () => WalletView.tapSettings() },
]);
```

### 4. Automatic Failure Capture

If any operation fails, a screenshot is automatically captured with `-failed` suffix.

### 5. Reusable Wrappers

```typescript
const navigateToBrowser = createScreenshotNavigationWrapper(
  () => TabBarComponent.tapBrowser(),
  'navigate-to-browser',
);

// Later...
await navigateToBrowser(); // Automatically captures screenshot
```

## API Overview

### Utilities Class Methods

#### `Utilities.takeScreenshot(name, options)`

```typescript
static async takeScreenshot(
  name: string,
  options: { prefix?: string; timestamp?: boolean } = {}
): Promise<string>
```

#### `Utilities.executeWithScreenshot(operation, options)`

```typescript
static async executeWithScreenshot<T>(
  operation: () => Promise<T>,
  options: {
    name: string;
    captureBeforeAction?: boolean;
    captureAfterAction?: boolean;
    screenshotPrefix?: string;
  } & RetryOptions
): Promise<T>
```

### Navigation Helper Functions

#### `withNavigationScreenshots(fn, options)`

```typescript
async function withNavigationScreenshots<T>(
  navigationFn: () => Promise<T>,
  options: NavigationWithScreenshotOptions,
): Promise<T>;
```

#### `captureNavigationFlow(flowName, steps)`

```typescript
async function captureNavigationFlow(
  flowName: string,
  steps: { name: string; action: () => Promise<void> }[],
): Promise<void>;
```

#### `createScreenshotNavigationWrapper(fn, name, options)`

```typescript
function createScreenshotNavigationWrapper<T>(
  navigationFn: () => Promise<T>,
  name: string,
  options?: Omit<NavigationWithScreenshotOptions, 'name'>,
): () => Promise<T>;
```

## Usage in Tests

### Import Statement

```typescript
import {
  Utilities,
  withNavigationScreenshots,
  captureNavigationFlow,
  captureScreenshot,
  createScreenshotNavigationWrapper,
} from '../framework';
```

### Basic Usage

```typescript
it('navigates with screenshots', async () => {
  await withFixtures(
    { fixture: new FixtureBuilder().build(), restartDevice: true },
    async () => {
      await loginToApp();

      // Simple screenshot
      await Utilities.takeScreenshot('after-login');

      // Navigation with screenshot
      await withNavigationScreenshots(() => TabBarComponent.tapBrowser(), {
        name: 'to-browser',
      });
    },
  );
});
```

## Screenshot Naming Convention

### Default Format:

```
[prefix]_[timestamp]_[name]-[suffix].png
```

### Examples:

- `navigation_2024-10-17T10-30-45-123Z_navigate-to-browser-after.png`
- `settings-flow_2024-10-17T10-30-45-123Z_step-1-open-menu-after.png`
- `navigation_2024-10-17T10-30-45-123Z_navigate-to-settings-failed.png` (on failure)

### Custom Prefix:

```typescript
await Utilities.takeScreenshot('error-state', {
  prefix: 'bug-123',
  timestamp: true,
});
// Result: bug-123_2024-10-17T10-30-45-123Z_error-state.png
```

## Benefits

1. **Better Debugging**: Visual record of test execution
2. **Documentation**: Screenshots serve as visual documentation of flows
3. **Failure Analysis**: Automatic screenshots on failure help diagnose issues
4. **Test Reports**: Can be attached to test reports for stakeholders
5. **Reproducibility**: Visual evidence of what the test saw

## Integration with Existing Tests

### No Breaking Changes

- All existing tests continue to work without modification
- Screenshot capture is opt-in
- Works with existing Page Object Model pattern

### Gradual Adoption

You can add screenshots to tests incrementally:

1. Start with critical user flows
2. Add to complex navigation sequences
3. Expand to all navigation tests as needed

## Performance Considerations

- Screenshots have minimal performance impact
- Default behavior: capture after action only
- Can disable for CI runs if needed using environment variables
- Selective capture recommended (not every action, just navigation)

## Environment Control

```typescript
// Optional: Control via environment variable
const ENABLE_SCREENSHOTS = process.env.E2E_SCREENSHOTS === 'true';

async function conditionalScreenshot(name: string) {
  if (ENABLE_SCREENSHOTS) {
    await Utilities.takeScreenshot(name);
  }
}
```

## Next Steps

1. Review the [Quick Start Guide](./SCREENSHOTS_QUICKSTART.md)
2. See [Full Documentation](./screenshots-navigation.md) for advanced usage
3. Check [Example Tests](./screenshot-examples.spec.ts) for patterns
4. Start adding screenshots to your navigation tests

## Questions?

- See documentation in `e2e/docs/screenshots-navigation.md`
- Check examples in `e2e/docs/screenshot-examples.spec.ts`
- Review the implementation in `e2e/framework/Utilities.ts` and `e2e/framework/NavigationHelpers.ts`
