'use strict';

import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper.js';
import FixtureServer from '../../fixtures/fixture-server.js';
import { getFixturesServerPort } from '../../fixtures/utils.js';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import WalletView from '../../pages/wallet/WalletView.js';
import ChangePasswordView from '../../pages/Settings/SecurityAndPrivacy/ChangePasswordView.js';
import LoginView from '../../pages/wallet/LoginView.js';
import Matchers from '../../utils/Matchers.js';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import Assertions from '../../utils/Assertions.js';
import ToastModal from '../../pages/wallet/ToastModal.js';

const fixtureServer = new FixtureServer();
describe(Regression('change password'), () => {
  const PASSWORD = '123123123';
  const NEWPASSWORD = '123412341234';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('updates password', async () => {
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
    await Assertions.checkIfNotVisible(ChangePasswordView.submitButton, 25000);
    await Assertions.checkIfVisible(ToastModal.notificationTitle);
    await Assertions.checkIfNotVisible(ToastModal.notificationTitle);

    await TabBarComponent.tapWallet();
    await WalletView.tapIdenticon();

    // Check if all the accounts are displayed
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 1'));
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 2'));
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 3'));
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 4'));
    await Assertions.checkIfVisible(Matchers.getElementByText('QR 1'));

    await AccountListBottomSheet.swipeToDismissAccountsModal();

    // Lock the app and verify again the accounts are still there
    await TabBarComponent.tapSettings();
    await SettingsView.tapLock();
    await SettingsView.tapYesAlertButton();
    await LoginView.enterPassword(NEWPASSWORD);

    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 1'));
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 2'));
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 3'));
    await Assertions.checkIfVisible(Matchers.getElementByText('Account 4'));
    await Assertions.checkIfVisible(Matchers.getElementByText('QR 1'));
  });
});
