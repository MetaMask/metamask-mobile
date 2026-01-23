import Assertions from '../../../tests/framework/Assertions';

import OnboardingView from '../../pages/Onboarding/OnboardingView';
import OnboardingSheet from '../../pages/Onboarding/OnboardingSheet';
import SocialLoginView from '../../pages/Onboarding/SocialLoginView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import MetaMetricsOptInView from '../../pages/Onboarding/MetaMetricsOptInView';
import ExperienceEnhancerBottomSheet from '../../pages/Onboarding/ExperienceEnhancerBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import TermsOfUseModal from '../../pages/Onboarding/TermsOfUseModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/wallet/LoginView';
import ForgotPasswordModal from '../../pages/Common/ForgotPasswordModalView';

export const TEST_PASSWORD = 'Test123!@#';

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
 */
export const lockApp = async (): Promise<void> => {
  await TabBarComponent.tapSettings();

  await SettingsView.tapLock();

  await SettingsView.tapYesAlertButton();

  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible after locking',
  });
};

/**
 * Unlocks the app by entering password
 */
export const unlockApp = async (
  password: string = TEST_PASSWORD,
): Promise<void> => {
  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible',
  });

  await LoginView.enterPassword(password);

  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet view should be visible after unlock',
    timeout: 15000,
  });
};

/**
 * Resets the wallet from the login screen
 */
export const resetWallet = async (): Promise<void> => {
  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible',
  });

  await LoginView.tapForgotPassword();

  await ForgotPasswordModal.tapResetWalletButton();

  await ForgotPasswordModal.tapYesResetWalletButton();

  await Assertions.expectElementToBeVisible(OnboardingView.container, {
    description: 'Onboarding screen should be visible after wallet reset',
  });
};
