import { test } from '../../framework/fixtures/performance';
import { expect as appwrightExpect } from 'appwright';
import TimerHelper from '../../framework/TimerHelper';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import SocialLoginScreen from '../../../wdio/screen-objects/Onboarding/SocialLoginScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import AppwrightSelectors from '../../framework/AppwrightSelectors';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import {
  dissmissPredictionsModal,
  checkPredictionsModalIsVisible,
} from '../../framework/utils/Flows.js';
import { PerformanceOnboarding } from '../../tags.performance.js';

/* Seedless Onboarding: Apple Login */
test.describe(PerformanceOnboarding, () => {
  test.setTimeout(240000);
  test(
    'Seedless Onboarding: Apple Login New User',
    { tag: '@metamask-onboarding-team' },
    async ({ device, performanceTracker }, testInfo) => {
      OnboardingScreen.device = device;
      OnboardingSheet.device = device;
      SocialLoginScreen.device = device;
      CreatePasswordScreen.device = device;
      OnboardingSucessScreen.device = device;
      WalletMainScreen.device = device;
      LoginScreen.device = device;

      const timer1 = new TimerHelper(
        'Time since the user taps "Create new wallet" button until OnboardingSheet is visible',
        { ios: 1500, android: 2000 },
        device,
      );
      const timer2 = new TimerHelper(
        'Time since the user taps Apple login button until post-OAuth screen is visible',
        { ios: 15000, android: 15000 },
        device,
      );
      const timer3 = new TimerHelper(
        'Time since post-OAuth screen action until Password fields are visible',
        { ios: 2000, android: 2000 },
        device,
      );
      const timer4 = new TimerHelper(
        'Time since the user taps "Create Password" button until Onboarding Success screen is visible',
        { ios: 5000, android: 5000 },
        device,
      );
      const timer5 = new TimerHelper(
        'Time since the user taps "Done" button until feature sheet is visible',
        { ios: 2500, android: 3100 },
        device,
      );
      const timer6 = new TimerHelper(
        'Time since feature sheet is dismissed until wallet main screen is visible',
        { ios: 30000, android: 30000 },
        device,
      );

      await OnboardingScreen.tapCreateNewWalletButton();
      await timer1.measure(async () => await OnboardingSheet.isVisible());

      await OnboardingSheet.tapAppleLoginButton();

      let isNewUser = true;

      if (AppwrightSelectors.isIOS(device)) {
        await timer2.measure(async () => {
          const iosNewUserEl = await SocialLoginScreen.iosNewUserTitle;
          const accountFoundEl = await SocialLoginScreen.accountFoundContainer;
          const result = await Promise.any([
            appwrightExpect(iosNewUserEl)
              .toBeVisible({ timeout: 30000 })
              .then(() => 'new_user'),
            appwrightExpect(accountFoundEl)
              .toBeVisible({ timeout: 30000 })
              .then(() => 'existing_user'),
          ]);
          isNewUser = result === 'new_user';
        });

        if (isNewUser) {
          await SocialLoginScreen.tapIosNewUserSetPinButton();
          await timer3.measure(
            async () => await CreatePasswordScreen.isVisible(),
          );
        }
      } else {
        await timer2.measure(async () => {
          const passwordEl = await CreatePasswordScreen.newPasswordInput;
          const accountFoundEl = await SocialLoginScreen.accountFoundContainer;
          const result = await Promise.any([
            appwrightExpect(passwordEl)
              .toBeVisible({ timeout: 30000 })
              .then(() => 'new_user'),
            appwrightExpect(accountFoundEl)
              .toBeVisible({ timeout: 30000 })
              .then(() => 'existing_user'),
          ]);
          isNewUser = result === 'new_user';
        });
      }

      if (isNewUser) {
        await CreatePasswordScreen.enterPassword(
          getPasswordForScenario('onboarding'),
        );
        await CreatePasswordScreen.reEnterPassword(
          getPasswordForScenario('onboarding'),
        );
        await CreatePasswordScreen.tapIUnderstandCheckBox();
        await CreatePasswordScreen.tapCreatePasswordButton();

        // OAuth flow skips MetaMetrics (metrics auto-enabled) → goes directly to OnboardingSuccess
        await timer4.measure(
          async () => await OnboardingSucessScreen.isVisible(),
        );

        await OnboardingSucessScreen.tapDone();
        await timer5.measure(
          async () => await checkPredictionsModalIsVisible(device),
        );

        await dissmissPredictionsModal(device);
        await timer6.measure(
          async () => await WalletMainScreen.isMainWalletViewVisible(),
        );

        const timers = [timer1, timer2, timer4, timer5, timer6];
        if (AppwrightSelectors.isIOS(device)) {
          timers.splice(2, 0, timer3);
        }
        performanceTracker.addTimers(...timers);
      } else {
        // Existing user: rehydrate with password
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
      }

      await performanceTracker.attachToTest(testInfo);
    },
  );
});
