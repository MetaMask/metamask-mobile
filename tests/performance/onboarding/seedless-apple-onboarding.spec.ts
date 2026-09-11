import { test } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
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
import { measureCreatePasswordToOnboardingSuccess } from './helpers/seedlessOnboardingTimers';
import { captureOnboardingTtc } from './helpers/captureOnboardingTtc';
import type { OnboardingScreenId } from '../../../app/hooks/performance/onboardingPerformanceIds';

const waitForFirstSuccessful = async <T>(promises: Promise<T>[]): Promise<T> =>
  await new Promise<T>((resolve, reject) => {
    let rejectedCount = 0;

    promises.forEach((promise) => {
      promise.then(resolve).catch(() => {
        rejectedCount += 1;
        if (rejectedCount === promises.length) {
          reject(new Error('All screen detection promises failed'));
        }
      });
    });
  });

/* Seedless Onboarding: Apple Login */
test.describe(`${Performance} ${System} ${PerformanceOnboarding}`, () => {
  test.setTimeout(360000);

  test(
    'Seedless Onboarding: Apple Login New User',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      const platform = currentDeviceDetails.platform;
      const timer1 = new TimerHelper(
        'Apple: Tap "Create new wallet" → OnboardingSheet visible',
        { ios: 1500, android: 2000 },
        platform,
      );
      const timer2 = new TimerHelper(
        'Apple: Tap Apple login → post-OAuth screen visible',
        { ios: 15000, android: 6000 },
        platform,
      );
      const timer3 = new TimerHelper(
        'Apple: Post-OAuth action → Password fields visible',
        { ios: 5000, android: 4000 },
        platform,
      );
      const timer4 = new TimerHelper(
        'Apple: Tap "Create Password" → Onboarding Success visible',
        { ios: 5000, android: 4000 },
        platform,
      );
      const timer5 = new TimerHelper(
        'Apple: Tap "Done" → wallet main screen visible',
        { ios: 30000, android: 5000 },
        platform,
      );

      const password = getPasswordForScenario('onboarding') ?? '';

      await OnboardingView.tapCreateNewWalletButton();
      await timer1.measure(async () => {
        await AppiumAssertions.expectElementToBeVisible(
          OnboardingSheet.appleLoginButton,
          {
            description: 'Apple login button should be visible',
          },
        );
      });
      await captureOnboardingTtc(
        performanceTracker,
        'onboarding_sheet',
        platform,
      );

      await OnboardingSheet.tapAppleLoginButton();
      await SocialLoginView.dismissUpdateModalIfPresent();

      let isNewUser = true;
      let postOauthScreen: OnboardingScreenId = 'choose_pw';

      if (platform === 'ios') {
        await timer2.measure(async () => {
          const result = await waitForFirstSuccessful([
            SocialLoginView.isIosNewUserScreenVisible().then(() => 'new_user'),
            SocialLoginView.isAccountFoundScreenVisible().then(
              () => 'existing_user',
            ),
          ]);
          isNewUser = result === 'new_user';
          postOauthScreen =
            result === 'new_user'
              ? 'social_login_success_new_user'
              : 'account_already_exists';
        });
        await captureOnboardingTtc(
          performanceTracker,
          postOauthScreen,
          platform,
        );

        if (isNewUser) {
          await SocialLoginView.tapIosNewUserSetPinButton();
          await timer3.measure(async () => {
            await CreatePasswordView.isVisible();
          });
          await captureOnboardingTtc(performanceTracker, 'choose_pw', platform);
        }
      } else {
        await timer2.measure(async () => {
          const result = await waitForFirstSuccessful([
            CreatePasswordView.isVisible().then(() => 'new_user'),
            SocialLoginView.isAccountFoundScreenVisible().then(
              () => 'existing_user',
            ),
          ]);
          isNewUser = result === 'new_user';
          postOauthScreen =
            result === 'new_user' ? 'choose_pw' : 'account_already_exists';
        });
        await captureOnboardingTtc(
          performanceTracker,
          postOauthScreen,
          platform,
        );
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
        await measureCreatePasswordToOnboardingSuccess(timer4);
        await captureOnboardingTtc(
          performanceTracker,
          'onboarding_success',
          platform,
        );

        await OnboardingSuccessView.tapDone();
        await dismissPushNotificationExistingUserSheet();
        await closePredictModal();
        await timer5.measure(async () => {
          await AppiumAssertions.expectElementToBeVisible(
            WalletView.accountIcon, // Workaround until iOS nested component gets fixed
            {
              description: 'Wallet main screen should be visible',
            },
          );
        });

        const timers = [timer1, timer2, timer4, timer5];
        if (platform === 'ios') {
          timers.splice(2, 0, timer3);
        }
        performanceTracker.addTimers(...timers);
      } else {
        await SocialLoginView.tapAccountFoundLoginButton();
        await timer3.measure(async () => {
          await LoginView.waitForScreenToDisplay();
        });
        await captureOnboardingTtc(
          performanceTracker,
          'social_rehydrate',
          platform,
        );

        await LoginView.enterPassword(password);
        await LoginView.tapLoginButton();

        await timer4.measure(async () => {
          await AppiumAssertions.expectElementToBeVisible(
            WalletView.container,
            {
              description: 'Wallet main screen should be visible',
            },
          );
        });

        performanceTracker.addTimers(timer1, timer2, timer3, timer4);
      }
    },
  );
});
