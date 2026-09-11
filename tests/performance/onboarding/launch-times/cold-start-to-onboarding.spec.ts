import { test } from '../../../framework/fixtures/playwright';
import TimerHelper from '../../../framework/TimerHelper.js';
import {
  Performance,
  PerformanceOnboarding,
  PerformanceLaunch,
} from '../../../tags.performance.js';
import AppiumAssertions from '../../../framework/AppiumAssertions';
import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import { addAppScreenTtcTimer } from '../../utils/readScreenTtc';

/**
 * Cold start launch (process→CTA) plus in-app TTC [onboarding_landing]
 * (mount→contentReady, Sentry-equivalent). Landing TTC is required here —
 * the screen is already the entry point.
 */
test.describe(`${Performance} ${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Measure Cold Start To Onboarding Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, performanceTracker }) => {
      const platform = currentDeviceDetails.platform;
      const launchToCta = new TimerHelper(
        'Time since the the app is installed, until onboarding screen appears',
        { ios: 3000, android: 4000 },
        platform,
      );
      await launchToCta.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          OnboardingView.newWalletButton,
        );
      });
      performanceTracker.addTimer(launchToCta);

      await addAppScreenTtcTimer({
        performanceTracker,
        screenId: 'onboarding_landing',
        platform,
        required: true,
      });
    },
  );
});
