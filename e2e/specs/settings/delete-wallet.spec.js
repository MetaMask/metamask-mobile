'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import LoginView from '../../pages/wallet/LoginView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../../pages/Settings/SecurityAndPrivacy/ChangePasswordView';
import DeleteWalletModal from '../../pages/Settings/SecurityAndPrivacy/DeleteWalletModal';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';

describe(
  SmokeCore('Log in into the app, change password then delete wallet flow'),
  () => {
    const PASSWORD = '123123123';

    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('should log in into the app, change password then delete wallet flow', async () => {
      const fixture = new FixtureBuilder().build();
      await withFixtures({ fixture, restartDevice: true }, async () => {
        await loginToApp();

        // should go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacyView.scrollToChangePasswordView();
        await Assertions.checkIfVisible(
          SecurityAndPrivacyView.changePasswordSection,
        );

        // should confirm password before changing it
        await SecurityAndPrivacyView.tapChangePasswordButton();

        await Assertions.checkIfVisible(ChangePasswordView.title);
        await ChangePasswordView.typeInConfirmPasswordInputBox(PASSWORD);

        // should change the password
        const NEW_PASSWORD = '11111111';
        await ChangePasswordView.tapIUnderstandCheckBox();
        await ChangePasswordView.typeInConfirmPasswordInputBox(NEW_PASSWORD);
        await ChangePasswordView.reEnterPassword(NEW_PASSWORD);

        // should lock wallet from Settings
        await CommonView.tapBackButton();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.checkIfVisible(LoginView.container);

        // should tap reset wallet button
        await LoginView.tapResetWalletButton();

        await Assertions.checkIfVisible(DeleteWalletModal.container);

        // should delete wallet
        await DeleteWalletModal.tapIUnderstandButton();
        await DeleteWalletModal.typeDeleteInInputBox();
        await DeleteWalletModal.tapDeleteMyWalletButton();
        await Assertions.checkIfVisible(OnboardingView.container);
      });
    });
  },
);
