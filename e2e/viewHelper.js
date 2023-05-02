'use strict';

import DrawerView from './pages/Drawer/DrawerView';
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

import TestHelpers from './helpers';

import TermsOfUseModal from './pages/modals/TermsOfUseModal';

const GOERLI = 'Goerli Test Network';

const LOCALHOST_URL = 'http://localhost:8545/';

// detox on ios does not have a clean way of interacting with webview eleemnts. You would need to tap by coordinates
export const testDappConnectButtonCooridinates = { x: 170, y: 280 };
export const testDappSendEIP1559ButtonCoordinates = { x: 320, y: 500 };

export const acceptTermOfUse = async () => {
  // tap on accept term of use screen
  await TestHelpers.delay(3500);
  await TermsOfUseModal.isDisplayed();
  await TermsOfUseModal.tapScrollEndButton();
  await TermsOfUseModal.tapAgreeCheckBox();
  await TermsOfUseModal.tapAcceptButton();
  await TermsOfUseModal.isNotDisplayed();
};

export const importWalletWithRecoveryPhrase = async () => {
  const validAccount = Accounts.getValidAccount();

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

export const addLocalhostNetwork = async () => {
  await WalletView.tapDrawerButton();
  await DrawerView.isVisible();
  await DrawerView.tapSettings();

  await SettingsView.tapNetworks();

  await NetworkView.isNetworkViewVisible();

  await TestHelpers.delay(3000);
  await NetworkView.tapAddNetworkButton();
  await NetworkView.switchToCustomNetworks();

  await NetworkView.typeInNetworkName('Localhost');
  await NetworkView.typeInRpcUrl(LOCALHOST_URL);
  await NetworkView.typeInChainId('1337');
  await NetworkView.typeInNetworkSymbol('ETH\n');

  await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
  await NetworkView.tapRpcNetworkAddButton();

  await NetworkEducationModal.isVisible();
  await NetworkEducationModal.isNetworkNameCorrect('Localhost');
  await NetworkEducationModal.tapGotItButton();
  await NetworkEducationModal.isNotVisible();
};

export const switchToGoreliNetwork = async () => {
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.changeNetwork(GOERLI);
  await WalletView.isNetworkNameVisible(GOERLI);
  await NetworkEducationModal.tapGotItButton();
};
