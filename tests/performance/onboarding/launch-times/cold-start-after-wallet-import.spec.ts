import { test } from '../../../framework/fixture';
import {
  PerformanceOnboarding,
  PerformanceLaunch,
} from '../../../tags.performance.js';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';
import LoginView from '../../../page-objects/wallet/LoginView';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions';
import { asPlaywrightElement } from '../../../framework/EncapsulatedElement';
import {
  loginToAppPlaywright,
  onboardingFlowImportSRPPlaywright,
} from '../../../flows/wallet.flow';
import TimerHelper from '../../../framework/TimerHelper';
import WalletView from '../../../page-objects/wallet/WalletView';

test.describe(`${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Cold Start after importing a wallet',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_3 ?? '');

      await PlaywrightGestures.terminateApp(currentDeviceDetails);
      await PlaywrightGestures.activateApp(currentDeviceDetails);

      await PlaywrightAssertions.expectElementToBeVisible(
        await asPlaywrightElement(LoginView.loginButton),
      );

      await loginToAppPlaywright({
        scenarioType: 'onboarding',
      });

      const timer = new TimerHelper(
        'Time since the user clicks on unlock button, until the app unlocks',
        {
          ios: 2000,
          android: 2000,
        },
        currentDeviceDetails.platform,
      );
      await timer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(WalletView.hamburgerMenuButton),
        );
      });

      performanceTracker.addTimer(timer);
    },
  );
});
