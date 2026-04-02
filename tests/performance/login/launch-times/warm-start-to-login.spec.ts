import { test as perfTest } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightGestures,
  SrpProfile,
} from '../../../framework';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import LoginView from '../../../page-objects/wallet/LoginView';
import WalletView from '../../../page-objects/wallet/WalletView';
import {
  PerformanceLogin,
  PerformanceLaunch,
} from '../../../tags.performance.js';

/*
 * Scenario: Warm Start to Login Screen Performance Test
 *
 * This test measures how long it takes for the login screen to appear
 * after the app is backgrounded and brought back to the foreground.
 *
 * Test Setup:
 * - Existing wallet already unlocked
 *
 * The test measures:
 * 1. Time to foreground the app and display the login screen
 */
perfTest.describe(`${PerformanceLogin} ${PerformanceLaunch}`, () => {
  perfTest.use({ srpProfile: SrpProfile.PERFORMANCE });
  perfTest(
    'Measure Warm Start: Warm Start to Login Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(WalletView.accountIcon),
        {
          description:
            'Wallet account icon should be visible before warm start',
        },
      );

      const timer1 = new TimerHelper(
        'Time since the user open the app again and the login screen appears',
        { ios: 2500, android: 3000 },
        currentDeviceDetails.platform,
      );

      await PlaywrightGestures.backgroundApp(35);
      await PlaywrightGestures.activateApp(currentDeviceDetails);

      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(LoginView.container),
          {
            description: 'Login title should be visible',
          },
        );
      });

      performanceTracker.addTimers(timer1);

      console.log('Warm Start to Login Screen Performance Test completed');
      console.log(`Warm Start to Login Screen: ${timer1.getDuration()}ms`);
      console.log(`Total Time: ${timer1.getDuration() ?? 0}ms`);
    },
  );
});
