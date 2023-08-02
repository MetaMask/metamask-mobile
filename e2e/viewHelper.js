'use strict';

import EnableAutomaticSecurityChecksView from './pages/EnableAutomaticSecurityChecksView';
import ImportWalletView from './pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from './pages/Onboarding/MetaMetricsOptInView';
import NetworkEducationModal from './pages/modals/NetworkEducationModal';
import NetworkListModal from './pages/modals/NetworkListModal';
import NetworkView from './pages/Drawer/Settings/NetworksView';
import OnboardingView from './pages/Onboarding/OnboardingView';
import OnboardingCarouselView from './pages/Onboarding/OnboardingCarouselView';
import OnboardingWizardModal from './pages/modals/OnboardingWizardModal';
import SettingsView from './pages/Drawer/Settings/SettingsView';
import WalletView from './pages/WalletView';
import WhatsNewModal from './pages/modals/WhatsNewModal';
import Accounts from '../wdio/helpers/Accounts';
import SkipAccountSecurityModal from './pages/modals/SkipAccountSecurityModal';
import ProtectYourWalletModal from './pages/modals/ProtectYourWalletModal';
import CreatePasswordView from './pages/Onboarding/CreatePasswordView';
import ProtectYourWalletView from './pages/Onboarding/ProtectYourWalletView';

import TestHelpers from './helpers';

import TermsOfUseModal from './pages/modals/TermsOfUseModal';
import TabBarComponent from './pages/TabBarComponent';

const GOERLI = 'Goerli Test Network';

const LOCALHOST_URL = 'http://localhost:8545/';

// detox on ios does not have a clean way of interacting with webview eleemnts. You would need to tap by coordinates
export const testDappConnectButtonCooridinates = { x: 170, y: 280 };
export const testDappSendEIP1559ButtonCoordinates = { x: 320, y: 500 };
const validAccount = Accounts.getValidAccount();

export const acceptTermOfUse = async () => {
  // tap on accept term of use screen
  await TestHelpers.delay(3500);
  await TermsOfUseModal.isDisplayed();
  await TermsOfUseModal.tapScrollEndButton();
  await TermsOfUseModal.tapAgreeCheckBox();
  await TestHelpers.delay(3500);
  await TermsOfUseModal.tapAcceptButton();
  await TermsOfUseModal.isNotDisplayed();
};

export const importWalletWithRecoveryPhrase = async () => {
  // tap on import seed phrase button
  await OnboardingCarouselView.isVisible();
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
  await EnableAutomaticSecurityChecksView.isVisible();
  await EnableAutomaticSecurityChecksView.tapNoThanks();

  // should dismiss the onboarding wizard
  // dealing with flakiness on bitrise.
  await TestHelpers.delay(1000);
  try {
    await OnboardingWizardModal.isVisible();
    await OnboardingWizardModal.tapNoThanksButton();
    await OnboardingWizardModal.isNotVisible();
  } catch {
    //
  }

  // should tap on the close button to dismiss the whats new modal
  await TestHelpers.delay(2500);
  try {
    await WhatsNewModal.isVisible();
    await WhatsNewModal.tapCloseButton();
  } catch {
    //
  }
};

export const CreateNewWallet = async () => {
  //'should create new wallet'

  // tap on import seed phrase button
  await OnboardingCarouselView.isGetStartedButtonVisible();
  await OnboardingCarouselView.tapOnGetStartedButton();
  await OnboardingView.tapCreateWallet();

  await MetaMetricsOptIn.isVisible();
  await MetaMetricsOptIn.tapAgreeButton();
  await acceptTermOfUse();

  await CreatePasswordView.isVisible();
  await CreatePasswordView.tapIUnderstandCheckBox();
  await CreatePasswordView.enterPassword(validAccount.password);
  await CreatePasswordView.reEnterPassword(validAccount.password);
  // await CreatePasswordView.tapCreatePasswordButton();

  // Check that we are on the Secure your wallet screen
  await ProtectYourWalletView.isVisible();
  await ProtectYourWalletView.tapOnRemindMeLaterButton();
  await device.disableSynchronization();
  await SkipAccountSecurityModal.tapIUnderstandCheckBox();
  await SkipAccountSecurityModal.tapSkipButton();
  await device.enableSynchronization();
  await WalletView.isVisible();

  //'Should dismiss Automatic Security checks screen'
  await TestHelpers.delay(3500);
  await EnableAutomaticSecurityChecksView.isVisible();
  await EnableAutomaticSecurityChecksView.tapNoThanks();

  // 'should dismiss the onboarding wizard'
  // dealing with flakiness on bitrise.
  await TestHelpers.delay(1000);
  try {
    await OnboardingWizardModal.isVisible();
    await OnboardingWizardModal.tapNoThanksButton();
    await OnboardingWizardModal.isNotVisible();
  } catch {
    //
  }

  //should tap on the close button to dismiss the whats new modal'
  // dealing with flakiness on bitrise.
  await TestHelpers.delay(2000);
  try {
    await WhatsNewModal.isVisible();
    await WhatsNewModal.tapCloseButton();
  } catch {
    //
  }

  // Dismissing the protect your wallet modal
  await ProtectYourWalletModal.isCollapsedBackUpYourWalletModalVisible();
  await TestHelpers.delay(1000);

  await ProtectYourWalletModal.tapRemindMeLaterButton();

  await SkipAccountSecurityModal.tapIUnderstandCheckBox();
  await SkipAccountSecurityModal.tapSkipButton();
};

export const addLocalhostNetwork = async () => {
  await TabBarComponent.tapSettings();
  await SettingsView.tapNetworks();
  await NetworkView.isNetworkViewVisible();

  await TestHelpers.delay(3000);
  await NetworkView.tapAddNetworkButton();
  await NetworkView.switchToCustomNetworks();

  await NetworkView.typeInNetworkName('Localhost');
  await NetworkView.typeInRpcUrl(LOCALHOST_URL);
  await NetworkView.typeInChainId('1337');
  await NetworkView.typeInNetworkSymbol('ETH\n');

  if (device.getPlatform() === 'ios') {
    await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
    await NetworkView.tapRpcNetworkAddButton();
  }
  await TestHelpers.delay(3000);

  await NetworkEducationModal.isVisible();
  await NetworkEducationModal.isNetworkNameCorrect('Localhost');
  await NetworkEducationModal.tapGotItButton();
  await NetworkEducationModal.isNotVisible();
};

export const switchToGoreliNetwork = async () => {
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.tapTestNetworkSwitch();
  await NetworkListModal.isTestNetworkToggleOn();
  await NetworkListModal.changeNetwork(GOERLI);
  await WalletView.isNetworkNameVisible(GOERLI);
  await NetworkEducationModal.tapGotItButton();
};
