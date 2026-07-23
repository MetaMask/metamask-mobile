import WalletView from '../page-objects/wallet/WalletView';
import NetworkView from '../page-objects/Settings/NetworksView';
import {
  createLogger,
  encapsulated,
  FrameworkDetector,
  Matchers,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
  PortManager,
  ResourceType,
  sleep,
  Utilities,
} from '../framework';
import Assertions from '../framework/Assertions';
import {
  asDetoxElement,
  asPlaywrightElement,
} from '../framework/EncapsulatedElement';
import NetworkEducationModal from '../page-objects/Network/NetworkEducationModal';
import {
  getAnvilPortForFixture,
  getGanachePortForFixture,
} from '../framework/fixtures/FixtureUtils';
import TermsOfUseModal from '../page-objects/Onboarding/TermsOfUseModal';
import CreatePasswordView from '../page-objects/Onboarding/CreatePasswordView';
import ImportWalletView from '../page-objects/Onboarding/ImportWalletView';
import OnboardingView from '../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../page-objects/Onboarding/OnboardingSheet';
import Accounts from '../utils/Accounts';
import EnableDeviceNotificationsAlert from '../page-objects/Onboarding/EnableDeviceNotificationsAlert';
import ProtectYourWalletModal from '../page-objects/Onboarding/ProtectYourWalletModal';
import SkipAccountSecurityModal from '../page-objects/Onboarding/SkipAccountSecurityModal';
import ManualBackupStep1View from '../page-objects/Onboarding/ManualBackupStep1View';
import NetworkListModal from '../page-objects/Network/NetworkListModal';
import { CustomNetworks } from '../resources/networks.e2e';
import ToastModal from '../page-objects/wallet/ToastModal';
import {
  dismissAndroidSystemOverlaysPlaywright,
  dismissDeveloperMenuPlaywright,
  waitForAppReady,
} from './general.flow';
import LoginView from '../page-objects/wallet/LoginView';
import { getPasswordForScenario } from '../framework/utils/TestConstants';
import { resolveE2EWaitTimeoutMs } from '../framework/Constants';
import PlaywrightUtilities, {
  getDriver,
} from '../framework/PlaywrightUtilities';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import MetaMetricsOptInView from '../page-objects/Onboarding/MetaMetricsOptInView';
import PredictModalView from '../page-objects/Predict/PredictModalView';
import OnboardingInterestQuestionnaireView from '../page-objects/Onboarding/OnboardingInterestQuestionnaireView';
import ExperienceEnhancerBottomSheet from '../page-objects/Onboarding/ExperienceEnhancerBottomSheet';
import { fetchProductionFeatureFlags } from '../performance/feature-flag-helper';
import { ExistingUserSheetSelectorsIDs } from '../../app/components/Views/Notifications/PushNotificationOnboarding/ExistingUserSheet/ExistingUserSheet.testIds';
import {
  isLoginScreenDisplayed,
  isWalletHomeReadyOnAndroidStable,
  isWalletHomeReadyOnAppium,
  isWalletHomeReadyOnIOS,
} from './wallet-home-readiness';

const logger = createLogger({
  name: 'WalletFlow',
});

const WALLET_HOME_POLL_INTERVAL_MS = 250;

/**
 * Waits for the wallet home screen to be ready after login.
 * On iOS, `wallet-screen` may exist but report `displayed === false` while
 * child indicators are visible — mirrors Detox `toExist` readiness checks.
 */
export const waitForWalletHomePlaywright = async (
  timeout: number = resolveE2EWaitTimeoutMs(30_000),
): Promise<void> => {
  if (PlatformDetector.isAndroid()) {
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(WalletView.container),
      {
        description: 'Wallet should be visible',
        timeout,
      },
    );
    return;
  }

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await isWalletHomeReadyOnIOS()) {
      logger.debug('Wallet home ready on iOS');
      return;
    }
    await sleep(WALLET_HOME_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Wallet home not ready within ${timeout}ms (iOS wallet readiness indicators not satisfied)`,
  );
};

const isUnlockedWalletHomeReady = async (): Promise<boolean> => {
  if (FrameworkDetector.isAppium() && PlatformDetector.isAndroid()) {
    return isWalletHomeReadyOnAndroidStable();
  }
  if (!(await isWalletHomeReadyOnAppium())) {
    return false;
  }
  return !(await isLoginScreenDisplayed());
};

const completeUnlockedWalletHome = async (
  dismissPostLoginModals: () => Promise<void>,
): Promise<void> => {
  await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));
  await dismissPostLoginModals();
};

/**
 * Opens the account list when nested navigation (e.g. AddressList / AccountDetails)
 * may have hidden the tab bar or wallet chrome. Backs out until wallet home or
 * the list is reachable, then taps the identicon if needed.
 */
export const ensureAccountListOpenPlaywright = async (
  timeout: number = resolveE2EWaitTimeoutMs(30_000),
): Promise<void> => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
        { timeout: 1_500, description: 'Account list' },
      );
      return;
    } catch {
      // list not visible yet
    }

    if (PlatformDetector.isAndroid() || (await isWalletHomeReadyOnIOS())) {
      await WalletView.tapIdenticon();
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
        {
          timeout: resolveE2EWaitTimeoutMs(10_000),
          description: 'Account list should open from wallet home',
        },
      );
      return;
    }

    try {
      await getDriver().back();
    } catch {
      // ignore transient back failures
    }
    await sleep(300);
  }

  throw new Error(`Account list not open within ${timeout}ms`);
};

/**
 * Returns to wallet home from nested account flows (AddressList, AccountDetails,
 * or an account-list overlay that hides wallet chrome).
 */
export const dismissToWalletHomePlaywright = async (
  timeout: number = resolveE2EWaitTimeoutMs(60_000),
): Promise<void> => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (PlatformDetector.isAndroid() || (await isWalletHomeReadyOnIOS())) {
      return;
    }

    try {
      await Assertions.expectElementToBeVisible(
        AccountListBottomSheet.accountList,
        { timeout: 1_500, description: 'Account list overlay' },
      );
      await getDriver().back();
      await sleep(500);
      continue;
    } catch {
      // not showing account list
    }

    try {
      await getDriver().back();
    } catch {
      // ignore transient back failures
    }
    await sleep(300);
  }

  throw new Error(`Wallet home not reached within ${timeout}ms`);
};

const validAccount = Accounts.getValidAccount();
const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true' ||
  process.env.SEEDLESS_ONBOARDING_ENABLED === undefined;
const testEnvironment = process.env.E2E_PERFORMANCE_BUILD_VARIANT || 'rc';

/**
 * Gets the localhost URL for Ganache/Anvil network connection.
 * Must be called at runtime (not at module load time) to ensure port is allocated.
 */
const getLocalhostUrl = () => {
  // Check which local node is running
  const anvilPort = PortManager.getInstance().getPort(ResourceType.ANVIL);
  const ganachePort = PortManager.getInstance().getPort(ResourceType.GANACHE);

  let port: number;

  if (device.getPlatform() === 'android') {
    // Android: Must use fallback port (adb reverse maps fallback→actual)
    // Example: adb reverse tcp:8545 tcp:45466 means device connects to 8545, reaches host's 45466
    port = anvilPort
      ? getAnvilPortForFixture()
      : ganachePort
        ? getGanachePortForFixture()
        : getAnvilPortForFixture();
  } else {
    // iOS: Use actual allocated port directly (no port forwarding needed)
    port = anvilPort || ganachePort || getAnvilPortForFixture();
  }

  return `http://localhost:${port}/`;
};

/**
 * Adds the Localhost network to the user's network list.
 *
 * @async
 * @function addLocalhostNetwork
 * @returns {Promise<void>} Resolves when the Localhost network is added to the user's network list.
 */
export const addLocalhostNetwork = async (): Promise<void> => {
  // Access network list from wallet view (network switcher)
  await WalletView.tapNetworksButtonOnNavBar();

  await Assertions.expectElementToBeVisible(NetworkView.networkContainer, {
    description: 'Network Container should be visible',
  });

  await NetworkView.tapAddNetworkButton();
  await NetworkView.switchToCustomNetworks();

  await NetworkView.typeInNetworkName('Localhost');
  await NetworkView.typeInRpcUrl(getLocalhostUrl());
  await NetworkView.typeInChainId('1337');
  await NetworkView.typeInNetworkSymbol('ETH\n');

  if (device.getPlatform() === 'ios') {
    // await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
    await NetworkView.tapRpcNetworkAddButton();
  }

  await Assertions.expectElementToBeVisible(NetworkEducationModal.container, {
    description: 'Network Education Modal should be visible',
  });
  await Assertions.expectElementToHaveText(
    asDetoxElement(NetworkEducationModal.networkName),
    'Localhost',
    {
      description: 'Network Name should be Localhost',
    },
  );
  await NetworkEducationModal.tapGotItButton();
  await Assertions.expectElementToNotBeVisible(
    NetworkEducationModal.container,
    {
      description: 'Network Education Modal should not be visible',
    },
  );
};

/**
 * Accepts the terms of use modal.
 * @async
 * @function acceptTermOfUse
 * @returns {Promise<void>} Resolves when the terms of use modal is accepted.
 */
export const acceptTermOfUse: () => Promise<void> = async () => {
  // tap on accept term of use screen
  await Assertions.expectElementToBeVisible(TermsOfUseModal.container, {
    description: 'Terms of Use Modal should be visible',
  });

  await TermsOfUseModal.tapScrollEndButton();
  await TermsOfUseModal.tapAgreeCheckBox();
  await TermsOfUseModal.tapAcceptButton();

  await Assertions.expectElementToNotBeVisible(TermsOfUseModal.container, {
    description: 'Terms of Use Modal should not be visible',
  });
};

/**
 * Closes various onboarding modals and dialogs.
 * @async
 * @function closeOnboardingModals
 * @param {boolean} [fromResetWallet=false] - Whether the onboarding is from a reset wallet flow.
 * @returns {Promise<void>} Resolves when the onboarding modals are closed.
 */
export const closeOnboardingModals = async (
  fromResetWallet = false,
): Promise<void> => {
  /**
   * These onboarding modals are becoming a bit wild. We need less of these so we don't
   * have to have all these workarounds in the tests
   */

  // Nothing to do here
  // We can add more logic here if we add more modals
  // that need to be closed after onboarding

  if (!fromResetWallet) {
    // Nothing to do here for now
  }
};

/** Max wait for the optional interest questionnaire to appear after MetaMetrics. */
const ONBOARDING_INTEREST_QUESTIONNAIRE_POLL_MS = 3_000;
const ONBOARDING_INTEREST_QUESTIONNAIRE_POLL_INTERVAL_MS = 250;

/**
 * Advances past the optional onboarding interest questionnaire (Playwright / Appium only).
 * No-op when the app navigates straight to the wallet home (common on some builds/flags).
 */
export const dismissOnboardingInterestQuestionnaire =
  async (): Promise<void> => {
    const deadline = Date.now() + ONBOARDING_INTEREST_QUESTIONNAIRE_POLL_MS;

    while (Date.now() < deadline) {
      try {
        const walletContainer = await asPlaywrightElement(WalletView.container);
        if (await walletContainer.unwrap().isExisting()) {
          logger.debug(
            'Wallet home already visible; skipping interest questionnaire',
          );
          return;
        }

        const skipButton = await asPlaywrightElement(
          OnboardingInterestQuestionnaireView.skipButton,
        );
        if (await skipButton.unwrap().isExisting()) {
          await PlaywrightGestures.waitAndTap(skipButton, {
            timeout: 5000,
            checkForDisplayed: true,
            checkForEnabled: true,
          });
          await skipButton
            .unwrap()
            .waitForDisplayed({ reverse: true, timeout: 5000 });
          return;
        }
      } catch {
        // Stale element / screen transition while the next route loads.
      }
      await sleep(ONBOARDING_INTEREST_QUESTIONNAIRE_POLL_INTERVAL_MS);
    }

    logger.debug(
      'Onboarding Interest Questionnaire not shown within poll window; continuing',
    );
  };

/**
 * Imports a wallet using a secret recovery phrase during the onboarding process.
 *
 * @async
 * @function importWalletWithRecoveryPhrase
 * @param {Object} [options={}] - Options for importing the wallet.
 * @param {string} [options.seedPhrase] - The secret recovery phrase to import the wallet. Defaults to a valid account's seed phrase.
 * @param {string} [options.password] - The password to set for the wallet. Defaults to a valid account's password.
 * @param {boolean} [options.optInToMetrics=true] - Whether to opt in to MetaMetrics. Defaults to true.
 * @param {boolean} [options.optInToMarketing=false] - Whether to opt in to marketing consent at Opt-in Metrics.
 * @param {boolean} [options.fromResetWallet=false] - Whether the import is from a reset wallet flow. Defaults to false.
 * @returns {Promise<void>} Resolves when the wallet import process is complete.
 */
export const importWalletWithRecoveryPhrase = async ({
  seedPhrase,
  password,
  optInToMetrics = true,
  optInToMarketing = false,
  fromResetWallet = false,
}: {
  seedPhrase?: string;
  password?: string;
  optInToMetrics?: boolean;
  optInToMarketing?: boolean;
  fromResetWallet?: boolean;
}): Promise<void> => {
  // tap on import seed phrase button

  // OnboardingCarousel has been removed from the navigation flow
  // The app now starts directly with the Onboarding page

  await Assertions.expectElementToBeVisible(
    OnboardingView.existingWalletButton,
    {
      description: 'Have an existing wallet button should be visible',
    },
  );

  await OnboardingView.tapHaveAnExistingWallet();

  if (SEEDLESS_ONBOARDING_ENABLED) {
    await OnboardingSheet.tapImportSeedButton();
  }
  // should import wallet with secret recovery phrase
  await ImportWalletView.enterSecretRecoveryPhrase(
    seedPhrase ?? validAccount.seedPhrase,
  );
  await ImportWalletView.tapTitle();
  await ImportWalletView.tapContinueButton();

  await CreatePasswordView.enterPassword(password ?? validAccount.password);
  await CreatePasswordView.reEnterPassword(password ?? validAccount.password);
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.tapCreatePasswordButton();

  if (!fromResetWallet) {
    await Assertions.expectElementToBeVisible(MetaMetricsOptInView.container, {
      description: 'MetaMetrics Opt-In should be visible',
    });
    if (!optInToMetrics) {
      await MetaMetricsOptInView.tapMetricsCheckbox();
    }

    if (optInToMarketing && optInToMetrics) {
      await MetaMetricsOptInView.tapMarketingCheckbox();
    }

    await MetaMetricsOptInView.tapAgreeButton();
  }
  if (optInToMetrics) {
    await dismissOnboardingInterestQuestionnaire();
    await Assertions.expectElementToBeVisible(WalletView.container, {
      description: 'Wallet home should be visible after onboarding completion',
      timeout: 15000,
    });
  }
  //'Should dismiss Enable device Notifications checks alert'
  await closeOnboardingModals(fromResetWallet);
};

/**
 * Skips the notifications device settings alert.
 * @async
 * @function skipNotificationsDeviceSettings
 * @returns {Promise<void>} Resolves when the notifications device settings alert is skipped.
 * // TODO: Can we fix this try catch logic?
 */
export const skipNotificationsDeviceSettings = async (): Promise<void> => {
  try {
    await Assertions.expectElementToBeVisible(
      EnableDeviceNotificationsAlert.stepOneContainer,
    );
    await EnableDeviceNotificationsAlert.tapOnEnableDeviceNotificationsButton();
    await Assertions.expectElementToNotBeVisible(
      EnableDeviceNotificationsAlert.stepOneContainer,
    );
  } catch {
    logger.error('The notification device alert modal is not visible');
  }
};

/**
 * Dismisses the protect your wallet modal.
 * @async
 * @function dismissProtectYourWalletModal
 * @returns {Promise<void>} Resolves when the protect your wallet modal is dismissed.
 */
export const dismissProtectYourWalletModal = async (): Promise<void> => {
  try {
    await Assertions.expectElementToBeVisible(
      ProtectYourWalletModal.collapseWalletModal,
    );
    await ProtectYourWalletModal.tapRemindMeLaterButton();
    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await Assertions.expectElementToNotBeVisible(
      ProtectYourWalletModal.collapseWalletModal,
    );
  } catch {
    logger.error('The protect your wallet modal is not visible');
  }
};

/**
 * Automates the process of creating a new wallet during onboarding.
 *
 * Steps performed:
 * 1. Taps the 'Get Started' button on the onboarding carousel.
 * 2. Accepts the terms of use.
 * 3. Selects the 'Create Wallet' option.
 * 4. Handles MetaMetrics opt-in based on the provided option.
 * 5. Enters and confirms a password for the new wallet.
 * 6. Acknowledges understanding of password requirements.
 * 7. Proceeds through the 'Secure your wallet' screen, opting to be reminded later.
 * 8. Skips account security setup.
 * 9. Completes onboarding success flow.
 * 10. Dismisses device notification and automatic security check prompts.
 * 11. Handles 'Protect your wallet' modal and skips security setup again.
 * 12. Closes any remaining onboarding modals.
 *
 * @async
 * @param {Object} [options={}] - Configuration options for wallet creation.
 * @param {boolean} [options.optInToMetrics=true] - Whether to opt in to MetaMetrics analytics.
 * @param {boolean} [options.optInToMarketing=false] - Whether to opt in to marketing consent at Opt-in Metrics.
 * @returns {Promise<void>} Resolves when the wallet creation flow is complete.
 */
export const CreateNewWallet = async ({
  optInToMetrics = true,
  optInToMarketing = false,
}: {
  optInToMetrics?: boolean;
  optInToMarketing?: boolean;
} = {}): Promise<void> => {
  //'should create new wallet'
  await OnboardingView.tapCreateWallet();

  if (SEEDLESS_ONBOARDING_ENABLED) {
    await Assertions.expectElementToBeVisible(OnboardingSheet.container, {
      description: 'Onboarding Sheet should be visible',
    });
    await OnboardingSheet.tapImportSeedButton();
  }

  await Assertions.expectElementToBeVisible(CreatePasswordView.container, {
    description: 'Create Password View should be visible',
  });

  await CreatePasswordView.enterPassword(validAccount.password);
  await CreatePasswordView.reEnterPassword(validAccount.password);
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.tapCreatePasswordButton();

  // Check that we are on the Manual Backup Step 1 screen
  await Assertions.expectElementToBeVisible(ManualBackupStep1View.container, {
    description: 'Manual Backup Step 1 View should be visible',
  });
  await ManualBackupStep1View.tapOnRemindMeLaterButton();

  await Assertions.expectElementToBeVisible(MetaMetricsOptInView.container, {
    description: 'MetaMetrics Opt-In should be visible',
  });
  if (!optInToMetrics) {
    await MetaMetricsOptInView.tapMetricsCheckbox();
  }

  if (optInToMarketing && optInToMetrics) {
    await MetaMetricsOptInView.tapMarketingCheckbox();
  }

  await MetaMetricsOptInView.tapAgreeButton();
  // Detox hangs after wallet creation without disabling sync; Appium has no equivalent.
  if (FrameworkDetector.isDetox()) {
    await device.disableSynchronization();
  }

  if (optInToMetrics) {
    await dismissOnboardingInterestQuestionnaire();
    // iOS Appium: wallet-screen can exist with displayed=false; use readiness helper.
    if (FrameworkDetector.isAppium()) {
      await waitForWalletHomePlaywright(15_000);
    } else {
      await Assertions.expectElementToBeVisible(WalletView.container, {
        description:
          'Wallet home should be visible after onboarding completion',
        timeout: 15000,
      });
    }
  }

  await closeOnboardingModals(false);
  // Dismissing to protect your wallet modal
  await dismissProtectYourWalletModal();
  if (FrameworkDetector.isDetox()) {
    await device.enableSynchronization();
  }
};

/**
 * Switches to the Sepolia network.
 *
 * @async
 * @function switchToSepoliaNetwork
 * @returns {Promise<void>} Resolves when the Sepolia network is switched to.
 */
export const switchToSepoliaNetwork = async (): Promise<void> => {
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.scrollToBottomOfNetworkList();
  await NetworkListModal.tapTestNetworkSwitch();
  await NetworkListModal.scrollToBottomOfNetworkList();
  await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
  await NetworkListModal.changeNetworkTo(
    CustomNetworks.Sepolia.providerConfig.nickname,
  );
  await Assertions.expectElementToBeVisible(NetworkEducationModal.container);
  await Assertions.expectElementToHaveText(
    asDetoxElement(NetworkEducationModal.networkName),
    CustomNetworks.Sepolia.providerConfig.nickname,
  );
  await NetworkEducationModal.tapGotItButton();
  await Assertions.expectElementToNotBeVisible(NetworkEducationModal.container);
  try {
    await Assertions.expectElementToBeVisible(ToastModal.container);
    await Assertions.expectElementToNotBeVisible(ToastModal.container);
  } catch {
    logger.error('Toast is not visible');
  }
};

/**
 * Wait for app readiness and retry logic to handle rehydration flakiness.
 * Logs into the application using the provided password or a default password.
 *
 * @async
 * @function loginToApp
 * @param {string} [password] - The password to use for login. If not provided, defaults to '123123123'.
 * @returns {Promise<void>} A promise that resolves when the login process is complete.
 * @throws {Error} Throws an error if the login view container or password input is not visible after all retries.
 */
export const loginToApp = async (password?: string): Promise<void> => {
  const PASSWORD = password ?? '123123123';

  // Wait for app to complete rehydration ONCE before attempting login
  await waitForAppReady();

  await Utilities.executeWithRetry(
    async () => {
      await Assertions.expectElementToBeVisible(LoginView.container, {
        description: 'Login View container should be visible',
      });
      await Assertions.expectElementToBeVisible(LoginView.passwordInput, {
        description: 'Login View password input should be visible',
      });

      await LoginView.enterPassword(PASSWORD);

      await Assertions.expectElementToBeVisible(WalletView.container, {
        description: 'Wallet container should be visible after login',
        timeout: 15000,
      });

      // SUCCESS: Verify wallet is stable (not flickering back to login)
      await sleep(1000);
      await Assertions.expectElementToBeVisible(WalletView.container, {
        description: 'Wallet container should remain visible',
        timeout: 2000,
      });
    },
    {
      timeout: 45000,
      interval: 3000,
      description: 'login to app after rehydration',
    },
  );
};

// Playwright (appium specific functions)
// -----------------------------------------
/**
 * Dismisses the push notification opt-in sheet for existing users, if it appears.
 * This sheet may appear after login and block navigation. It is safe to call
 * even when the sheet is not present — the function will silently no-op.
 */
export const dismissPushNotificationExistingUserSheet =
  async (): Promise<void> => {
    try {
      const sheetTitle = await asPlaywrightElement(
        encapsulated({
          detox: () =>
            Matchers.getElementByID(ExistingUserSheetSelectorsIDs.TITLE),
          appium: () =>
            PlaywrightMatchers.getElementByText('Never miss a move', true),
        }),
      );
      await PlaywrightAssertions.expectElementToBeVisible(sheetTitle, {
        timeout: 5_000,
        description: 'Push notification existing user sheet',
      });

      try {
        const notNowById = await asPlaywrightElement(
          encapsulated({
            detox: () =>
              Matchers.getElementByID(
                ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW,
              ),
            appium: () =>
              PlaywrightMatchers.getElementById(
                ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW,
                { exact: true },
              ),
          }),
        );
        await PlaywrightGestures.waitAndTap(notNowById, { timeout: 5_000 });
      } catch {
        const notNowByText = await asPlaywrightElement(
          PlaywrightMatchers.getElementByText('Not now', true),
        );
        await PlaywrightGestures.waitAndTap(notNowByText, { timeout: 5_000 });
      }

      await PlaywrightAssertions.expectElementToNotBeVisible(sheetTitle, {
        timeout: 10_000,
        description: 'Push notification existing user sheet should close',
      });
      logger.debug('Dismissed push notification existing user sheet');
    } catch {
      // Sheet not present — no-op
    }
  };

/**
 * Dismisses the marketing consent (Experience Enhancer) modal if it appears
 * after login. Safe to call when the modal is not shown.
 */
export const dismissExperienceEnhancerModal = async (): Promise<void> => {
  await ExperienceEnhancerBottomSheet.dismissIfPresent();
};

/**
 * Logs into the application using the provided password or a default password.
 *
 * @async
 * @function loginToAppPlaywright
 */
export const loginToAppPlaywright = async (
  options: { scenarioType?: string; dismissModals?: boolean } = {},
): Promise<void> => {
  const { scenarioType = 'login' } = options;

  const dismissPostLoginModals = async (): Promise<void> => {
    await PlaywrightUtilities.wait(500);
    await dismissPushNotificationExistingUserSheet();
    await dismissExperienceEnhancerModal();
  };

  await dismissAndroidSystemOverlaysPlaywright();

  if (await isUnlockedWalletHomeReady()) {
    await completeUnlockedWalletHome(dismissPostLoginModals);
    return;
  }

  const readyScreen = await waitForAppReady(resolveE2EWaitTimeoutMs(60_000));

  if (readyScreen === 'wallet') {
    await completeUnlockedWalletHome(dismissPostLoginModals);
    return;
  }

  try {
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(LoginView.passwordInput),
      {
        description: 'Login password input',
        timeout: 3_000,
      },
    );
  } catch {
    // Dev menu can overlay login on local builds — dismiss and retry once.
    await dismissDeveloperMenuPlaywright();
    await dismissAndroidSystemOverlaysPlaywright();
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(LoginView.passwordInput),
      {
        description: 'Login password input',
        timeout: 5_000,
      },
    );
  }

  const password = getPasswordForScenario(scenarioType);
  // Type password and unlock
  await LoginView.enterPassword(password ?? '');
  await LoginView.tapLoginButton();

  await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));
  await dismissPostLoginModals();
};

/**
 * Logs in (Appium), waits for the wallet, and opens the account list bottom sheet.
 */
export const loginAndOpenAccountList = async (
  options: {
    scenarioType?: string;
    dismissModals?: boolean;
    walletTimeout?: number;
    accountListDescription?: string;
  } = {},
): Promise<void> => {
  const {
    walletTimeout = 15_000,
    accountListDescription = 'Account list should be visible',
    ...loginOptions
  } = options;

  await loginToAppPlaywright(loginOptions);

  await waitForWalletHomePlaywright(walletTimeout);

  await WalletView.tapIdenticon();

  await Assertions.expectElementToBeVisible(
    AccountListBottomSheet.accountList,
    {
      description: accountListDescription,
    },
  );
};

/**
 * Selects the account for the device based on the device-matrix.json file.
 * @param deviceName - The name of the device the test is running on to map
 * against the device-matrix.json file
 * @returns {Promise<void>} Resolves when the account is selected.
 * @throws {Error} Throws an error if the account name is not found for the device.
 */
export const selectAccountByDevice = async (
  deviceName: string,
): Promise<void> => {
  const deviceAccountMapping = PlaywrightUtilities.buildDeviceAccountMapping();
  const accountName = deviceAccountMapping[deviceName];

  if (!(deviceName in deviceAccountMapping)) {
    throw new Error(`Account name not found for device: ${deviceName}`);
  }

  if (!accountName) {
    logger.info(
      `Device "${deviceName}" uses default Account 1 — skipping account switch`,
    );
    return;
  }

  logger.info(`Selecting account: ${accountName} for device: ${deviceName}`);

  await WalletView.tapIdenticon();
  await PlaywrightAssertions.expectElementToBeVisible(
    await asPlaywrightElement(AccountListBottomSheet.accountList),
  );
  await AccountListBottomSheet.waitForAccountSyncToComplete();
  const isAccount3 = accountName === 'Account 3'; // Due to an issue with the account 3 being displayed as Account 3 (2)
  await AccountListBottomSheet.tapAccountByNameV2(accountName, !isAccount3);
};

const PREDICT_GTM_MODAL_FALLBACK_WAIT_MS = 10_000;

/**
 * Resolves whether the Predict GTM onboarding modal should be handled.
 * Uses feature flags when available; otherwise polls the modal for up to 10s.
 */
export const resolvePredictGtmOnboardingModalEnabled = async (
  productionFeatureFlags: Record<string, unknown> | null,
): Promise<boolean> => {
  if (productionFeatureFlags != null) {
    return (
      (
        productionFeatureFlags.predictGtmOnboardingModalEnabled as {
          enabled?: boolean;
        }
      )?.enabled === true
    );
  }

  try {
    await (await asPlaywrightElement(PredictModalView.notNowButton))
      .unwrap()
      .waitForDisplayed({ timeout: PREDICT_GTM_MODAL_FALLBACK_WAIT_MS });
    return true;
  } catch {
    return false;
  }
};

/**
 * Dismisses the predictions modal.
 * @async
 * @function dismisspredictionsModalPlaywright
 * @returns {Promise<void>} Resolves when the predictions modal is dismissed.
 */
const tryDismissPredictionsModalPlaywright = async (
  timeout = 3000,
): Promise<boolean> => {
  try {
    const btn = await asPlaywrightElement(PredictModalView.notNowButton);
    await PlaywrightGestures.waitAndTap(btn, {
      timeout,
      checkForDisplayed: true,
      checkForEnabled: true,
    });
    await btn.unwrap().waitForDisplayed({ reverse: true, timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

export const dismisspredictionsModalPlaywright = async (
  maxRetries = 2,
): Promise<void> => {
  const dismissed = await tryDismissPredictionsModalPlaywright();
  if (!dismissed) {
    logger.error(`Predict modal not dismissed after ${maxRetries} attempts`);
  }
};

const startPredictionsModalWatcher = (intervalMs = 1000): (() => void) => {
  let stopped = false;
  let inFlight = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped || inFlight) {
      if (!stopped) {
        timeoutId = setTimeout(tick, intervalMs);
      }
      return;
    }

    inFlight = true;
    try {
      await tryDismissPredictionsModalPlaywright(1000);
    } finally {
      inFlight = false;
      if (!stopped) {
        timeoutId = setTimeout(tick, intervalMs);
      }
    }
  };

  timeoutId = setTimeout(tick, 0);

  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
};

/**
 * Completes the onboarding flow for importing a SRP.
 * @param srp - The SRP to import.
 * @returns {Promise<void>} Resolves when the onboarding flow for importing a SRP is complete.
 */
export const onboardingFlowImportSRPPlaywright = async (
  srp: string,
): Promise<void> => {
  await PlaywrightAssertions.expectElementToBeVisible(
    await asPlaywrightElement(OnboardingView.newWalletButton),
  );

  await OnboardingView.tapHaveAnExistingWallet();
  await PlaywrightAssertions.expectElementToBeVisible(
    await asPlaywrightElement(OnboardingSheet.importSeedButton),
  );

  await OnboardingSheet.tapImportSeedButton();
  await PlaywrightAssertions.expectElementToBeVisible(
    await asPlaywrightElement(ImportWalletView.title),
  );

  await ImportWalletView.typeSecretRecoveryPhrase(srp, true);

  await ImportWalletView.tapContinueButton();

  await CreatePasswordView.enterPassword(
    getPasswordForScenario('onboarding') ?? '',
  );
  await CreatePasswordView.reEnterPassword(
    getPasswordForScenario('onboarding') ?? '',
  );
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.tapCreatePasswordButton();
  await PlaywrightAssertions.expectElementToBeVisible(
    await asPlaywrightElement(MetaMetricsOptInView.iAgreeButton),
  );
  await MetaMetricsOptInView.tapIAgreeButton();
  await dismissOnboardingInterestQuestionnaire();
  const productionFeatureFlags = await fetchProductionFeatureFlags(
    'main',
    testEnvironment,
  );

  await dismissPushNotificationExistingUserSheet();

  const predictGtmOnboardingModalEnabled =
    await resolvePredictGtmOnboardingModalEnabled(productionFeatureFlags);
  console.log(
    'predictGtmOnboardingModalEnabled',
    predictGtmOnboardingModalEnabled,
  );

  const stopPredictionsModalWatcher = startPredictionsModalWatcher();
  try {
    await PlaywrightAssertions.expectElementToBeVisible(
      await asPlaywrightElement(WalletView.container),
    );
    await tryDismissPredictionsModalPlaywright();
  } finally {
    stopPredictionsModalWatcher();
  }
};
