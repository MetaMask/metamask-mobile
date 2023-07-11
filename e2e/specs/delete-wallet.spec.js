'use strict';

import TestHelpers from '../helpers';
import { Smoke } from '../tags';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import LoginView from '../pages/LoginView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';

import SecurityAndPrivacyView from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../pages/Drawer/Settings/SecurityAndPrivacy/ChangePasswordView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import DeleteWalletModal from '../pages/modals/DeleteWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import { acceptTermOfUse } from '../viewHelper';
import Accounts from '../../wdio/helpers/Accounts';
import TabBarComponent from '../pages/TabBarComponent';

describe(
  Smoke(
    'Import wallet with 24 word SRP, change password then delete wallet flow',
  ),
  () => {
    let validAccount;

    beforeAll(() => {
      validAccount = Accounts.getValidAccount();
    });

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
      await acceptTermOfUse();

      await ImportWalletView.isVisible();
    });

    it('should import wallet with valid secret recovery phrase and password', async () => {
      await ImportWalletView.clearSecretRecoveryPhraseInputBox();
      await ImportWalletView.enterSecretRecoveryPhrase(validAccount.seedPhrase);
      await ImportWalletView.enterPassword(validAccount.password);
      await ImportWalletView.reEnterPassword(validAccount.password);
    });
    it('Should dismiss Automatic Security checks screen', async () => {
      await TestHelpers.delay(3500);
      await EnableAutomaticSecurityChecksView.isVisible();
      await EnableAutomaticSecurityChecksView.tapNoThanks();
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

    it('should tap on "Got it" to dimiss the whats new modal', async () => {
      // dealing with flakiness on bitrise.
      await TestHelpers.delay(2500);
      try {
        await WhatsNewModal.isVisible();
        await WhatsNewModal.tapCloseButton();
      } catch {
        //
      }
    });

    it('should go to settings then security & privacy', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.tapSecurityAndPrivacy();
      await SecurityAndPrivacyView.scrollToChangePasswordView();
      await SecurityAndPrivacyView.isChangePasswordSectionVisible();
    });

    it('should confirm password before changing it', async () => {
      await SecurityAndPrivacyView.tapChangePasswordButton();

      await ChangePasswordView.isVisible();
      await ChangePasswordView.typeInConfirmPasswordInputBox(
        validAccount.password,
      );
      //await ChangePasswordView.tapConfirmButton();
    });

    it('should change the password', async () => {
      const NEW_PASSWORD = '11111111';
      await ChangePasswordView.enterPassword(NEW_PASSWORD);
      await ChangePasswordView.reEnterPassword(NEW_PASSWORD);
      await ChangePasswordView.tapIUnderstandCheckBox();

      await ChangePasswordView.tapResetPasswordButton();
    });

    it('should lock wallet from Settings', async () => {
      await device.disableSynchronization(); // because the SRP tutorial video prevents the test from moving forward
      await SecurityAndPrivacyView.tapBackButton();
      await device.enableSynchronization();
      await SettingsView.tapLock();
      await SettingsView.tapYesAlertButton();
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
  },
);
