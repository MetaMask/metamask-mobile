import { test } from '../../../framework/fixture';
import {
  Performance,
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
import WalletView from '../../../page-objects/wallet/WalletView.js';
test.describe(`${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Cold Start after importing a wallet',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
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
          ios: 21000, // this number is because Appium DOM screenshot in iOS takes too long, but visually the button is visible in just a few seconds, so we assume that this time is approximately 2 seconds, any change in the real time, will impact this as well.
          android: 2000,
        },
        currentDeviceDetails.platform,
      );
      await timer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(WalletView.walletBuyButton),
        );
      });

      performanceTracker.addTimer(timer);
    },
  );
});
