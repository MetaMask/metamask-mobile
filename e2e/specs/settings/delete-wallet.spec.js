'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import LoginView from '../../pages/wallet/LoginView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../../pages/Settings/SecurityAndPrivacy/ChangePasswordView';
import ForgotPasswordModal from '../../pages/Common/ForgotPasswordModalView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ToastModal from '../../pages/wallet/ToastModal';

describe(
  Regression('Log in into the app, change password then delete wallet flow'),
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
        await ChangePasswordView.typeInConfirmPasswordInputBox(NEW_PASSWORD);
        await ChangePasswordView.reEnterPassword(NEW_PASSWORD);
        await ChangePasswordView.tapIUnderstandCheckBox();
        await ChangePasswordView.tapSubmitButton();

        // bug on CI when tap wallet button makes change password continue
        // github issue: https://github.com/MetaMask/metamask-mobile/issues/16758
        // TODO: remove this once the issue is fixed
        if (device.getPlatform() === 'ios' && process.env.CI) {
          await TabBarComponent.tapWallet();
        }
    
        //wait for screen transitions after password change
        await Assertions.checkIfNotVisible(ChangePasswordView.submitButton, 25000);
        await Assertions.checkIfVisible(ToastModal.notificationTitle);
        await Assertions.checkIfNotVisible(ToastModal.notificationTitle);
        await Assertions.checkIfVisible(SecurityAndPrivacyView.securityAndPrivacyHeading);

        // should lock wallet from Settings
        // TODO: remove the condition but keep the step once the issue above is fixed
        // Skip back button tap only on iOS CI, execute otherwise
        if (!(device.getPlatform() === 'ios' && process.env.CI)) {
          await CommonView.tapBackButton();
        }
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.checkIfVisible(LoginView.container);

        // should tap reset wallet button
        await LoginView.tapResetWalletButton();

        // should reset wallet
        await ForgotPasswordModal.tapResetWalletButton();
        await ForgotPasswordModal.tapYesResetWalletButton();
        await Assertions.checkIfVisible(OnboardingView.container);
      });
    });
  },
);
