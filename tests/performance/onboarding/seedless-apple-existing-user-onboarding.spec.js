import { test } from '../../framework/fixtures/performance';
import TimerHelper from '../../framework/TimerHelper';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import SocialLoginScreen from '../../../wdio/screen-objects/Onboarding/SocialLoginScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import { PerformanceOnboarding } from '../../tags.performance.js';

test.describe(`${PerformanceOnboarding} seedless existing user`, () => {
  test.setTimeout(240000);
  test(
    'Seedless Onboarding: Apple Login Existing User',
    { tag: '@metamask-onboarding-team' },
    async ({ device, performanceTracker }, testInfo) => {
      OnboardingScreen.device = device;
      OnboardingSheet.device = device;
      SocialLoginScreen.device = device;
      WalletMainScreen.device = device;
      LoginScreen.device = device;

      const timer1 = new TimerHelper(
        'Apple (existing): Tap "Create new wallet" → OnboardingSheet visible',
        { ios: 1500, android: 2000 },
        device,
      );
      const timer2 = new TimerHelper(
        'Apple (existing): Tap Apple login → account found visible',
        { ios: 15000, android: 15000 },
        device,
      );
      const timer3 = new TimerHelper(
        'Apple (existing): Tap account-found login → password screen visible',
        { ios: 4000, android: 4000 },
        device,
      );
      const timer4 = new TimerHelper(
        'Apple (existing): Submit password → wallet main visible',
        { ios: 30000, android: 30000 },
        device,
      );

      await OnboardingScreen.tapCreateNewWalletButton();
      await timer1.measure(async () => await OnboardingSheet.isVisible());

      await OnboardingSheet.tapAppleLoginButton();
      await timer2.measure(
        async () => await SocialLoginScreen.isAccountFoundScreenVisible(),
      );

      await SocialLoginScreen.tapAccountFoundLoginButton();
      await timer3.measure(
        async () => await LoginScreen.isLoginScreenVisible(),
      );

      await LoginScreen.typePassword(getPasswordForScenario('onboarding'));
      await LoginScreen.tapUnlockButton();

      await timer4.measure(
        async () => await WalletMainScreen.isMainWalletViewVisible(),
      );

      performanceTracker.addTimers(timer1, timer2, timer3, timer4);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
