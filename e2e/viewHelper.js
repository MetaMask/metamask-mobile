'use strict';

import EnableAutomaticSecurityChecksView from './pages/EnableAutomaticSecurityChecksView';
import ImportWalletView from './pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from './pages/Onboarding/MetaMetricsOptInView';
import NetworkEducationModal from './pages/modals/NetworkEducationModal';
import NetworkListModal from './pages/modals/NetworkListModal';
import OnboardingView from './pages/Onboarding/OnboardingView';
import OnboardingCarouselView from './pages/Onboarding/OnboardingCarouselView';
import OnboardingWizardModal from './pages/modals/OnboardingWizardModal';
import WalletView from './pages/WalletView';
import WhatsNewModal from './pages/modals/WhatsNewModal';
import Accounts from '../wdio/helpers/Accounts';

import TestHelpers from './helpers';

import TermsOfUseModal from './pages/modals/TermsOfUseModal';

const GOERLI = 'Goerli Test Network';
const validAccount = Accounts.getValidAccount();

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
  await EnableAutomaticSecurityChecksView.tapNoThanks();

  // should tap on the close button to dismiss the whats new modal
  await TestHelpers.delay(2500);
  try {
    await WhatsNewModal.tapCloseButton();
  } catch {
    //
  }

  // should dismiss the onboarding wizard
  // dealing with flakiness on bitrise.
  await TestHelpers.delay(1000);
  try {
    await OnboardingWizardModal.tapNoThanksButton();
  } catch {
    //
  }
};

export const switchToGoreliNetwork = async () => {
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.changeNetwork(GOERLI);
  await WalletView.isNetworkNameVisible(GOERLI);
  await NetworkEducationModal.tapGotItButton();
};
