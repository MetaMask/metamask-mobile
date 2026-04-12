import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import { dismisspredictionsModalPlaywright } from '../../flows/wallet.flow';
import { PerformanceOnboarding } from '../../tags.performance.js';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../page-objects/Onboarding/SocialLoginView';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../page-objects/Onboarding/OnboardingSuccessView';
import PredictModalView from '../../page-objects/Predict/PredictModalView';
import WalletView from '../../page-objects/wallet/WalletView';
import LoginView from '../../page-objects/wallet/LoginView';

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
test.describe(PerformanceOnboarding, () => {
  test.setTimeout(240000);

  test(
    'Seedless Onboarding: Apple Login New User',
    { tag: '@metamask-onboarding-team' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      const timer1 = new TimerHelper(
        'Apple: Tap "Create new wallet" → OnboardingSheet visible',
        { ios: 1500, android: 2000 },
        currentDeviceDetails.platform,
      );
      const timer2 = new TimerHelper(
        'Apple: Tap Apple login → post-OAuth screen visible',
        { ios: 15000, android: 15000 },
        currentDeviceDetails.platform,
      );
      const timer3 = new TimerHelper(
        'Apple: Post-OAuth action → Password fields visible',
        { ios: 4000, android: 2000 },
        currentDeviceDetails.platform,
      );
      const timer4 = new TimerHelper(
        'Apple: Tap "Create Password" → Onboarding Success visible',
        { ios: 5000, android: 5000 },
        currentDeviceDetails.platform,
      );
      const timer5 = new TimerHelper(
        'Apple: Tap "Done" → feature sheet visible',
        { ios: 2500, android: 3100 },
        currentDeviceDetails.platform,
      );
      const timer6 = new TimerHelper(
        'Apple: Dismiss feature sheet → wallet main screen visible',
        { ios: 30000, android: 30000 },
        currentDeviceDetails.platform,
      );

      const password = getPasswordForScenario('onboarding') ?? '';

      await OnboardingView.tapCreateNewWalletButton();
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(OnboardingSheet.appleLoginButton),
          {
            description: 'Apple login button should be visible',
          },
        );
      });

      await OnboardingSheet.tapAppleLoginButton();

      let isNewUser = true;

      if (currentDeviceDetails.platform === 'ios') {
        await timer2.measure(async () => {
          const result = await waitForFirstSuccessful([
            SocialLoginView.isIosNewUserScreenVisible().then(() => 'new_user'),
            SocialLoginView.isAccountFoundScreenVisible().then(
              () => 'existing_user',
            ),
          ]);
          isNewUser = result === 'new_user';
        });

        if (isNewUser) {
          await SocialLoginView.tapIosNewUserSetPinButton();
          await timer3.measure(async () => {
            await CreatePasswordView.isVisible();
          });
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
        });
      }

      if (isNewUser) {
        await CreatePasswordView.enterPassword(password);
        await CreatePasswordView.reEnterPassword(password);
        await CreatePasswordView.tapIUnderstandCheckBox();
        await CreatePasswordView.tapCreatePasswordButton();

        await timer4.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(OnboardingSuccessView.doneButton),
            {
              description: 'Onboarding success done button should be visible',
            },
          );
        });

        await OnboardingSuccessView.tapDone();
        await timer5.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(PredictModalView.notNowButton),
            {
              timeout: 10000,
              description: 'Predict modal should be visible',
            },
          );
        });

        await dismisspredictionsModalPlaywright();
        await timer6.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(WalletView.container),
            {
              timeout: 30000,
              description: 'Wallet main screen should be visible',
            },
          );
        });

        const timers = [timer1, timer2, timer4, timer5, timer6];
        if (currentDeviceDetails.platform === 'ios') {
          timers.splice(2, 0, timer3);
        }
        performanceTracker.addTimers(...timers);
      } else {
        await SocialLoginView.tapAccountFoundLoginButton();
        await timer3.measure(async () => {
          await LoginView.waitForScreenToDisplay();
        });

        await LoginView.enterPassword(password);
        await LoginView.tapLoginButton();

        await timer4.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(WalletView.container),
            {
              timeout: 30000,
              description: 'Wallet main screen should be visible',
            },
          );
        });

        performanceTracker.addTimers(timer1, timer2, timer3, timer4);
      }
    },
  );
});
