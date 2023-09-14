'use strict';

import TestHelpers from '../helpers';
import { Smoke } from '../tags';

import OnboardingView from '../pages/Onboarding/OnboardingView';

import LoginView from '../pages/LoginView';

import SettingsView from '../pages/Drawer/Settings/SettingsView';

import SecurityAndPrivacyView from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../pages/Drawer/Settings/SecurityAndPrivacy/ChangePasswordView';

import DeleteWalletModal from '../pages/modals/DeleteWalletModal';
import { loginToApp } from '../viewHelper';
// import TabBarComponent from '../pages/TabBarComponent';
import FixtureBuilder from '../fixtures/fixture-builder';
import { withFixtures } from '../fixtures/fixture-helper';

describe(
  Smoke('Log in into the app, change password then delete wallet flow'),
  () => {
    const PASSWORD = '123123123';

    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should log in into the app, change password then delete wallet flow', async () => {
      const fixture = new FixtureBuilder().build();
      await withFixtures({ fixture, restartDevice: true }, async () => {
        await loginToApp();

        // should go to settings then security & privacy
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacyView.scrollToChangePasswordView();
        await SecurityAndPrivacyView.isChangePasswordSectionVisible();

        // should confirm password before changing it
        await SecurityAndPrivacyView.tapChangePasswordButton();

        await ChangePasswordView.isVisible();
        await ChangePasswordView.typeInConfirmPasswordInputBox(PASSWORD);

        // should change the password
        const NEW_PASSWORD = '11111111';
        await ChangePasswordView.tapIUnderstandCheckBox();
        await ChangePasswordView.enterPassword(NEW_PASSWORD);
        await ChangePasswordView.reEnterPassword(NEW_PASSWORD);

        if ((await device.getPlatform) === 'ios') {
          await ChangePasswordView.tapResetPasswordButton();
        }

        // should lock wallet from Settings
        await device.disableSynchronization(); // because the SRP tutorial video prevents the test from moving forward
        await SecurityAndPrivacyView.tapBackButton();
        await device.enableSynchronization();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await LoginView.isVisible();

        // should tap reset wallet button
        await LoginView.tapResetWalletButton();

        await DeleteWalletModal.isVisible();

        // should delete wallet
        await DeleteWalletModal.tapIUnderstandButton();
        await DeleteWalletModal.typeDeleteInInputBox();
        await DeleteWalletModal.tapDeleteMyWalletButton();
        await TestHelpers.delay(2000);
        await OnboardingView.isVisible();
      });
    });
  },
);
