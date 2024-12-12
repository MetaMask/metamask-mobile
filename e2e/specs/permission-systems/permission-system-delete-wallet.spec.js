'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import WalletView from '../../pages/wallet/WalletView';
import Browser from '../../pages/Browser/BrowserView';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SkipAccountSecurityModal from '../../pages/Onboarding/SkipAccountSecurityModal';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import DeleteWalletModal from '../../pages/Settings/SecurityAndPrivacy/DeleteWalletModal';
import LoginView from '../../pages/wallet/LoginView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import ProtectYourWalletModal from '../../pages/Onboarding/ProtectYourWalletModal';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import Assertions from '../../utils/Assertions';
import ToastModal from '../../pages/wallet/ToastModal';

const PASSWORD = '12345678';

describe(Regression('Permission System'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should no longer be connected to the dapp after deleting wallet', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        //validate connection to test dapp
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
        await ConnectedAccountsModal.scrollToBottomOfModal();
        await TestHelpers.delay(2000);

        //go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.checkIfVisible(LoginView.container);

        // should tap reset wallet button
        await LoginView.tapResetWalletButton();

        await Assertions.checkIfVisible(DeleteWalletModal.container);

        //Delete wallet
        await DeleteWalletModal.tapIUnderstandButton();
        await DeleteWalletModal.typeDeleteInInputBox();
        await DeleteWalletModal.tapDeleteMyWalletButton();
        await Assertions.checkIfNotVisible(DeleteWalletModal.container);
        await TestHelpers.delay(2000);
        await Assertions.checkIfVisible(OnboardingView.container);
        if (device.getPlatform() === 'ios') {
          await Assertions.checkIfVisible(ToastModal.notificationTitle);
          await Assertions.checkIfNotVisible(ToastModal.notificationTitle);
        } else {
          await TestHelpers.delay(3000);
        }
        await OnboardingView.tapCreateWallet();

        // Create new wallet
        await Assertions.checkIfVisible(MetaMetricsOptIn.container);
        await MetaMetricsOptIn.tapAgreeButton();
        await Assertions.checkIfVisible(CreatePasswordView.container);
        await CreatePasswordView.enterPassword(PASSWORD);
        await CreatePasswordView.reEnterPassword(PASSWORD);
        await CreatePasswordView.tapIUnderstandCheckBox();
        await CreatePasswordView.tapCreatePasswordButton();
        await Assertions.checkIfVisible(ProtectYourWalletView.container);
        await ProtectYourWalletView.tapOnRemindMeLaterButton();
        await SkipAccountSecurityModal.tapIUnderstandCheckBox();
        await SkipAccountSecurityModal.tapSkipButton();
        await OnboardingSuccessView.tapDone();
        await Assertions.checkIfVisible(WalletView.container);
        await ProtectYourWalletModal.tapRemindMeLaterButton();
        await SkipAccountSecurityModal.tapIUnderstandCheckBox();
        await SkipAccountSecurityModal.tapSkipButton();

        //should no longer be connected to the  dapp
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.checkIfVisible(NetworkListModal.testNetToggle);
      },
    );
  });
});
