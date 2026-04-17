import { test as perfTest } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightGestures,
} from '../../../framework';
import { loginToAppPlaywright } from '../../../flows/wallet.flow';
import { getPasswordForScenario } from '../../../framework/utils/TestConstants.js';
import LoginView from '../../../page-objects/wallet/LoginView';
import WalletView from '../../../page-objects/wallet/WalletView';
import {
  PerformanceLogin,
  PerformanceLaunch,
} from '../../../tags.performance.js';

/*
 * Scenario: Warm Start Login to Wallet Performance Test
 *
 * This test measures how long it takes to unlock the wallet
 * after the app is backgrounded and foregrounded back to the login screen.
 *
 * Test Setup:
 * - Existing wallet already unlocked once in the session
 *
 * The test measures:
 * 1. Time to tap Unlock and display the wallet screen again
 */
perfTest.describe(`${PerformanceLogin} ${PerformanceLaunch}`, () => {
  perfTest(
    'Measure Warm Start: Login To Wallet Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await loginToAppPlaywright();
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(WalletView.totalBalance),
        {
          description:
            'Wallet account icon should be visible before warm start',
        },
      );

      await PlaywrightGestures.backgroundApp(35);
      await PlaywrightGestures.activateApp(currentDeviceDetails);
      await PlaywrightAssertions.expectElementToBeVisible(
        asPlaywrightElement(LoginView.passwordInput),
        {
          description: 'Login title should be visible',
        },
      );
      const loginPassword = getPasswordForScenario('login');
      await LoginView.enterPassword(loginPassword);

      const timer1 = new TimerHelper(
        'Time since the user clicks on unlock button, until the app unlocks',
        { ios: 2500, android: 2500 },
        currentDeviceDetails.platform,
      );

      await LoginView.tapLoginButton();
      await timer1.measureRaw(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(WalletView.container),
          {
            description: 'Wallet balance should be visible',
          },
        );
        // await WalletView.waitForBalanceToStabilize();
      });

      performanceTracker.addTimers(timer1);

      console.log('Warm Start Login to Wallet Performance Test completed');
      console.log(`Warm Start Login to Wallet: ${timer1.getDuration()}ms`);
      console.log(`Total Time: ${timer1.getDuration() ?? 0}ms`);
    },
  );
});
