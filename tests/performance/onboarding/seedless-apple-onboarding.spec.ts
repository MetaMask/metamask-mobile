import { test } from '../../framework/fixtures/playwright';
import { AppiumAssertions, AppiumGestures } from '../../framework';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import {
  closePredictModal,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow';
import {
  Performance,
  System,
  PerformanceOnboarding,
} from '../../tags.performance.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../page-objects/Onboarding/SocialLoginView';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../page-objects/Onboarding/OnboardingSuccessView';
import WalletView from '../../page-objects/wallet/WalletView';
import LoginView from '../../page-objects/wallet/LoginView';
import { addAppScreenTtcTimer } from '../utils/readScreenTtc';
import {
  createSeedlessOnboardingTimers,
  measureCreatePasswordToOnboardingSuccess,
  measurePostOauthToScreenContent,
  SEEDLESS_APP_TTC_THRESHOLDS,
  waitForChoosePasswordContent,
  waitForOnboardingSheetContent,
  waitForSocialRehydrateContent,
} from './helpers/seedlessOnboardingTimers';

/*
 * Seedless Apple — in-app TTC (Sentry-equivalent) + nav/flow timers.
 *
 * After each screen's UI is visible, `addAppScreenTtcTimer` reads the
 * mount→contentReady duration recorded by useScreenPerformance.
 */
test.describe(`${Performance} ${System} ${PerformanceOnboarding}`, () => {
  test.setTimeout(360000);

  test(
    'Seedless Onboarding: Apple Login New User',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }) => {
      const platform = currentDeviceDetails.platform;
      const timers = createSeedlessOnboardingTimers('Apple', platform, {
        sheet: { ios: 1500, android: 2000 },
        postOauth: { ios: 15000, android: 6000 },
        choosePassword: { ios: 5000, android: 4000 },
        createWallet: { ios: 5000, android: 4000 },
        walletChrome: { ios: 30000, android: 5000 },
        rehydrate: { ios: 5000, android: 4000 },
        existingWallet: { ios: 5000, android: 4000 },
      });

      const password = getPasswordForScenario('onboarding') ?? '';

      await OnboardingView.tapCreateNewWalletButton();
      await timers.sheetNav.measure(async () => {
        await waitForOnboardingSheetContent('apple');
      });
      performanceTracker.addTimer(timers.sheetNav);
      await addAppScreenTtcTimer({
        performanceTracker,
        screenId: 'onboarding_sheet',
        platform,
        threshold: SEEDLESS_APP_TTC_THRESHOLDS.onboarding_sheet,
      });

      await OnboardingSheet.tapAppleLoginButton();
      await SocialLoginView.dismissUpdateModalIfPresent();

      const postOauthContent = await measurePostOauthToScreenContent(
        timers.postOauthFlow,
        'Apple',
        platform,
      );
      performanceTracker.addTimer(timers.postOauthFlow);
      await addAppScreenTtcTimer({
        performanceTracker,
        screenId: postOauthContent,
        platform,
        threshold: SEEDLESS_APP_TTC_THRESHOLDS[postOauthContent],
      });
      const isNewUser = postOauthContent !== 'account_already_exists';

      if (isNewUser && platform === 'ios') {
        await SocialLoginView.tapIosNewUserSetPinButton();
        await timers.choosePasswordNav.measure(async () => {
          await waitForChoosePasswordContent();
        });
        performanceTracker.addTimer(timers.choosePasswordNav);
        await addAppScreenTtcTimer({
          performanceTracker,
          screenId: 'choose_pw',
          platform,
          threshold: SEEDLESS_APP_TTC_THRESHOLDS.choose_pw,
        });
      }

      if (isNewUser) {
        await CreatePasswordView.enterPassword(password);
        await CreatePasswordView.reEnterPassword(password);
        await AppiumGestures.hideKeyboard();
        try {
          await CreatePasswordView.ensureMarketingOptInChecked();
        } catch (error) {
          console.error('Error ensuring marketing opt-in checked:', error);
        }
        await AppiumGestures.hideKeyboard();
        await CreatePasswordView.tapCreatePasswordButton();
        await measureCreatePasswordToOnboardingSuccess(timers.createWalletFlow);
        performanceTracker.addTimer(timers.createWalletFlow);
        await addAppScreenTtcTimer({
          performanceTracker,
          screenId: 'onboarding_success',
          platform,
          threshold: SEEDLESS_APP_TTC_THRESHOLDS.onboarding_success,
        });

        await OnboardingSuccessView.tapDone();
        await dismissPushNotificationExistingUserSheet();
        await closePredictModal();
        await timers.walletChromeFlow.measure(async () => {
          await AppiumAssertions.expectElementToBeVisible(
            WalletView.accountIcon,
            {
              description: 'Wallet main screen should be visible',
            },
          );
        });
        performanceTracker.addTimer(timers.walletChromeFlow);
      } else {
        await SocialLoginView.tapAccountFoundLoginButton();
        await timers.rehydrateNav.measure(async () => {
          await waitForSocialRehydrateContent();
        });
        performanceTracker.addTimer(timers.rehydrateNav);
        await addAppScreenTtcTimer({
          performanceTracker,
          screenId: 'social_rehydrate',
          platform,
          threshold: SEEDLESS_APP_TTC_THRESHOLDS.social_rehydrate,
        });

        await LoginView.enterPassword(password);
        await LoginView.tapLoginButton();

        await timers.existingWalletFlow.measure(async () => {
          await AppiumAssertions.expectElementToBeVisible(
            WalletView.container,
            {
              description: 'Wallet main screen should be visible',
            },
          );
        });
        performanceTracker.addTimer(timers.existingWalletFlow);
      }
    },
  );
});
