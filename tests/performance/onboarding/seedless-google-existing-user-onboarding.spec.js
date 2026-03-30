import { test } from '../../framework/fixtures/performance';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import SocialLoginScreen from '../../../wdio/screen-objects/Onboarding/SocialLoginScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import AppwrightGestures from '../../framework/AppwrightGestures.ts';
import {
  login,
  onboardingFlowSeedlessFirstSessionToWallet,
} from '../../framework/utils/Flows.js';
import { PerformanceOnboarding } from '../../tags.performance.js';

test.describe(`${PerformanceOnboarding} seedless existing user`, () => {
  test.setTimeout(360000);
  test(
    'Seedless Onboarding: Google Login Existing User',
    { tag: '@metamask-onboarding-team' },
    async ({ device, performanceTracker }, testInfo) => {
      OnboardingScreen.device = device;
      OnboardingSheet.device = device;
      SocialLoginScreen.device = device;
      CreatePasswordScreen.device = device;
      OnboardingSucessScreen.device = device;
      WalletMainScreen.device = device;
      LoginScreen.device = device;

      await onboardingFlowSeedlessFirstSessionToWallet(device, 'google');

      await AppwrightGestures.terminateApp(device);
      await AppwrightGestures.activateApp(device);
      await LoginScreen.waitForScreenToDisplay();
      await login(device, {
        scenarioType: 'onboarding',
        skipIntro: true,
      });

      const timer1 = await WalletMainScreen.isMenuButtonVisible();
      timer1.changeName(
        'Google (returning): After unlock until wallet menu button visible (cold start after seedless onboarding)',
        { ios: 2000, android: 2000 },
        device,
      );

      performanceTracker.addTimer(timer1);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
