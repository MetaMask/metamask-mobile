'use strict';

import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import LoginView from '../pages/LoginView';

import DrawerView from '../pages/Drawer/DrawerView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';

import SecurityAndPrivacyView from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../pages/Drawer/Settings/SecurityAndPrivacy/ChangePasswordView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import DeleteWalletModal from '../pages/modals/DeleteWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

const SECRET_RECOVERY_PHRASE =
  'ketchup width ladder rent cheap eye torch employ quantum evidence artefact render protect delay wrap identify valley umbrella yard ridge wool swap differ kidney';
const PASSWORD = `12345678`;

describe('Import wallet with 24 word SRP, change password then delete wallet flow', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should go to import wallet view', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await ImportWalletView.isVisible();
  });

  it('should import wallet with valid secret recovery phrase and password', async () => {
    await ImportWalletView.clearSecretRecoveryPhraseInputBox();
    await ImportWalletView.enterSecretRecoveryPhrase(SECRET_RECOVERY_PHRASE);
    await ImportWalletView.enterPassword(PASSWORD);
    await ImportWalletView.reEnterPassword(PASSWORD);
  });
  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should tap on "Got it" to dimiss the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapGotItButton();
    } catch {
      //
    }
  });

  it('should dismiss the onboarding wizard', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(1000);
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
  });

  it('should go to settings then security & privacy', async () => {
    // Open Drawer
    await WalletView.tapDrawerButton(); // tapping burger menu

    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapSecurityAndPrivacy();
    await SecurityAndPrivacyView.scrollToChangePasswordView();

    await SecurityAndPrivacyView.isChangePasswordSectionVisible();
  });

  it('should confirm password before changing it', async () => {
    await SecurityAndPrivacyView.tapChangePasswordButton();

    await ChangePasswordView.isVisible();
    await ChangePasswordView.typeInConfirmPasswordInputBox(PASSWORD);
    //await ChangePasswordView.tapConfirmButton();
  });

  it('should change the password', async () => {
    const NEW_PASSWORD = '11111111';
    await ChangePasswordView.enterPassword(NEW_PASSWORD);
    await ChangePasswordView.reEnterPassword(NEW_PASSWORD);
    await ChangePasswordView.tapIUnderstandCheckBox();

    await ChangePasswordView.tapResetPasswordButton();
  });

  it('should open drawer and log out', async () => {
    await device.disableSynchronization(); // because the SRP tutorial video prevents the test from moving forward
    await SecurityAndPrivacyView.tapBackButton();
    await device.enableSynchronization();

    await SettingsView.tapCloseButton();

    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapLockAccount();
    await DrawerView.tapYesAlertButton();
    await LoginView.isVisible();
  });

  it('should tap reset wallet button', async () => {
    await LoginView.tapResetWalletButton();

    await DeleteWalletModal.isVisible();
  });
  it('should delete wallet', async () => {
    await DeleteWalletModal.tapIUnderstandButton();
    await DeleteWalletModal.typeDeleteInInputBox();
    await DeleteWalletModal.tapDeleteMyWalletButton();
    await TestHelpers.delay(2000);
    await OnboardingView.isVisible();
  });
});
