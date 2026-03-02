import { test } from '../../framework/fixtures/performance';
import TimerHelper from '../../framework/TimerHelper';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import SocialLoginScreen from '../../../wdio/screen-objects/Onboarding/SocialLoginScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AppwrightSelectors from '../../framework/AppwrightSelectors';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import {
  dissmissPredictionsModal,
  checkPredictionsModalIsVisible,
} from '../../framework/utils/Flows.js';
import { PerformanceOnboarding } from '../../tags.performance.js';

/* Seedless Onboarding: Google Login */
test.describe(PerformanceOnboarding, () => {
  test.setTimeout(240000);
  test(
    'Seedless Onboarding: Google Login New User',
    { tag: '@metamask-onboarding-team' },
    async ({ device, performanceTracker }, testInfo) => {
      OnboardingScreen.device = device;
      OnboardingSheet.device = device;
      SocialLoginScreen.device = device;
      CreatePasswordScreen.device = device;
      MetaMetricsScreen.device = device;
      OnboardingSucessScreen.device = device;
      WalletMainScreen.device = device;

      const timer1 = new TimerHelper(
        'Time since the user taps "Create new wallet" button until OnboardingSheet is visible',
        { ios: 1500, android: 2000 },
        device,
      );
      const timer2 = new TimerHelper(
        'Time since the user taps Google login button until post-OAuth screen is visible',
        { ios: 15000, android: 15000 },
        device,
      );
      const timer3 = new TimerHelper(
        'Time since post-OAuth screen action until Password fields are visible',
        { ios: 2000, android: 2000 },
        device,
      );
      const timer4 = new TimerHelper(
        'Time since the user taps "Create Password" button until MetaMetrics screen is displayed',
        { ios: 1600, android: 1600 },
        device,
      );
      const timer5 = new TimerHelper(
        'Time since the user taps "I agree" button on MetaMetrics screen until Onboarding Success screen is visible',
        { ios: 2200, android: 1700 },
        device,
      );
      const timer6 = new TimerHelper(
        'Time since the user taps "Done" button until feature sheet is visible',
        { ios: 2500, android: 3100 },
        device,
      );
      const timer7 = new TimerHelper(
        'Time since feature sheet is dismissed until wallet main screen is visible',
        { ios: 30000, android: 30000 },
        device,
      );

      await OnboardingScreen.tapCreateNewWalletButton();
      await timer1.measure(async () => await OnboardingSheet.isVisible());

      await OnboardingSheet.tapGoogleLoginButton();

      if (AppwrightSelectors.isIOS(device)) {
        await timer2.measure(
          async () => await SocialLoginScreen.isIosNewUserScreenVisible(),
        );

        await SocialLoginScreen.tapIosNewUserSetPinButton();
        await timer3.measure(
          async () => await CreatePasswordScreen.isVisible(),
        );
      } else {
        await timer2.measure(
          async () => await CreatePasswordScreen.isVisible(),
        );
      }

      await CreatePasswordScreen.enterPassword(
        getPasswordForScenario('onboarding'),
      );
      await CreatePasswordScreen.reEnterPassword(
        getPasswordForScenario('onboarding'),
      );
      await CreatePasswordScreen.tapIUnderstandCheckBox();
      await CreatePasswordScreen.tapCreatePasswordButton();

      await timer4.measure(
        async () => await MetaMetricsScreen.isScreenTitleVisible(),
      );

      await MetaMetricsScreen.tapIAgreeButton();
      await timer5.measure(
        async () => await OnboardingSucessScreen.isVisible(),
      );

      await OnboardingSucessScreen.tapDone();
      await timer6.measure(
        async () => await checkPredictionsModalIsVisible(device),
      );

      await dissmissPredictionsModal(device);
      await timer7.measure(
        async () => await WalletMainScreen.isMainWalletViewVisible(),
      );

      const timers = [timer1, timer2, timer4, timer5, timer6, timer7];
      if (AppwrightSelectors.isIOS(device)) {
        timers.splice(2, 0, timer3);
      }
      performanceTracker.addTimers(...timers);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
