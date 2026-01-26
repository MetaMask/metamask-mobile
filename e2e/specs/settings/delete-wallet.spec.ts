import { RegressionWalletPlatform } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import LoginView from '../../pages/wallet/LoginView';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacyView from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../../pages/Settings/SecurityAndPrivacy/ChangePasswordView';
import ForgotPasswordModal from '../../pages/Common/ForgotPasswordModalView';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import CommonView from '../../pages/CommonView';
import Assertions from '../../../tests/framework/Assertions';
import ToastModal from '../../pages/wallet/ToastModal';

describe(
  RegressionWalletPlatform(
    'Log in into the app, change password then delete wallet flow',
  ),
  () => {
    const PASSWORD = '123123123';

    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('should log in into the app, change password then delete wallet flow', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // should go to settings then security & privacy
          await TabBarComponent.tapSettings();
          await SettingsView.tapSecurityAndPrivacy();
          await SecurityAndPrivacyView.scrollToChangePasswordView();
          await Assertions.expectElementToBeVisible(
            SecurityAndPrivacyView.changePasswordSection,
          );

          // should confirm password before changing it
          await SecurityAndPrivacyView.tapChangePasswordButton();

          await Assertions.expectElementToBeVisible(ChangePasswordView.title);
          await ChangePasswordView.typeInConfirmPasswordInputBox(PASSWORD);

          // should change the password
          const NEW_PASSWORD = '11111111';
          await ChangePasswordView.typeInConfirmPasswordInputBox(NEW_PASSWORD);
          await ChangePasswordView.reEnterPassword(NEW_PASSWORD);
          await ChangePasswordView.tapIUnderstandCheckBox();
          await ChangePasswordView.tapSubmitButton();

          //wait for screen transitions after password change
          await Assertions.expectElementToNotBeVisible(
            ChangePasswordView.submitButton,
          );
          await Assertions.expectElementToBeVisible(
            ToastModal.notificationTitle,
          );
          await Assertions.expectElementToNotBeVisible(
            ToastModal.notificationTitle,
          );
          await Assertions.expectElementToBeVisible(
            SecurityAndPrivacyView.securityAndPrivacyHeading,
          );

          // should lock wallet from Settings
          // TODO: remove the condition but keep the step once the issue above is fixed
          // Skip back button tap only on iOS CI, execute otherwise
          if (!(device.getPlatform() === 'ios' && process.env.CI)) {
            await CommonView.tapBackButton();
          }
          await SettingsView.tapLock();
          await SettingsView.tapYesAlertButton();
          await Assertions.expectElementToBeVisible(LoginView.container);

          // should tap reset wallet button
          await LoginView.tapForgotPassword();

          // should reset wallet
          await ForgotPasswordModal.tapResetWalletButton();
          await ForgotPasswordModal.tapYesResetWalletButton();
          await Assertions.expectElementToBeVisible(OnboardingView.container);
        },
      );
    });
  },
);
