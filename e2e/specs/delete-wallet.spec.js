'use strict';

import TestHelpers from '../helpers';
import { Smoke } from '../tags';

import OnboardingView from '../pages/Onboarding/OnboardingView';

import LoginView from '../pages/LoginView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';

import SecurityAndPrivacyView from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../pages/Drawer/Settings/SecurityAndPrivacy/ChangePasswordView';

import DeleteWalletModal from '../pages/modals/DeleteWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import { importWalletWithRecoveryPhrase } from '../viewHelper';
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
    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase();
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
      await ChangePasswordView.tapIUnderstandCheckBox();
      await ChangePasswordView.enterPassword(NEW_PASSWORD);
      await ChangePasswordView.reEnterPassword(NEW_PASSWORD);

      if ((await device.getPlatform) === 'ios') {
        await ChangePasswordView.tapResetPasswordButton();
      }
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
