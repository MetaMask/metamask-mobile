import Assertions from '../../../tests/framework/Assertions';
import Gestures from '../../../tests/framework/Gestures';
import {
  getFixturesServerPort,
  getMockServerPortForFixture,
} from '../../../tests/framework/fixtures/FixtureUtils';

import OnboardingView from '../../../tests/page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../../tests/page-objects/Onboarding/OnboardingSheet';
import SocialLoginView from '../../../tests/page-objects/Onboarding/SocialLoginView';
import CreatePasswordView from '../../../tests/page-objects/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../../../tests/page-objects/Onboarding/OnboardingSuccessView';
import MetaMetricsOptInView from '../../../tests/page-objects/Onboarding/MetaMetricsOptInView';
import ExperienceEnhancerBottomSheet from '../../../tests/page-objects/Onboarding/ExperienceEnhancerBottomSheet';
import TermsOfUseModal from '../../../tests/page-objects/Onboarding/TermsOfUseModal';
import WalletView from '../../../tests/page-objects/wallet/WalletView';
import TabBarComponent from '../../../tests/page-objects/wallet/TabBarComponent';
import LoginView from '../../../tests/page-objects/wallet/LoginView';
import SettingsView from '../../../tests/page-objects/Settings/SettingsView';
import ForgotPasswordModal from '../../../tests/page-objects/Common/ForgotPasswordModalView';
import { loginToApp } from '../../../tests/flows/wallet.flow';
import {
  dismissDevScreens,
  waitForAppReady,
} from '../../../tests/flows/general.flow';

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

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Locks the app from Settings
 */
export const lockApp = async (): Promise<void> => {
  await TabBarComponent.tapSettings();

  await SettingsView.tapLock();

  await SettingsView.tapYesAlertButton();

  const isIOS = device.getPlatform() === 'ios';

  if (isIOS) {
    await delay(1000);

    await device.terminateApp();
    await device.launchApp({
      newInstance: false,
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort: `${getMockServerPortForFixture()}`,
      },
    });

    await dismissDevScreens();
    await waitForAppReady();
  }

  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible after locking',
    timeout: 30000,
  });
};

/**
 * Unlocks the app by entering password
 */
export const unlockApp = async (
  password: string = TEST_PASSWORD,
): Promise<void> => {
  await loginToApp(password);
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
