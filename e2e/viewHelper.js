'use strict';

import EnableAutomaticSecurityChecksView from './pages/EnableAutomaticSecurityChecksView';
import ImportWalletView from './pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from './pages/Onboarding/MetaMetricsOptInView';
import NetworkEducationModal from './pages/modals/NetworkEducationModal';
import NetworkListModal from './pages/modals/NetworkListModal';
import NetworkView from './pages/Settings/NetworksView';
import OnboardingView from './pages/Onboarding/OnboardingView';
import OnboardingCarouselView from './pages/Onboarding/OnboardingCarouselView';
import OnboardingWizardModal from './pages/modals/OnboardingWizardModal';
import ExperienceEnhancerModal from './pages/modals/ExperienceEnhancerModal';
import SettingsView from './pages/Settings/SettingsView';
import WalletView from './pages/wallet/WalletView';
import Accounts from '../wdio/helpers/Accounts';
import SkipAccountSecurityModal from './pages/modals/SkipAccountSecurityModal';
import ProtectYourWalletModal from './pages/modals/ProtectYourWalletModal';
import CreatePasswordView from './pages/Onboarding/CreatePasswordView';
import ProtectYourWalletView from './pages/Onboarding/ProtectYourWalletView';
import OnboardingSuccessView from './pages/Onboarding/OnboardingSuccessView';

import TestHelpers from './helpers';

import TermsOfUseModal from './pages/modals/TermsOfUseModal';
import TabBarComponent from './pages/TabBarComponent';
import LoginView from './pages/LoginView';
import { getGanachePort } from './fixtures/utils';
import Assertions from './utils/Assertions';
import { CustomNetworks } from './resources/networks.e2e';
import ToastModal from './pages/modals/ToastModal';

const LOCALHOST_URL = `http://localhost:${getGanachePort()}/`;
const validAccount = Accounts.getValidAccount();

export const acceptTermOfUse = async () => {
  // tap on accept term of use screen
  await Assertions.checkIfVisible(TermsOfUseModal.container);
  await TermsOfUseModal.tapScrollEndButton();
  await TermsOfUseModal.tapAgreeCheckBox();
  await TermsOfUseModal.tapAcceptButton();
  await Assertions.checkIfNotVisible(TermsOfUseModal.container);
};
export const closeOnboardingModals = async () => {
  /*
These onboarding modals are becoming a bit wild. We need less of these so we don't
have to have all these workarounds in the tests
  */
  await TestHelpers.delay(1000);

  // Handle Onboarding wizard
  try {
    await Assertions.checkIfVisible(OnboardingWizardModal.stepOneContainer);
    await OnboardingWizardModal.tapNoThanksButton();
    await Assertions.checkIfNotVisible(OnboardingWizardModal.stepOneContainer);
  } catch {
    /* eslint-disable no-console */

    console.log('The onboarding modal is not visible');
  }

  try {
    // Handle Marketing consent modal

    await Assertions.checkIfVisible(ExperienceEnhancerModal.container);
    await ExperienceEnhancerModal.tapNoThanks();
    await Assertions.checkIfNotVisible(ExperienceEnhancerModal.container);
  } catch {
    console.log('The marketing consent modal is not visible');
  }

  try {
    await Assertions.checkIfVisible(ToastModal.container);
    await ToastModal.tapToastCloseButton();
    await Assertions.checkIfNotVisible(ToastModal.container);
  } catch {
    /* eslint-disable no-undef */

    console.log('The marketing toast is not visible');
  }
};

export const importWalletWithRecoveryPhrase = async () => {
  // tap on import seed phrase button
  await Assertions.checkIfVisible(OnboardingCarouselView.container);
  await OnboardingCarouselView.tapOnGetStartedButton();
  await OnboardingView.tapImportWalletFromSeedPhrase();

  await MetaMetricsOptIn.tapAgreeButton();
  await TestHelpers.delay(3500);
  await acceptTermOfUse();
  // should import wallet with secret recovery phrase
  await ImportWalletView.clearSecretRecoveryPhraseInputBox();
  await ImportWalletView.enterSecretRecoveryPhrase(validAccount.seedPhrase);
  await ImportWalletView.enterPassword(validAccount.password);
  await ImportWalletView.reEnterPassword(validAccount.password);

  // Should dismiss Automatic Security checks screen
  await TestHelpers.delay(3500);
  await OnboardingSuccessView.tapDone();
  await EnableAutomaticSecurityChecksView.isVisible();
  await EnableAutomaticSecurityChecksView.tapNoThanks();

  // should dismiss the onboarding wizard
  // dealing with flakiness on bitrise.
  await this.closeOnboardingModals();
};

export const CreateNewWallet = async () => {
  //'should create new wallet'

  // tap on import seed phrase button
  await OnboardingCarouselView.tapOnGetStartedButton();
  await OnboardingView.tapCreateWallet();

  await Assertions.checkIfVisible(MetaMetricsOptIn.container);
  await MetaMetricsOptIn.tapAgreeButton();
  await acceptTermOfUse();

  await Assertions.checkIfVisible(CreatePasswordView.container);
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.enterPassword(validAccount.password);
  await CreatePasswordView.reEnterPassword(validAccount.password);
  // await CreatePasswordView.tapCreatePasswordButton();

  // Check that we are on the Secure your wallet screen
  await Assertions.checkIfVisible(ProtectYourWalletView.container);
  await ProtectYourWalletView.tapOnRemindMeLaterButton();
  await device.disableSynchronization();
  await SkipAccountSecurityModal.tapIUnderstandCheckBox();
  await SkipAccountSecurityModal.tapSkipButton();
  await device.enableSynchronization();
  await Assertions.checkIfVisible(WalletView.container);

  //'Should dismiss Automatic Security checks screen'
  await TestHelpers.delay(3500);
  await OnboardingSuccessView.tapDone();
  await EnableAutomaticSecurityChecksView.isVisible();
  await EnableAutomaticSecurityChecksView.tapNoThanks();

  // 'should dismiss the onboarding wizard'
  // dealing with flakiness on bitrise.
  await this.closeOnboardingModals();

  // Dismissing to protect your wallet modal
  await Assertions.checkIfVisible(ProtectYourWalletModal.collapseWalletModal);
  await ProtectYourWalletModal.tapRemindMeLaterButton();
  await SkipAccountSecurityModal.tapIUnderstandCheckBox();
  await SkipAccountSecurityModal.tapSkipButton();
};

export const addLocalhostNetwork = async () => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapNetworks();
  await Assertions.checkIfVisible(NetworkView.networkContainer);

  await TestHelpers.delay(3000);
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
  await TestHelpers.delay(3000);

  await Assertions.checkIfVisible(NetworkEducationModal.container);
  await Assertions.checkIfElementToHaveText(
    NetworkEducationModal.networkName,
    'Localhost',
  );
  await NetworkEducationModal.tapGotItButton();
  await Assertions.checkIfNotVisible(NetworkEducationModal.container);
};

export const switchToSepoliaNetwork = async () => {
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.tapTestNetworkSwitch();
  await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
  await NetworkListModal.changeNetworkTo(
    CustomNetworks.Sepolia.providerConfig.nickname,
  );
  await Assertions.checkIfVisible(NetworkEducationModal.container);
  await Assertions.checkIfElementToHaveText(
    NetworkEducationModal.networkName,
    CustomNetworks.Sepolia.providerConfig.nickname,
  );
  await NetworkEducationModal.tapGotItButton();
  await Assertions.checkIfNotVisible(NetworkEducationModal.container);
  try {
    await Assertions.checkIfVisible(ToastModal.container);
    await Assertions.checkIfNotVisible(ToastModal.container);
  } catch {
    // eslint-disable-next-line no-console
    console.log('Toast is not visible');
  }
};

export const loginToApp = async () => {
  const PASSWORD = '123123123';
  await LoginView.isVisible();
  await LoginView.enterPassword(PASSWORD);
};
