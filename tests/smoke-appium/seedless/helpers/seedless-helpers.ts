import type { Mockttp } from 'mockttp';

import Assertions from '../../../framework/Assertions.js';
import Gestures from '../../../framework/Gestures.js';
import { PlatformDetector } from '../../../framework/PlatformLocator.js';
import { asPlaywrightElement } from '../../../framework/EncapsulatedElement.js';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions.js';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers.js';
import { sleep } from '../../../framework/Utilities.js';
import {
  getDriver,
  withImplicitWait,
} from '../../../framework/PlaywrightUtilities.js';
import { ChoosePasswordSelectorsIDs } from '../../../../app/components/Views/ChoosePassword/ChoosePassword.testIds.js';
import { OnboardingSelectorIDs } from '../../../../app/components/Views/Onboarding/Onboarding.testIds.js';
import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding/index.js';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth/index.js';
import { resolveE2EWaitTimeoutMs } from '../../../framework/Constants.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { remoteFeaturePredictGtmOnboardingModalDisabled } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  dismissExperienceEnhancerModal,
  dismisspredictionsModalPlaywright,
  dismissPushNotificationExistingUserSheet,
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../../flows/wallet.flow.js';

import OnboardingView from '../../../page-objects/Onboarding/OnboardingView.js';
import OnboardingSheet from '../../../page-objects/Onboarding/OnboardingSheet.js';
import SocialLoginView from '../../../page-objects/Onboarding/SocialLoginView.js';
import CreatePasswordView from '../../../page-objects/Onboarding/CreatePasswordView.js';
import OnboardingSuccessView from '../../../page-objects/Onboarding/OnboardingSuccessView.js';
import MetaMetricsOptInView from '../../../page-objects/Onboarding/MetaMetricsOptInView.js';
import ExperienceEnhancerBottomSheet from '../../../page-objects/Onboarding/ExperienceEnhancerBottomSheet.js';
import OnboardingInterestQuestionnaireView from '../../../page-objects/Onboarding/OnboardingInterestQuestionnaireView.js';
import TermsOfUseModal from '../../../page-objects/Onboarding/TermsOfUseModal.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import LoginView from '../../../page-objects/wallet/LoginView.js';
import AccountMenu from '../../../page-objects/AccountMenu/AccountMenu.js';
import SettingsView from '../../../page-objects/Settings/SettingsView.js';
import ForgotPasswordModal from '../../../page-objects/Common/ForgotPasswordModalView.js';
import { CommonSelectorsText } from '../../../../app/util/Common.testIds.js';

export const TEST_PASSWORD = 'Test123!@#';

export const FIXTURE_PASSWORD = '123123123';

const IOS_CREATE_PASSWORD_INDICATOR_IDS = [
  ChoosePasswordSelectorsIDs.CONTAINER_ID,
  ChoosePasswordSelectorsIDs.TITLE_ID,
  ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
] as const;

const CREATE_PASSWORD_POLL_INTERVAL_MS = 250;

const IOS_ONBOARDING_INDICATOR_IDS = [
  OnboardingSelectorIDs.CONTAINER_ID,
  OnboardingSelectorIDs.NEW_WALLET_BUTTON,
  OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
  OnboardingSelectorIDs.SCREEN_TITLE,
] as const;

const isOnboardingIndicatorVisible = async (
  testId: string,
): Promise<boolean> => {
  try {
    return await withImplicitWait(500, async () => {
      const el = await PlaywrightMatchers.getElementById(testId, {
        exact: true,
      });
      return await el.isVisible();
    });
  } catch {
    return false;
  }
};

/**
 * Waits for the onboarding screen after cold launch.
 * On iOS the container can exist while child CTAs are the reliable signal.
 */
const waitForOnboardingScreenPlaywright = async (
  timeout: number = resolveE2EWaitTimeoutMs(60_000),
): Promise<void> => {
  if (PlatformDetector.isAndroid()) {
    await Assertions.expectElementToBeVisible(OnboardingView.container, {
      description: 'Onboarding screen should be visible',
      timeout,
    });
    return;
  }

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const testId of IOS_ONBOARDING_INDICATOR_IDS) {
      if (await isOnboardingIndicatorVisible(testId)) {
        return;
      }
    }
    await sleep(CREATE_PASSWORD_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Onboarding screen not ready within ${timeout}ms (iOS onboarding indicators not satisfied)`,
  );
};

const isCreatePasswordIndicatorVisible = async (
  testId: string,
): Promise<boolean> => {
  try {
    return await withImplicitWait(500, async () => {
      const el = await PlaywrightMatchers.getElementById(testId, {
        exact: true,
      });
      return await el.isVisible();
    });
  } catch {
    return false;
  }
};

/**
 * Waits for the create-password step after social login.
 * On iOS the container can exist while child fields are the reliable signal.
 */
const waitForCreatePasswordScreenPlaywright = async (
  timeout: number = resolveE2EWaitTimeoutMs(60_000),
): Promise<void> => {
  if (PlatformDetector.isAndroid()) {
    await Assertions.expectElementToBeVisible(CreatePasswordView.container, {
      description: 'Password creation screen should be visible',
      timeout,
    });
    return;
  }

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const testId of IOS_CREATE_PASSWORD_INDICATOR_IDS) {
      if (await isCreatePasswordIndicatorVisible(testId)) {
        return;
      }
    }
    await sleep(CREATE_PASSWORD_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Create password screen not ready within ${timeout}ms (iOS create-password indicators not satisfied)`,
  );
};

/**
 * Disable Predict GTM full-screen modal so post-onboarding actions (accounts
 * menu → lock) are not blocked. Matches qr-sync / add-srp seedless smoke setup.
 */
const disablePredictGtmOnboardingModal = async (
  mockServer: Mockttp,
): Promise<void> => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeaturePredictGtmOnboardingModalDisabled(),
  });
};

export async function setupGoogleNewUserOAuthMock(
  mockServer: Mockttp,
): Promise<void> {
  E2EOAuthHelpers.reset();
  E2EOAuthHelpers.configureGoogleNewUser();
  const oAuthMockttpService = createOAuthMockttpService();
  oAuthMockttpService.configureGoogleNewUser();
  await oAuthMockttpService.setup(mockServer);
  await disablePredictGtmOnboardingModal(mockServer);
}

export async function setupGoogleExistingUserOAuthMock(
  mockServer: Mockttp,
): Promise<void> {
  E2EOAuthHelpers.reset();
  E2EOAuthHelpers.configureGoogleExistingUser();
  const oAuthMockttpService = createOAuthMockttpService();
  oAuthMockttpService.configureGoogleExistingUser();
  await oAuthMockttpService.setup(mockServer);
}

export async function setupAppleNewUserOAuthMock(
  mockServer: Mockttp,
): Promise<void> {
  E2EOAuthHelpers.reset();
  E2EOAuthHelpers.configureAppleNewUser();
  const oAuthMockttpService = createOAuthMockttpService();
  oAuthMockttpService.configureAppleNewUser();
  await oAuthMockttpService.setup(mockServer);
  await disablePredictGtmOnboardingModal(mockServer);
}

export async function setupAppleExistingUserOAuthMock(
  mockServer: Mockttp,
): Promise<void> {
  E2EOAuthHelpers.reset();
  E2EOAuthHelpers.configureAppleExistingUser();
  const oAuthMockttpService = createOAuthMockttpService();
  oAuthMockttpService.configureAppleExistingUser();
  await oAuthMockttpService.setup(mockServer);
}

/**
 * Social login new user onboarding flow (Appium smoke).
 */
export const completeSocialLoginOnboarding = async (
  provider: 'google' | 'apple',
): Promise<void> => {
  await waitForOnboardingScreenPlaywright(resolveE2EWaitTimeoutMs(60_000));

  await OnboardingView.tapCreateWallet();

  await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
    description: 'Onboarding sheet with social login options should appear',
  });

  if (provider === 'google') {
    await OnboardingSheet.tapGoogleLoginButton();
  } else {
    await OnboardingSheet.tapAppleLoginButton();
  }

  if (PlatformDetector.isIOS()) {
    await SocialLoginView.isIosNewUserScreenVisible();
    await SocialLoginView.tapIosNewUserSetPinButton();
  }

  await waitForCreatePasswordScreenPlaywright(resolveE2EWaitTimeoutMs(60_000));

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
    await Assertions.expectElementToBeVisible(
      OnboardingInterestQuestionnaireView.container,
      {
        description: 'Interest questionnaire may appear based on rollout',
        timeout: 5000,
      },
    );
    await OnboardingInterestQuestionnaireView.tapSkipButton();
  } catch {
    // Only appears for ~25% of users based on deterministic rollout
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

  // iOS may have wallet-screen in the tree with displayed === false while child
  // indicators (wallet-header-root, etc.) are visible — same check as login flows.
  await dismissPushNotificationExistingUserSheet();
  await dismissExperienceEnhancerModal();
  await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(60_000));
  // Predict GTM can still appear if remote flags race the mock; dismiss if present
  // so accounts-menu → lock is not blocked (Android lock/unlock / reset smokes).
  await dismisspredictionsModalPlaywright();
};

export const completeGoogleNewUserOnboarding = (): Promise<void> =>
  completeSocialLoginOnboarding('google');

export const completeAppleNewUserOnboarding = (): Promise<void> =>
  completeSocialLoginOnboarding('apple');

/**
 * Confirms the native lock alert. On iOS the YES button can go stale before
 * XPath-based taps complete, so we use Appium's alert API when available.
 */
const confirmLockAlert = async (): Promise<void> => {
  const isLoginVisible = async (): Promise<boolean> => {
    try {
      await Assertions.expectElementToBeVisible(LoginView.container, {
        description: 'Login screen after lock',
        timeout: 1_000,
      });
      return true;
    } catch {
      return false;
    }
  };

  if (await isLoginVisible()) {
    return;
  }

  if (PlatformDetector.isIOS()) {
    const appiumDriver = getDriver();
    const yesLabel = CommonSelectorsText.YES_ALERT_BUTTON;

    try {
      const buttons = (await appiumDriver.execute('mobile: alert', {
        action: 'getButtons',
      })) as string[];
      const hasYes = buttons.some(
        (label) => label.toUpperCase() === yesLabel.toUpperCase(),
      );
      if (hasYes) {
        // XCUITest driver supports accept/dismiss — accept maps to the
        // confirmation button (YES) for RN Alert with cancel + OK ordering.
        await appiumDriver.execute('mobile: alert', { action: 'accept' });
        return;
      }
    } catch {
      // Fall through to element-based tap.
    }
  }

  if (await isLoginVisible()) {
    return;
  }

  await SettingsView.tapYesAlertButton();
};

/**
 * Locks the app from Settings.
 */
export const lockApp = async (): Promise<void> => {
  await TabBarComponent.tapAccountsMenu();

  await AccountMenu.tapLock();

  await confirmLockAlert();

  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login screen should be visible after locking',
    timeout: 30000,
  });
};

/**
 * Unlocks the app by entering password (Appium smoke).
 */
export const unlockApp = async (
  password: string = TEST_PASSWORD,
): Promise<void> => {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(LoginView.container),
    {
      description: 'Login screen should be visible before unlock',
      timeout: 30_000,
    },
  );
  await LoginView.enterPassword(password);
  await LoginView.tapLoginButton();
  await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(60_000));
};

/**
 * Login with fixture password for pre-seeded wallet state.
 */
export const loginWithFixturePassword = async (): Promise<void> => {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
};

/**
 * Resets the wallet from the login screen.
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
