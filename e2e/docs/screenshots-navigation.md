# Automatic Screenshots for Navigation in E2E Tests

This guide explains how to automatically capture screenshots during navigation actions in your E2E tests.

## Overview

The framework now provides built-in utilities for capturing screenshots during navigation:

- `Utilities.takeScreenshot()` - Basic screenshot capture
- `Utilities.executeWithScreenshot()` - Execute any operation with automatic screenshots
- `withNavigationScreenshots()` - Wrapper specifically for navigation actions
- `captureNavigationFlow()` - Capture screenshots for multi-step navigation flows

## Quick Start

### 1. Simple Screenshot Capture

```typescript
import { Utilities } from '../framework';

// Capture a screenshot manually
await Utilities.takeScreenshot('home-screen-loaded');

// With custom options
await Utilities.takeScreenshot('settings-screen', {
  prefix: 'my-test',
  timestamp: true, // default: true
});
```

### 2. Wrap Navigation with Screenshots

```typescript
import { withNavigationScreenshots } from '../framework';
import TabBarComponent from '../pages/wallet/TabBarComponent';

// Automatically capture screenshot after navigation
await withNavigationScreenshots(
  async () => {
    await TabBarComponent.tapBrowser();
  },
  {
    name: 'navigate-to-browser',
    captureAfterAction: true,
  },
);
```

### 3. Capture Before and After Navigation

```typescript
import { withNavigationScreenshots } from '../framework';
import CommonView from '../pages/CommonView';

await withNavigationScreenshots(
  async () => {
    await CommonView.tapBackButton();
  },
  {
    name: 'navigate-back',
    captureBeforeAction: true, // Capture before navigation
    captureAfterAction: true, // Capture after navigation
    screenshotPrefix: 'back-navigation',
  },
);
```

### 4. Multi-Step Navigation Flow

```typescript
import { captureNavigationFlow } from '../framework';
import WalletView from '../pages/wallet/WalletView';
import SettingsView from '../pages/Settings/SettingsView';
import Assertions from '../framework/Assertions';

await captureNavigationFlow('settings-flow', [
  {
    name: 'tap-hamburger',
    action: async () => await WalletView.tapBurgerIcon(),
  },
  {
    name: 'open-settings',
    action: async () => await WalletView.tapSettings(),
  },
  {
    name: 'verify-settings-loaded',
    action: async () => await Assertions.checkIfVisible(SettingsView.container),
  },
]);
```

## Usage Patterns

### Pattern 1: Manual Screenshots at Key Points

Use when you want full control over when screenshots are taken:

```typescript
it('navigates through wallet screens', async () => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().build(),
      restartDevice: true,
    },
    async () => {
      await loginToApp();
      await Utilities.takeScreenshot('01-after-login');

      await TabBarComponent.tapBrowser();
      await Utilities.takeScreenshot('02-browser-screen');

      await TabBarComponent.tapWallet();
      await Utilities.takeScreenshot('03-back-to-wallet');
    },
  );
});
```

### Pattern 2: Automatic Screenshots on Navigation

Use when you want screenshots automatically captured for each navigation:

```typescript
it('navigates through settings', async () => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().build(),
      restartDevice: true,
    },
    async () => {
      await loginToApp();

      // Each navigation automatically captures screenshots
      await withNavigationScreenshots(() => WalletView.tapBurgerIcon(), {
        name: 'open-hamburger-menu',
      });

      await withNavigationScreenshots(() => WalletView.tapSettings(), {
        name: 'open-settings',
      });

      await withNavigationScreenshots(() => SettingsView.tapSecurity(), {
        name: 'open-security-settings',
      });
    },
  );
});
```

### Pattern 3: Create Reusable Navigation Functions

Use when you have common navigation paths that should always capture screenshots:

```typescript
import { createScreenshotNavigationWrapper } from '../framework';

// Create wrapper once
const navigateToBrowser = createScreenshotNavigationWrapper(
  async () => await TabBarComponent.tapBrowser(),
  'navigate-to-browser',
);

const navigateToSettings = createScreenshotNavigationWrapper(
  async () => {
    await WalletView.tapBurgerIcon();
    await WalletView.tapSettings();
  },
  'navigate-to-settings',
  { captureBeforeAction: true }, // Optional: capture before as well
);

// Use in your tests
it('tests browser functionality', async () => {
  await withFixtures(
    { fixture: new FixtureBuilder().build(), restartDevice: true },
    async () => {
      await loginToApp();
      await navigateToBrowser(); // Automatically captures screenshot
      // ... rest of test
    },
  );
});
```

### Pattern 4: Screenshot on Failure (Automatic)

The `executeWithScreenshot` method automatically captures a screenshot if the operation fails:

```typescript
await withNavigationScreenshots(
  async () => {
    await TabBarComponent.tapBrowser();
    await Assertions.checkIfVisible(BrowserView.homeButton);
  },
  {
    name: 'navigate-to-browser-and-verify',
  },
);
// If this fails, a screenshot named 'navigation_<timestamp>_navigate-to-browser-and-verify-failed' will be captured
```

## Advanced Usage

### Custom Screenshot Naming

```typescript
// Without timestamp
await Utilities.takeScreenshot('state-snapshot', { timestamp: false });

// With custom prefix
await Utilities.takeScreenshot('error-state', {
  prefix: 'bug-123',
  timestamp: true,
});
// Result: bug-123_2024-10-17T10-30-45-123Z_error-state
```

### Integrate with Page Objects

You can enhance your page objects to include screenshot capture:

```typescript
class SettingsView {
  // ... existing methods

  async navigateToSecurity(
    options: { captureScreenshot?: boolean } = {},
  ): Promise<void> {
    if (options.captureScreenshot) {
      await withNavigationScreenshots(
        () => Gestures.waitAndTap(this.securityButton),
        { name: 'navigate-to-security-settings' },
      );
    } else {
      await Gestures.waitAndTap(this.securityButton);
    }
  }
}
```

### Environment-Based Screenshot Control

Control screenshot capture based on environment variables:

```typescript
const ENABLE_SCREENSHOTS = process.env.E2E_SCREENSHOTS === 'true';

async function conditionalScreenshot(name: string): Promise<void> {
  if (ENABLE_SCREENSHOTS) {
    await Utilities.takeScreenshot(name);
  }
}

// Or create a wrapper
function maybeWithScreenshots<T>(
  fn: () => Promise<T>,
  name: string,
): Promise<T> {
  if (ENABLE_SCREENSHOTS) {
    return withNavigationScreenshots(fn, { name });
  }
  return fn();
}
```

## Best Practices

### DO:

✅ Use descriptive, kebab-case names for screenshots
✅ Capture screenshots at significant navigation points
✅ Use `captureNavigationFlow` for multi-step flows
✅ Include prefixes for test-specific screenshot organization
✅ Leverage automatic failure screenshots for debugging

### DON'T:

❌ Don't capture screenshots in tight loops (performance impact)
❌ Don't use special characters in screenshot names (will be sanitized)
❌ Don't forget that screenshots are stored and can fill disk space
❌ Don't capture screenshots for every single action (be selective)

## Screenshot Location

Screenshots are saved by Detox to the default artifacts directory:

- **iOS**: `artifacts/ios.sim.debug.MetaMask/`
- **Android**: `artifacts/android.emu.debug.MetaMask/`

## Troubleshooting

### Issue: Screenshots not being saved

**Solution**: Ensure Detox is configured correctly in your `.detoxrc.json`:

```json
{
  "artifacts": {
    "rootDir": "./e2e/artifacts",
    "plugins": {
      "screenshot": "all"
    }
  }
}
```

### Issue: Screenshot names are sanitized unexpectedly

**Solution**: Use alphanumeric characters, hyphens, and underscores only:

```typescript
// Good
await Utilities.takeScreenshot('navigate-to-settings');
await Utilities.takeScreenshot('step_01_login');

// Will be sanitized
await Utilities.takeScreenshot('navigate to settings'); // → navigate_to_settings
await Utilities.takeScreenshot('step#01 (login)'); // → step_01__login_
```

### Issue: Too many screenshots slowing down tests

**Solution**: Be selective about when to capture:

```typescript
// Instead of capturing on every action
await Utilities.takeScreenshot('action-1');
await SomeAction();
await Utilities.takeScreenshot('action-2');
await AnotherAction();

// Capture only at key milestones
await SomeAction();
await AnotherAction();
await Utilities.takeScreenshot('after-multiple-actions');
```

## Examples from Real Tests

### Example 1: Testing Browser Navigation

```typescript
describe('Browser Navigation', () => {
  it('navigates to dApp and connects wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await captureNavigationFlow('dapp-connection', [
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
          {
            name: 'approve-connection',
            action: () => PermissionSummaryBottomSheet.tapConnectButton(),
          },
        ]);

        // Verify connection
        await Assertions.checkIfVisible(TestDApp.connectedAccount);
      },
    );
  });
});
```

### Example 2: Testing Settings Flow

```typescript
describe('Settings', () => {
  it('changes network settings', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await Utilities.takeScreenshot('01-initial-state');

        await withNavigationScreenshots(
          async () => {
            await WalletView.tapBurgerIcon();
            await WalletView.tapSettings();
          },
          { name: 'navigate-to-settings', captureAfterAction: true },
        );

        await withNavigationScreenshots(() => SettingsView.tapNetworks(), {
          name: 'open-network-settings',
        });

        await withNavigationScreenshots(() => NetworksView.tapAddNetwork(), {
          name: 'open-add-network',
        });

        await Utilities.takeScreenshot('04-add-network-form');
      },
    );
  });
});
```

## API Reference

### `Utilities.takeScreenshot(name, options)`

- **name**: `string` - Name for the screenshot
- **options**: `{ prefix?: string, timestamp?: boolean }`
- **Returns**: `Promise<string>` - Path to saved screenshot

### `Utilities.executeWithScreenshot(operation, options)`

- **operation**: `() => Promise<T>` - Function to execute
- **options**: Configuration object
  - `name`: `string` - Name describing the operation
  - `captureBeforeAction?`: `boolean` - Capture before (default: false)
  - `captureAfterAction?`: `boolean` - Capture after (default: true)
  - `screenshotPrefix?`: `string` - Prefix for screenshots
  - `timeout?`: `number` - Operation timeout
- **Returns**: `Promise<T>` - Result of operation

### `withNavigationScreenshots(navigationFn, options)`

- **navigationFn**: `() => Promise<T>` - Navigation function
- **options**: `NavigationWithScreenshotOptions`
- **Returns**: `Promise<T>` - Result of navigation

### `captureNavigationFlow(flowName, steps)`

- **flowName**: `string` - Name for the flow
- **steps**: `Array<{ name: string, action: () => Promise<void> }>`
- **Returns**: `Promise<void>`

### `createScreenshotNavigationWrapper(navigationFn, name, options)`

- **navigationFn**: `() => Promise<T>` - Navigation function
- **name**: `string` - Name for the navigation
- **options**: Optional configuration
- **Returns**: `() => Promise<T>` - Wrapped function

## Related Documentation

- [E2E Testing Guidelines](./README.md)
- [Framework Documentation](../framework/README.md)
- [Detox Artifacts Documentation](https://wix.github.io/Detox/docs/api/artifacts/)
