import { test } from '../../../framework/fixture';
import TimerHelper from '../../../framework/TimerHelper.js';
import {
  PerformanceOnboarding,
  PerformanceLaunch,
} from '../../../tags.performance.js';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions';
import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import { asPlaywrightElement } from '../../../framework/EncapsulatedElement';

test.describe(`${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Measure Cold Start To Onboarding Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      const timer1 = new TimerHelper(
        'Time since the the app is installed, until onboarding screen appears',
        { ios: 3000, android: 3900 },
        currentDeviceDetails.platform,
      );
      await timer1.measure(
        async () =>
          await PlaywrightAssertions.expectElementToBeVisible(
            await asPlaywrightElement(OnboardingView.newWalletButton),
          ),
      );

      performanceTracker.addTimer(timer1);
    },
  );
});
