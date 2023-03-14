'use strict';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';

import TestHelpers from '../helpers';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
// import DrawerView from '../pages/Drawer/DrawerView';/

const SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';
const PASSWORD = `12345678`;

/* BROKEN. We need to revisit. Deep linking to a contract address does not work on a sim. */

describe('Send ERC Token', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import via seed phrase and validate in settings', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await ImportWalletView.isVisible();
  });

  it('should import wallet with valid secret recovery phrase', async () => {
    await ImportWalletView.enterSecretRecoveryPhrase(SECRET_RECOVERY_PHRASE);
    await ImportWalletView.enterPassword(PASSWORD);
    await ImportWalletView.reEnterPassword(PASSWORD);
    // await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
    await WalletView.isVisible();
    await TestHelpers.delay(3500);
  });

  it('Add custom network', async () => {
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
    await WalletView.tapSendButton();
  });
});
