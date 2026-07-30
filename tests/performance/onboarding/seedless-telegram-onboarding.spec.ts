import { test as perfTest } from '../../framework/fixtures/playwright';
import TimerHelper from '../../framework/TimerHelper';
import {
  asPlaywrightElement,
  PlaywrightAssertions,
  PlaywrightGestures,
} from '../../framework';
import { getPasswordForScenario } from '../../framework/utils/TestConstants.js';
import {
  dismissOnboardingInterestQuestionnaire,
  dismisspredictionsModalPlaywright,
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

const assertTelegramLoginReady = async (): Promise<void> => {
  try {
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(OnboardingSheet.telegramLoginButton),
      {
        description: 'Telegram login button should be visible',
      },
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    // Missing button is a build/flag setup failure, not a timer regression.
    throw new Error(
      [
        'TO-916 setup failure: Telegram login button was not visible on the onboarding sheet.',
        'Prerequisites:',
        '- telegram_login_enabled must be true (e2e/test LaunchDarkly env defaults to false;',
        '  without-srp performance builds bake MM_TELEGRAM_LOGIN_ENABLED=true)',
        '- E2E_MOCK_OAUTH without-srp BrowserStack build (QA mock credentials) must be installed',
        `Original error: ${details}`,
      ].join(' '),
    );
  }
};

/* TO-916: Seedless Onboarding — Telegram Login */
perfTest.describe(`${Performance} ${System} ${PerformanceOnboarding}`, () => {
  perfTest.setTimeout(240000);

  perfTest(
    'Seedless Onboarding: Telegram Login New User',
    { tag: '@metamask-onboarding-team' },
    // Request `driver` so the Playwright/Appium fixture boots before page-object
    // actions run. Without it, FrameworkDetector falls back to Detox and
    // Matchers throw ReferenceError: element is not defined.
    async ({ currentDeviceDetails, driver, performanceTracker }) => {
      // Conservative initial guardrails — calibrate against BrowserStack
      // baselines once this coverage has 10+ clean RC/release-profile runs
      // (see TO-916 acceptance criteria for p50/p95 documentation).
      const timer1 = new TimerHelper(
        'Telegram: Tap "Create new wallet" → OnboardingSheet visible',
        { ios: 1500, android: 2000 },
        currentDeviceDetails.platform,
      );
      const timer2 = new TimerHelper(
        'Telegram: Tap Telegram login → post-OAuth screen visible',
        { ios: 15000, android: 5000 },
        currentDeviceDetails.platform,
      );
      const timer3 = new TimerHelper(
        'Telegram: Post-OAuth action → Password fields visible',
        { ios: 4000, android: 4000 },
        currentDeviceDetails.platform,
      );
      const timer4 = new TimerHelper(
        'Telegram: Tap "Create Password" → Onboarding Success visible',
        { ios: 5000, android: 6000 },
        currentDeviceDetails.platform,
      );
      const timer5 = new TimerHelper(
        'Telegram: Tap "Done" → feature sheet visible',
        { ios: 2500, android: 5000 },
        currentDeviceDetails.platform,
      );
      const timer6 = new TimerHelper(
        'Telegram: Dismiss feature sheet → wallet main screen visible',
        { ios: 30000, android: 5000 },
        currentDeviceDetails.platform,
      );

      const password = getPasswordForScenario('onboarding') ?? '';
      if (!password) {
        throw new Error(
          'TO-916 setup failure: onboarding password credential is missing from TestConstants',
        );
      }

      await OnboardingView.tapCreateNewWalletButton();
      await timer1.measure(async () => {
        await assertTelegramLoginReady();
      });

      await OnboardingSheet.tapTelegramLoginButton();
      await SocialLoginView.dismissUpdateModalIfPresent();

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
        // Password entry is excluded from measured steps (manual auth/typing).
        await CreatePasswordView.enterPassword(password);
        await CreatePasswordView.reEnterPassword(password);
        await PlaywrightGestures.hideKeyboard();
        try {
          await CreatePasswordView.ensureMarketingOptInChecked();
        } catch (error) {
          console.error('Error ensuring marketing opt-in checked:', error);
        }
        await CreatePasswordView.tapCreatePasswordButton();

        await timer4.measure(async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            asPlaywrightElement(OnboardingSuccessView.doneButton),
            {
              description: 'Onboarding success done button should be visible',
            },
          );
        });

        await dismissOnboardingInterestQuestionnaire();
        await OnboardingSuccessView.tapDone();
        await dismissPushNotificationExistingUserSheet();
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
            asPlaywrightElement(WalletView.accountIcon), // Workaround until iOS nested component gets fixed
            {
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
        // Existing-user rehydration when the QA mock / account returns Account Found.
        // E2E_MOCK_OAUTH QA mock currently forces new-user results; keep this path
        // so existing-user coverage activates when test account/setup permits.
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
              description: 'Wallet main screen should be visible',
            },
          );
        });

        performanceTracker.addTimers(timer1, timer2, timer3, timer4);
      }
    },
  );
});
