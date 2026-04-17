import { test as perfTest } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightGestures,
} from '../../../framework';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import LoginView from '../../../page-objects/wallet/LoginView';
import WalletView from '../../../page-objects/wallet/WalletView';
import {
  PerformanceLogin,
  PerformanceLaunch,
} from '../../../tags.performance.js';

/*
 * Scenario: Cold Start to Login Screen Performance Test
 *
 * This test measures how long it takes for the login screen to appear
 * after the app is terminated and launched again.
 *
 * Test Setup:
 * - Existing wallet already unlocked
 *
 * The test measures:
 * 1. Time to relaunch the app and display the login screen
 */
perfTest.describe(`${PerformanceLogin} ${PerformanceLaunch}`, () => {
  perfTest(
    'Cold Start: Measure ColdStart To Login Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(WalletView.accountIcon),
        {
          timeout: 15000,
          description: 'Wallet account icon should be visible before relaunch',
        },
      );
      await WalletView.waitForBalanceToStabilize();
      await PlaywrightGestures.terminateApp(currentDeviceDetails);

      const timer1 = new TimerHelper(
        'Time since the the app is launched, until login screen appears',
        { ios: 3000, android: 3500 },
        currentDeviceDetails.platform,
      );

      await PlaywrightGestures.activateApp(currentDeviceDetails);
      await timer1.measureRaw(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(LoginView.container),
          {
            description: 'Login title should be visible',
          },
        );
      });

      performanceTracker.addTimers(timer1);

      console.log('Cold Start to Login Screen Performance Test completed');
      console.log(`Cold Start to Login Screen: ${timer1.getDuration()}ms`);
      console.log(`Total Time: ${timer1.getDuration() ?? 0}ms`);
    },
  );
});
