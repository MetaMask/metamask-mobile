/**
 * Example Test File: Screenshots with Navigation
 *
 * This file demonstrates various patterns for capturing screenshots
 * during navigation in E2E tests.
 *
 * NOTE: This is an example file for documentation purposes.
 * You can copy these patterns into your actual test files.
 */

import { withFixtures } from '../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../framework/fixtures/FixtureBuilder';
import {
  Utilities,
  withNavigationScreenshots,
  captureNavigationFlow,
  captureScreenshot,
  createScreenshotNavigationWrapper,
} from '../framework';
import { loginToApp } from '../helpers';
import TabBarComponent from '../pages/wallet/TabBarComponent';
import WalletView from '../pages/wallet/WalletView';
import SettingsView from '../pages/Settings/SettingsView';
import BrowserView from '../pages/Browser/BrowserView';
import { ScreenshotExamples } from '../tags';

describe(ScreenshotExamples('Screenshot Examples'), () => {
  /**
   * EXAMPLE 1: Manual Screenshots at Key Points
   */
  it('Example 1: Manual screenshot capture', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Capture screenshot after login
        await Utilities.takeScreenshot('01-after-login');

        await TabBarComponent.tapBrowser();

        // Capture screenshot after navigation
        await Utilities.takeScreenshot('02-browser-screen');

        await TabBarComponent.tapWallet();

        // Capture screenshot with custom prefix
        await Utilities.takeScreenshot('03-back-to-wallet', {
          prefix: 'example-test',
        });
      },
    );
  });

  /**
   * EXAMPLE 2: Automatic Screenshots on Navigation
   */
  it('Example 2: Automatic screenshots with navigation wrapper', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

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

        // Capture before and after
        await withNavigationScreenshots(
          async () => {
            await TabBarComponent.tapWallet();
          },
          {
            name: 'navigate-to-wallet',
            captureBeforeAction: true,
            captureAfterAction: true,
            screenshotPrefix: 'wallet-nav',
          },
        );
      },
    );
  });

  /**
   * EXAMPLE 3: Multi-Step Navigation Flow
   */
  it('Example 3: Capture entire navigation flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Capture screenshots at each step of the flow
        await captureNavigationFlow('settings-flow', [
          {
            name: 'open-hamburger-menu',
            action: async () => await WalletView.tapBurgerIcon(),
          },
          {
            name: 'tap-settings',
            action: async () => await WalletView.tapSettings(),
          },
          {
            name: 'verify-settings-visible',
            action: async () => {
              // Just a verification step, but still captured
              await new Promise((resolve) => setTimeout(resolve, 1000));
            },
          },
        ]);
      },
    );
  });

  /**
   * EXAMPLE 4: Reusable Navigation Functions
   */
  it('Example 4: Create reusable navigation with screenshots', async () => {
    // Create reusable navigation functions
    const navigateToBrowser = createScreenshotNavigationWrapper(
      async () => await TabBarComponent.tapBrowser(),
      'navigate-to-browser',
    );

    const navigateToWallet = createScreenshotNavigationWrapper(
      async () => await TabBarComponent.tapWallet(),
      'navigate-to-wallet',
    );

    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Use reusable functions - automatically captures screenshots
        await navigateToBrowser();
        await navigateToWallet();
      },
    );
  });

  /**
   * EXAMPLE 5: Conditional Screenshot Capture
   */
  it('Example 5: Conditional screenshots based on environment', async () => {
    const ENABLE_SCREENSHOTS = process.env.E2E_SCREENSHOTS === 'true';

    async function conditionalScreenshot(name: string): Promise<void> {
      if (ENABLE_SCREENSHOTS) {
        await captureScreenshot(name);
      }
    }

    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await conditionalScreenshot('after-login');

        await TabBarComponent.tapBrowser();
        await conditionalScreenshot('browser-opened');
      },
    );
  });

  /**
   * EXAMPLE 6: Screenshot with Error Handling
   */
  it('Example 6: Automatic screenshot on failure', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // If this operation fails, a screenshot will be automatically captured
        await withNavigationScreenshots(
          async () => {
            await TabBarComponent.tapBrowser();
            // If this assertion fails, screenshot is captured
            await Utilities.waitForElementToBeVisible(
              BrowserView.homeButton,
              5000,
            );
          },
          {
            name: 'navigate-to-browser-and-verify',
          },
        );
      },
    );
  });

  /**
   * EXAMPLE 7: Complex Navigation with Multiple Screenshots
   */
  it('Example 7: Complex flow with strategic screenshot placement', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await captureScreenshot('01-initial-wallet-view');

        // Navigate to settings with screenshots
        await captureNavigationFlow('navigate-to-security-settings', [
          {
            name: 'open-menu',
            action: () => WalletView.tapBurgerIcon(),
          },
          {
            name: 'open-settings',
            action: () => WalletView.tapSettings(),
          },
          {
            name: 'open-security',
            action: () => SettingsView.tapSecurity(),
          },
        ]);

        await captureScreenshot('04-security-settings-view');

        // Navigate back with screenshots
        await withNavigationScreenshots(() => SettingsView.tapBackButton(), {
          name: 'navigate-back-to-settings',
          captureBeforeAction: true,
          captureAfterAction: true,
        });
      },
    );
  });

  /**
   * EXAMPLE 8: Using executeWithScreenshot for Any Operation
   */
  it('Example 8: Wrap any operation with screenshot', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Wrap any operation, not just navigation
        await Utilities.executeWithScreenshot(
          async () => {
            await TabBarComponent.tapBrowser();
            await BrowserView.tapUrlInputBox();
            // Do multiple actions
          },
          {
            name: 'open-browser-and-focus-url-input',
            captureBeforeAction: false,
            captureAfterAction: true,
            screenshotPrefix: 'browser-setup',
            timeout: 15000,
          },
        );
      },
    );
  });
});
