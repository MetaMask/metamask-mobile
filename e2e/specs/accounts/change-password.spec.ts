import { SmokeAccounts } from '../../tags.js';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import Matchers from '../../../tests/framework/Matchers';
import Assertions from '../../../tests/framework/Assertions';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import WalletView from '../../pages/wallet/WalletView';
import ChangePasswordView from '../../pages/Settings/SecurityAndPrivacy/ChangePasswordView';
import LoginView from '../../pages/wallet/LoginView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ToastModal from '../../pages/wallet/ToastModal';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';

describe(SmokeAccounts('change password'), () => {
  const PASSWORD = '123123123';
  const NEWPASSWORD = '123412341234';

  it('updates password', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.scrollToChangePassword();
        await SecurityAndPrivacy.tapChangePassword();

        // This is the confirming old password
        await ChangePasswordView.typeInConfirmPasswordInputBox(PASSWORD);

        // Creating new password
        await ChangePasswordView.typeInConfirmPasswordInputBox(NEWPASSWORD);
        await ChangePasswordView.reEnterPassword(NEWPASSWORD);
        await ChangePasswordView.tapIUnderstandCheckBox();
        await ChangePasswordView.tapSubmitButton();

        // bug on CI when tap wallet button makes change password continue
        // github issue: https://github.com/MetaMask/metamask-mobile/issues/16758
        // TODO: remove this once the issue is fixed
        if (device.getPlatform() === 'ios' && process.env.CI) {
          await TabBarComponent.tapWallet();
        }

        //wait for screen transitions after password change
        await Assertions.expectElementToNotBeVisible(
          ChangePasswordView.submitButton,
          { timeout: 25000 },
        );
        await Assertions.expectElementToBeVisible(ToastModal.notificationTitle);
        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );

        await TabBarComponent.tapWallet();
        await WalletView.tapIdenticon();

        // Check if all the accounts are displayed
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 1'),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 2'),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 2', 1),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 1', 1),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('QR'),
        );

        await AccountListBottomSheet.swipeToDismissAccountsModal();

        // Lock the app and verify again the accounts are still there
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await LoginView.enterPassword(NEWPASSWORD);

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 1'),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 2'),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 2', 1),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('Account 1', 1),
        );
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText('QR'),
        );
      },
    );
  });
});
