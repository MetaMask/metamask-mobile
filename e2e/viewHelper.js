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

import TestHelpers from './helpers';
import TermsOfUseModal from './pages/Onboarding/TermsOfUseModal';

const GOERLI = 'Goerli Test Network';
const PASSWORD = '12345678';
const SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';

export const acceptTermOfUse = async () => {
  // tap on accept term of use screen
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

  await acceptTermOfUse();
  // should import wallet with secret recovery phrase
  await ImportWalletView.clearSecretRecoveryPhraseInputBox();
  await ImportWalletView.enterSecretRecoveryPhrase(SECRET_RECOVERY_PHRASE);
  await ImportWalletView.enterPassword(PASSWORD);
  await ImportWalletView.reEnterPassword(PASSWORD);

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
