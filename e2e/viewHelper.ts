import EnableDeviceNotificationsAlert from './pages/Onboarding/EnableDeviceNotificationsAlert';
import ImportWalletView from './pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from './pages/Onboarding/MetaMetricsOptInView';
import NetworkEducationModal from './pages/Network/NetworkEducationModal';
import NetworkListModal from './pages/Network/NetworkListModal';
import NetworkView from './pages/Settings/NetworksView';
import OnboardingView from './pages/Onboarding/OnboardingView';
import SettingsView from './pages/Settings/SettingsView';
import WalletView from './pages/wallet/WalletView';
import Accounts from '../wdio/helpers/Accounts';
import SkipAccountSecurityModal from './pages/Onboarding/SkipAccountSecurityModal';
import ProtectYourWalletModal from './pages/Onboarding/ProtectYourWalletModal';
import CreatePasswordView from './pages/Onboarding/CreatePasswordView';
import ProtectYourWalletView from './pages/Onboarding/ProtectYourWalletView';
import OnboardingSuccessView from './pages/Onboarding/OnboardingSuccessView';
import TermsOfUseModal from './pages/Onboarding/TermsOfUseModal';
import TabBarComponent from './pages/wallet/TabBarComponent';
import LoginView from './pages/wallet/LoginView';
import { getGanachePort } from './framework/fixtures/FixtureUtils';
import Assertions from './framework/Assertions';
import { CustomNetworks } from './resources/networks.e2e';
import ToastModal from './pages/wallet/ToastModal';
import TestDApp from './pages/Browser/TestDApp';
import OnboardingSheet from './pages/Onboarding/OnboardingSheet';
import Matchers from './utils/Matchers';
import { BrowserViewSelectorsIDs } from './selectors/Browser/BrowserView.selectors';
import { createLogger } from './framework/logger';

const LOCALHOST_URL = `http://localhost:${getGanachePort()}/`;
const validAccount = Accounts.getValidAccount();
const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true' ||
  process.env.SEEDLESS_ONBOARDING_ENABLED === undefined;

const logger = createLogger({
  name: 'ViewHelper',
});

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
export const closeOnboardingModals = async (fromResetWallet = false) => {
  /**
   * These onboarding modals are becoming a bit wild. We need less of these so we don't
   * have to have all these workarounds in the tests
   */

  try {
    await Assertions.expectElementToBeVisible(ToastModal.container, {
      description: 'Toast Modal should be visible',
    });
    await ToastModal.tapToastCloseButton();
    await Assertions.expectElementToNotBeVisible(ToastModal.container, {
      description: 'Toast Modal should not be visible',
    });
  } catch {
    logger.error('The marketing toast is not visible');
  }

  if (!fromResetWallet) {
    // Nothing to do here for now
  }
};

/**
 * Skips the notifications device settings alert.
 * @async
 * @function skipNotificationsDeviceSettings
 * @returns {Promise<void>} Resolves when the notifications device settings alert is skipped.
 * // TODO: Can we fix this try catch logic?
 */
export const skipNotificationsDeviceSettings = async () => {
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
export const dismissProtectYourWalletModal: () => Promise<void> = async () => {
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
 * Imports a wallet using a secret recovery phrase during the onboarding process.
 *
 * @async
 * @function importWalletWithRecoveryPhrase
 * @param {Object} [options={}] - Options for importing the wallet.
 * @param {string} [options.seedPhrase] - The secret recovery phrase to import the wallet. Defaults to a valid account's seed phrase.
 * @param {string} [options.password] - The password to set for the wallet. Defaults to a valid account's password.
 * @param {boolean} [options.optInToMetrics=true] - Whether to opt in to MetaMetrics. Defaults to true.
 * @param {boolean} [options.fromResetWallet=false] - Whether the import is from a reset wallet flow. Defaults to false.
 * @returns {Promise<void>} Resolves when the wallet import process is complete.
 */
export const importWalletWithRecoveryPhrase = async ({
  seedPhrase,
  password,
  optInToMetrics = true,
  fromResetWallet = false,
}: {
  seedPhrase?: string;
  password?: string;
  optInToMetrics?: boolean;
  fromResetWallet?: boolean;
}) => {
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
  await ImportWalletView.clearSecretRecoveryPhraseInputBox();
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
    await Assertions.expectElementToBeVisible(MetaMetricsOptIn.container, {
      description: 'MetaMetrics Opt-In should be visible',
    });
    if (optInToMetrics) {
      await MetaMetricsOptIn.tapAgreeButton();
    } else {
      await MetaMetricsOptIn.tapNoThanksButton();
    }
  }
  // Dealing with flakiness
  await device.disableSynchronization();

  //'Should dismiss Enable device Notifications checks alert'
  await Assertions.expectElementToBeVisible(OnboardingSuccessView.container, {
    description: 'Onboarding Success View should be visible',
  });
  await OnboardingSuccessView.tapDone();
  // Dealing with flakiness
  // Workaround for token list hanging
  await WalletView.pullToRefreshTokensList();
  await device.enableSynchronization();
  await closeOnboardingModals(fromResetWallet);
};

/**
 * Automates the process of creating a new wallet during onboarding.
 *
 * Steps performed:
 * 1. Taps the "Get Started" button on the onboarding carousel.
 * 2. Accepts the terms of use.
 * 3. Selects the "Create Wallet" option.
 * 4. Handles MetaMetrics opt-in based on the provided option.
 * 5. Enters and confirms a password for the new wallet.
 * 6. Acknowledges understanding of password requirements.
 * 7. Proceeds through the "Secure your wallet" screen, opting to be reminded later.
 * 8. Skips account security setup.
 * 9. Completes onboarding success flow.
 * 10. Dismisses device notification and automatic security check prompts.
 * 11. Handles "Protect your wallet" modal and skips security setup again.
 * 12. Closes any remaining onboarding modals.
 *
 * @async
 * @param {Object} [options={}] - Configuration options for wallet creation.
 * @param {boolean} [options.optInToMetrics=true] - Whether to opt in to MetaMetrics analytics.
 * @returns {Promise<void>} Resolves when the wallet creation flow is complete.
 */
export const CreateNewWallet = async ({ optInToMetrics = true } = {}) => {
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

  // Check that we are on the Secure your wallet screen
  await Assertions.expectElementToBeVisible(ProtectYourWalletView.container, {
    description: 'Protect Your Wallet View should be visible',
  });
  await ProtectYourWalletView.tapOnRemindMeLaterButton();

  // This should be removed once we implement mockAll
  await device.disableSynchronization();
  await SkipAccountSecurityModal.tapIUnderstandCheckBox();
  await SkipAccountSecurityModal.tapSkipButton();
  // This should be removed once we implement mockAll
  await device.enableSynchronization();

  await Assertions.expectElementToBeVisible(MetaMetricsOptIn.container, {
    description: 'MetaMetrics Opt-In should be visible',
  });
  if (optInToMetrics) {
    await MetaMetricsOptIn.tapAgreeButton();
  } else {
    await MetaMetricsOptIn.tapNoThanksButton();
  }

  await device.disableSynchronization(); // Detox is hanging after wallet creation

  await Assertions.expectElementToBeVisible(OnboardingSuccessView.container, {
    description: 'Onboarding Success View should be visible',
  });
  await OnboardingSuccessView.tapDone();
  await closeOnboardingModals(false);
  // Dismissing to protect your wallet modal
  await dismissProtectYourWalletModal();
  await WalletView.pullToRefreshTokensList();
  await device.enableSynchronization();
};

/**
 * Adds the Localhost network to the user's network list.
 *
 * @async
 * @function addLocalhostNetwork
 * @returns {Promise<void>} Resolves when the Localhost network is added to the user's network list.
 */
export const addLocalhostNetwork = async () => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapNetworks();
  await Assertions.expectElementToBeVisible(NetworkView.networkContainer, {
    description: 'Network Container should be visible',
  });

  await NetworkView.tapAddNetworkButton();
  await NetworkView.switchToCustomNetworks();

  await NetworkView.typeInNetworkName('Localhost');
  await NetworkView.typeInRpcUrl(LOCALHOST_URL);
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
    NetworkEducationModal.networkName,
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
 * Switches to the Sepolia network.
 *
 * @async
 * @function switchToSepoliaNetwork
 * @returns {Promise<void>} Resolves when the Sepolia network is switched to.
 */
export const switchToSepoliaNetwork = async () => {
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
    NetworkEducationModal.networkName,
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
 * Logs into the application using the provided password or a default password.
 *
 * @async
 * @function loginToApp
 * @param {string} [password] - The password to use for login. If not provided, defaults to '123123123'.
 * @returns {Promise<void>} A promise that resolves when the login process is complete.
 * @throws {Error} Throws an error if the login view container or password input is not visible.
 */
export const loginToApp = async (password?: string) => {
  const PASSWORD = password ?? '123123123';
  await Assertions.expectElementToBeVisible(LoginView.container, {
    description: 'Login View container should be visible',
  });
  await Assertions.expectElementToBeVisible(LoginView.passwordInput, {
    description: 'Login View password input should be visible',
  });
  await LoginView.enterPassword(PASSWORD);

  // Wait for wallet to load and perform pull-to-refresh to ensure token list is updated
  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet container should be visible after login',
  });

  await device.disableSynchronization(); // Workaround for tokens list hanging after login
  try {
    await WalletView.pullToRefreshTokensList();
    logger.debug('Pull-to-refresh completed after login');
    await device.enableSynchronization();
  } catch (error) {
    logger.warn('Pull-to-refresh failed after login:', error);
    // Continue even if pull-to-refresh fails
    await device.enableSynchronization();
  }
};

/**
 * Waits for the test dapp to load.
 * @async
 * @function waitForTestDappToLoad
 * @returns {Promise<void>} A promise that resolves when the test dapp is loaded.
 * @throws {Error} Throws an error if the test dapp fails to load after a certain number of attempts.
 */
export const waitForTestDappToLoad = async () => {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await Assertions.expectElementToBeVisible(TestDApp.testDappFoxLogo, {
        description: 'Test Dapp Fox Logo should be visible',
      });
      await Assertions.expectElementToBeVisible(TestDApp.testDappPageTitle, {
        description: 'Test Dapp Page Title should be visible',
      });
      await Assertions.expectElementToBeVisible(TestDApp.DappConnectButton, {
        description: 'Test Dapp Connect Button should be visible',
      });
      return; // Success - page is fully loaded and interactive
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Test dapp failed to load after ${MAX_RETRIES} attempts: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  throw new Error('Test dapp failed to become fully interactive');
};

export const waitForTestSnapsToLoad = async () => {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await Assertions.expectElementToBeVisible(
        Matchers.getElementByWebID(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
          'root',
        ),
      );
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Test Snaps failed to load after ${MAX_RETRIES} attempts: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  throw new Error('Test Snaps failed to become fully interactive.');
};
