import { test } from '../../../framework/fixtures/playwright';
import TimerHelper from '../../../framework/TimerHelper.js';
import {
  Performance,
  PerformanceOnboarding,
  PerformanceLaunch,
} from '../../../tags.performance.js';
import AppiumAssertions from '../../../framework/AppiumAssertions';
import AppiumGestures from '../../../framework/AppiumGestures';
import { isTestMuLaunchInTestEnabled } from '../../../framework/Constants';
import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import { addAppScreenTtcTimer } from '../../utils/readScreenTtc';
import { prepareInTestLaunch } from '../../utils/launchAppInTest';

/**
 * Cold start launch (process→CTA) plus in-app TTC [onboarding_landing]
 * (mount→contentReady, Sentry-equivalent). Landing TTC is required here —
 * the screen is already the entry point.
 *
 * By default session creation installs and launches the app, so the launch
 * timer starts after the launch. With `TESTMU_LAUNCH_IN_TEST=true` the session
 * only installs it, and the timer starts immediately before the spec launches
 * it. `TESTMU_PRE_LAUNCH_SETTLE_SECONDS` adds a wait before the timer.
 */
test.describe(`${Performance} ${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test(
    'Measure Cold Start To Onboarding Screen',
    { tag: '@metamask-mobile-platform' },
    async ({ currentDeviceDetails, performanceTracker }, testInfo) => {
      const platform = currentDeviceDetails.platform;
      const launchInTest = isTestMuLaunchInTestEnabled();
      if (launchInTest) {
        await prepareInTestLaunch(currentDeviceDetails, testInfo);
      }
      const launchToCta = new TimerHelper(
        'Time since the the app is installed, until onboarding screen appears',
        { ios: 3000, android: 4000 },
        platform,
      );
      await launchToCta.measure(async () => {
        if (launchInTest) {
          await AppiumGestures.activateApp(currentDeviceDetails);
        }
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
        // Landing-only. The shared 15s default stays for screens without a baseline.
        // Android max on Pixel 8 Pro was 384ms.
        threshold: { ios: 15_000, android: 1_200 },
      });
    },
  );
});
