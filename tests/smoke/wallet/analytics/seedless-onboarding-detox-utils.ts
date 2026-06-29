import Assertions from '../../../framework/Assertions';

import OnboardingView from '../../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../../page-objects/Onboarding/SocialLoginView';
import CreatePasswordView from '../../../page-objects/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../../page-objects/Onboarding/OnboardingSuccessView';
import MetaMetricsOptInView from '../../../page-objects/Onboarding/MetaMetricsOptInView';
import ExperienceEnhancerBottomSheet from '../../../page-objects/Onboarding/ExperienceEnhancerBottomSheet';
import TermsOfUseModal from '../../../page-objects/Onboarding/TermsOfUseModal';
import WalletView from '../../../page-objects/wallet/WalletView';

export const TEST_PASSWORD = 'Test123!@#';

/**
 * Social login new user onboarding flow (Detox).
 * Used by wallet analytics specs that exercise seedless onboarding.
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

  await CreatePasswordView.tapIUnderstandCheckBox();

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

export const completeGoogleNewUserOnboarding = (): Promise<void> =>
  completeSocialLoginOnboarding('google');

export const completeAppleNewUserOnboarding = (): Promise<void> =>
  completeSocialLoginOnboarding('apple');
