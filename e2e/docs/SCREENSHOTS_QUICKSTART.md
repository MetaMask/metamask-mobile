# Screenshots for Navigation - Quick Start Guide

## TL;DR

You can now automatically capture screenshots during navigation in your E2E tests!

## Quick Examples

### 1. Simple Screenshot

```typescript
import { Utilities } from '../framework';

await Utilities.takeScreenshot('home-screen');
```

### 2. Wrap Navigation with Screenshots

```typescript
import { withNavigationScreenshots } from '../framework';
import TabBarComponent from '../pages/wallet/TabBarComponent';

await withNavigationScreenshots(() => TabBarComponent.tapBrowser(), {
  name: 'navigate-to-browser',
});
```

### 3. Multi-Step Flow

```typescript
import { captureNavigationFlow } from '../framework';

await captureNavigationFlow('onboarding', [
  { name: 'step-1-welcome', action: () => WelcomeScreen.tapGetStarted() },
  { name: 'step-2-terms', action: () => TermsScreen.tapAgree() },
  {
    name: 'step-3-password',
    action: () => PasswordScreen.createPassword('secure123'),
  },
]);
```

## What Was Added

### New Methods in `Utilities` class:

- **`Utilities.takeScreenshot(name, options)`** - Capture a screenshot manually
- **`Utilities.executeWithScreenshot(operation, options)`** - Wrap any operation with automatic screenshots

### New Helper Functions:

- **`withNavigationScreenshots(fn, options)`** - Wrap navigation with screenshots
- **`captureNavigationFlow(name, steps)`** - Capture multi-step flows
- **`captureScreenshot(name, options)`** - Convenience wrapper
- **`createScreenshotNavigationWrapper(fn, name)`** - Create reusable wrappers

## Import

```typescript
import {
  Utilities,
  withNavigationScreenshots,
  captureNavigationFlow,
  captureScreenshot,
  createScreenshotNavigationWrapper,
} from '../framework';
```

## Common Patterns

### Pattern 1: After Every Navigation

```typescript
it('navigates through app', async () => {
  await withFixtures(
    { fixture: new FixtureBuilder().build(), restartDevice: true },
    async () => {
      await loginToApp();

      await withNavigationScreenshots(() => TabBarComponent.tapBrowser(), {
        name: 'to-browser',
      });

      await withNavigationScreenshots(() => TabBarComponent.tapWallet(), {
        name: 'to-wallet',
      });
    },
  );
});
```

### Pattern 2: Before and After

```typescript
await withNavigationScreenshots(() => CommonView.tapBackButton(), {
  name: 'go-back',
  captureBeforeAction: true, // Capture before
  captureAfterAction: true, // Capture after
});
```

### Pattern 3: Reusable Wrappers

```typescript
// Define once
const navigateToSettings = createScreenshotNavigationWrapper(async () => {
  await WalletView.tapBurgerIcon();
  await WalletView.tapSettings();
}, 'navigate-to-settings');

// Use many times
await navigateToSettings(); // Auto-captures screenshot
```

## Screenshot Naming

Screenshots are automatically named with timestamps:

```
navigation_2024-10-17T10-30-45-123Z_navigate-to-browser-after.png
```

Custom prefix:

```typescript
await Utilities.takeScreenshot('error-state', { prefix: 'bug-123' });
// Result: bug-123_2024-10-17T10-30-45-123Z_error-state.png
```

## Features

✅ **Automatic failure screenshots** - If operation fails, screenshot is captured  
✅ **Timestamped names** - Easy to track when screenshots were taken  
✅ **Configurable** - Choose when to capture (before, after, or both)  
✅ **Type-safe** - Full TypeScript support  
✅ **Framework integrated** - Works with all existing E2E patterns

## Screenshot Location

Screenshots are saved by Detox in:

- **iOS**: `e2e/artifacts/ios.sim.debug.MetaMask/`
- **Android**: `e2e/artifacts/android.emu.debug.MetaMask/`

## Full Documentation

See [screenshots-navigation.md](./screenshots-navigation.md) for complete documentation with advanced examples.

## Example Test

```typescript
describe('Browser Tests', () => {
  it('connects to dApp with screenshots', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Utilities.takeScreenshot('01-logged-in');

        await captureNavigationFlow('connect-to-dapp', [
          {
            name: 'open-browser',
            action: () => TabBarComponent.tapBrowser(),
          },
          {
            name: 'navigate-to-dapp',
            action: () =>
              Browser.navigateToURL('https://metamask.github.io/test-dapp/'),
          },
          {
            name: 'connect-wallet',
            action: () => TestDApp.tapConnectButton(),
          },
        ]);

        await Utilities.takeScreenshot('05-connected');
      },
    );
  });
});
```

## Next Steps

1. Import the new functions from `'../framework'`
2. Add screenshot capture to your navigation tests
3. Run your tests and check the artifacts directory
4. Adjust screenshot frequency based on your needs

For questions or issues, refer to the [full documentation](./screenshots-navigation.md).
