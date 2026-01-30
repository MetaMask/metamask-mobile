import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import OnboardingScreen from '../../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import { PerformanceOnboarding, PerformanceLaunch } from '../../../../tags.js';

test.describe(`${PerformanceOnboarding} ${PerformanceLaunch}`, () => {
  test('Measure Cold Start To Onboarding Screen', async ({
    device,
    performanceTracker,
  }, testInfo) => {
    OnboardingScreen.device = device;
    const timer1 = new TimerHelper(
      'Time since the the app is installed, until onboarding screen appears',
      { ios: 3000, android: 3900 },
      device,
    );
    await timer1.measure(() => OnboardingScreen.isScreenTitleVisible());

    performanceTracker.addTimer(timer1);
    await performanceTracker.attachToTest(testInfo);
  });
}); // End describe
