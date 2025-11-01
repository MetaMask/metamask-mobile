import { test } from '../../../../fixtures/performance-test.js';
import TimerHelper from '../../../../utils/TimersHelper.js';
import OnboardingScreen from '../../../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';

test('Measure Cold Start To Onboarding Screen', async ({
  device,
  performanceTracker,
}, testInfo) => {
  OnboardingScreen.device = device;
  const timer1 = new TimerHelper(
    'Time since the the app is installed, until onboarding screen appears',
  );
  timer1.start();
  await OnboardingScreen.isScreenTitleVisible();
  timer1.stop();
  performanceTracker.addTimer(timer1);
  await performanceTracker.attachToTest(testInfo);
});
