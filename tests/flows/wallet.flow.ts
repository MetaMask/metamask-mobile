import WalletView from '../page-objects/wallet/WalletView';
import NetworkView from '../page-objects/Settings/NetworksView';
import {
  createLogger,
  PortManager,
  ResourceType,
  sleep,
  Utilities,
} from '../framework';
import Assertions from '../framework/Assertions';
import NetworkEducationModal from '../page-objects/Network/NetworkEducationModal';
import { getAnvilPortForFixture , getGanachePortForFixture } from '../framework/fixtures/FixtureUtils';
import TermsOfUseModal from '../page-objects/Onboarding/TermsOfUseModal';
import CreatePasswordView from '../page-objects/Onboarding/CreatePasswordView';
import OnboardingSuccessView from '../page-objects/Onboarding/OnboardingSuccessView';
import ImportWalletView from '../page-objects/Onboarding/ImportWalletView';
import OnboardingView from '../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../page-objects/Onboarding/OnboardingSheet';
import Accounts from '../../wdio/helpers/Accounts';
import MetaMetricsOptIn from '../page-objects/Onboarding/MetaMetricsOptInView';
import EnableDeviceNotificationsAlert from '../page-objects/Onboarding/EnableDeviceNotificationsAlert';
import ProtectYourWalletModal from '../page-objects/Onboarding/ProtectYourWalletModal';
import SkipAccountSecurityModal from '../page-objects/Onboarding/SkipAccountSecurityModal';
import ManualBackupStep1View from '../page-objects/Onboarding/ManualBackupStep1View';
import NetworkListModal from '../page-objects/Network/NetworkListModal';
import { CustomNetworks } from '../resources/networks.e2e';
import ToastModal from '../page-objects/wallet/ToastModal';
import { waitForAppReady } from './general.flow';
import LoginView from '../page-objects/wallet/LoginView';

const logger = createLogger({
  name: 'WalletFlow',
});

const validAccount = Accounts.getValidAccount();
const SEEDLESS_ONBOARDING_ENABLED =
  process.env.SEEDLESS_ONBOARDING_ENABLED === 'true' ||
  process.env.SEEDLESS_ONBOARDING_ENABLED === undefined;

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
    await Assertions.expectElementToBeVisible(MetaMetricsOptIn.container, {
      description: 'MetaMetrics Opt-In should be visible',
    });
    if (!optInToMetrics) {
      await MetaMetricsOptIn.tapMetricsCheckbox();
    }

    await MetaMetricsOptIn.tapAgreeButton();
  }
  //'Should dismiss Enable device Notifications checks alert'
  await Assertions.expectElementToBeVisible(OnboardingSuccessView.container, {
    description: 'Onboarding Success View should be visible',
  });
  await OnboardingSuccessView.tapDone();
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
 * @returns {Promise<void>} Resolves when the wallet creation flow is complete.
 */
export const CreateNewWallet = async ({
  optInToMetrics = true,
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

  await Assertions.expectElementToBeVisible(MetaMetricsOptIn.container, {
    description: 'MetaMetrics Opt-In should be visible',
  });
  if (!optInToMetrics) {
    await MetaMetricsOptIn.tapMetricsCheckbox();
  }

  await MetaMetricsOptIn.tapAgreeButton();
  await device.disableSynchronization(); // Detox is hanging after wallet creation

  await Assertions.expectElementToBeVisible(OnboardingSuccessView.container, {
    description: 'Onboarding Success View should be visible',
  });
  await OnboardingSuccessView.tapDone();
  await closeOnboardingModals(false);
  // Dismissing to protect your wallet modal
  await dismissProtectYourWalletModal();
  await device.enableSynchronization();
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
        timeout: 10000,
      });

      // SUCCESS: Verify wallet is stable (not flickering back to login)
      await sleep(1000);
      await Assertions.expectElementToBeVisible(WalletView.container, {
        description: 'Wallet container should remain visible',
        timeout: 2000,
      });
    },
    {
      timeout: 30000,
      interval: 2000,
      description: 'login to app after rehydration',
    },
  );
};
