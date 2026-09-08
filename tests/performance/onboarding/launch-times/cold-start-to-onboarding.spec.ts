import { test } from '../../../framework/fixtures/playwright';
import TimerHelper from '../../../framework/TimerHelper.js';
import {
  Performance,
  PerformanceOnboarding,
  PerformanceLaunch,
} from '../../../tags.performance.js';
import { addAppScreenTtcTimer } from '../../utils/readScreenTtc';
import {
  SEEDLESS_APP_TTC_THRESHOLDS,
  waitForOnboardingLandingContent,
} from '../helpers/seedlessOnboardingTimers';

/*
 * Cold start launch (process→CTA) plus in-app TTC [onboarding_landing]
 * (mount→contentReady, Sentry-equivalent).
 */
test.describe(`${Performance} ${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Measure Cold Start To Onboarding Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, driver, performanceTracker }) => {
      const platform = currentDeviceDetails.platform;
      const launchToCta = new TimerHelper(
        'nav: cold start → Create new wallet CTA visible',
        { ios: 3000, android: 4000 },
        platform,
      );
      await launchToCta.measure(async () => {
        await waitForOnboardingLandingContent();
      });
      performanceTracker.addTimer(launchToCta);

      await addAppScreenTtcTimer({
        performanceTracker,
        screenId: 'onboarding_landing',
        platform,
        threshold: SEEDLESS_APP_TTC_THRESHOLDS.onboarding_landing,
      });
    },
  );
});
