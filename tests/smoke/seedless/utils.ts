import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../page-objects/Onboarding/SocialLoginView';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../page-objects/Onboarding/OnboardingSuccessView';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView';
import ExperienceEnhancerBottomSheet from '../../page-objects/Onboarding/ExperienceEnhancerBottomSheet';
import TermsOfUseModal from '../../page-objects/Onboarding/TermsOfUseModal';
import WalletView from '../../page-objects/wallet/WalletView';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import PredictGTMModal from '../../page-objects/Predict/PredictGTMModal';
import PerpsGTMModal from '../../page-objects/Perps/PerpsGTMModal';
import LoginView from '../../page-objects/wallet/LoginView';
import SettingsView from '../../page-objects/Settings/SettingsView';
import ForgotPasswordModal from '../../page-objects/Common/ForgotPasswordModalView';
import Utilities from '../../framework/Utilities';
import { expectWalletRouteReady, loginToApp } from '../../flows/wallet.flow';
import { dismissDevScreens, waitForAppReady } from '../../flows/general.flow';

export const TEST_PASSWORD = 'Test123!@#';

export const FIXTURE_PASSWORD = '123123123';

/**
 * Social login new user onboarding flow
 * @param provider - The login provider ('google' or 'apple')
 */
export const completeSocialLoginOnboarding = async (
  provider: 'google' | 'apple',
): Promise<void> => {
  await Assertions.expectElementToBeVisible(OnboardingView.container, {
    description: 'Onboarding screen should be visible',
  });

  await OnboardingView.tapCreateWallet();

  await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
    description: 'Onboarding sheet with social login options should appear',
  });

  // Tap the appropriate login button based on provider
  if (provider === 'google') {
    await OnboardingSheet.tapGoogleLoginButton();
  } else {
    await OnboardingSheet.tapAppleLoginButton();
  }

  const isIOS = device.getPlatform() === 'ios';

  if (isIOS) {
    await SocialLoginView.isIosNewUserScreenVisible();
    await SocialLoginView.tapIosNewUserSetPinButton();
  }

  await Assertions.expectElementToBeVisible(CreatePasswordView.container, {
    description: 'Password creation screen should be visible',
  });

  await CreatePasswordView.enterPassword(TEST_PASSWORD);
  await CreatePasswordView.reEnterPassword(TEST_PASSWORD);

  try {
    await TermsOfUseModal.tapAgreeCheckBox();
    await TermsOfUseModal.tapAcceptButton();
  } catch {
    // Terms modal may not appear in all flows
  }

  await CreatePasswordView.tapCreatePasswordButton();

  try {
    await Assertions.expectElementToBeVisible(MetaMetricsOptInView.container, {
      description: 'MetaMetrics opt-in screen',
      timeout: 10000,
    });
    await MetaMetricsOptInView.tapAgreeButton();
  } catch {
    // May not appear in all flows
  }

  try {
    await ExperienceEnhancerBottomSheet.tapIAgree();
  } catch {
    // May not appear in all flows
  }

  try {
    await Assertions.expectElementToBeVisible(OnboardingSuccessView.container, {
      description: 'Onboarding success screen should be visible',
      timeout: 30000,
    });
    await OnboardingSuccessView.tapDone();
  } catch {
    // May go directly to home in some flows
  }

  await PredictGTMModal.dismissIfVisible();
  await PerpsGTMModal.dismissIfVisible();

  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet view should be visible after onboarding',
    timeout: 30000,
  });
};

/**
 * Google new user onboarding flow
 */
export const completeGoogleNewUserOnboarding = (): Promise<void> =>
  completeSocialLoginOnboarding('google');

/**
 * Apple new user onboarding flow
 */
export const completeAppleNewUserOnboarding = (): Promise<void> =>
  completeSocialLoginOnboarding('apple');

/**
 * Locks the app from Settings
 *
 * iOS previously used terminateApp + launchApp here to mimic a cold start; that desynced
 * Metro from the running bundle and broke post-lock unlock (navigation never reached HomeNav).
 * Authentication.lockApp already resets navigation to the login screen.
 */
export const lockApp = async (): Promise<void> => {
  await TabBarComponent.tapSettings();

  await SettingsView.tapLock();

  await SettingsView.tapYesAlertButton();

  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible after locking',
    timeout: 30000,
  });
};

/**
 * Unlocks the app by entering password
 *
 * Uses the same submit path as regression change-password (enterPassword → newline → onSubmitEditing).
 * Avoids {@link loginToApp} here so we do not re-run waitForAppReady / wallet auto-unlock probes
 * after lockApp has already stabilized on the login screen; that extra logic was leaving Detox
 * on neither login nor wallet after a failed unlock attempt.
 */
export const unlockApp = async (
  password: string = TEST_PASSWORD,
): Promise<void> => {
  await Utilities.executeWithRetry(
    async () => {
      await dismissDevScreens();
      await waitForAppReady(25000, { allowUnlockedWallet: true });
      await PredictGTMModal.dismissIfVisible();
      await PerpsGTMModal.dismissIfVisible();

      await Assertions.expectElementToBeVisible(LoginView.container, {
        description: 'Login screen should be visible before unlock',
        timeout: 30000,
      });

      await LoginView.enterPassword(password);

      await dismissDevScreens();
      await PredictGTMModal.dismissIfVisible();
      await PerpsGTMModal.dismissIfVisible();

      await expectWalletRouteReady({
        timeout: 90000,
        description: 'Wallet route after unlock',
      });
      await Assertions.expectElementToBeVisible(WalletView.container, {
        description: 'Wallet container visible after unlock',
        timeout: 45000,
      });
    },
    {
      timeout: 180000,
      interval: 4000,
      description: 'unlock app after lock',
    },
  );
};

/**
 * Login with password
 */
export const loginWithPassword = async (
  password: string = FIXTURE_PASSWORD,
): Promise<void> => {
  await loginToApp(password);
};

/**
 * Resets the wallet from the login screen
 */
export const resetWallet = async (): Promise<void> => {
  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible',
    timeout: 30000,
  });

  await Gestures.swipe(LoginView.container, 'down', {
    elemDescription: 'Login container - dismiss keyboard',
  });

  await LoginView.tapForgotPassword();

  await ForgotPasswordModal.tapResetWalletButton();

  await ForgotPasswordModal.tapYesResetWalletButton();

  await Assertions.expectElementToBeVisible(OnboardingView.container, {
    description: 'Onboarding screen should be visible after wallet reset',
    timeout: 30000,
  });
};
