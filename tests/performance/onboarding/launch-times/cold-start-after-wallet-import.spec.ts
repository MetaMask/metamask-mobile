import { test } from '../../../framework/fixture';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';
import {
  login,
  onboardingFlowImportSRP,
} from '../../../framework/utils/Flows.js';
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
      await onboardingFlowImportSRPPlaywright(
        'senior sad choose poem balance pledge shadow unfold high remember business army',
      );

      await PlaywrightGestures.terminateApp(currentDeviceDetails);
      await PlaywrightGestures.activateApp(currentDeviceDetails);

      await PlaywrightAssertions.expectElementToBeVisible(
        await asPlaywrightElement(LoginView.title),
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
      timer.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(WalletView.hamburgerMenuButton),
        );
      });

      performanceTracker.addTimer(timer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
