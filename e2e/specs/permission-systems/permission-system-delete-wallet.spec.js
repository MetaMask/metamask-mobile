'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import WalletView from '../../pages/WalletView';
import Browser from '../../pages/Browser/BrowserView';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/TabBarComponent';
import SkipAccountSecurityModal from '../../pages/modals/SkipAccountSecurityModal';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';
import DeleteWalletModal from '../../pages/modals/DeleteWalletModal';
import LoginView from '../../pages/LoginView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import ProtectYourWalletModal from '../../pages/modals/ProtectYourWalletModal';
import OnboardingSuccessView from '../../pages/Onboarding/OnboardingSuccessView';
import Assertions from '../../utils/Assertions';
import CommonView from '../../pages/CommonView';

const PASSWORD = '12345678';

describe(
  Regression('Permission System: Deleting wallet after connecting to a dapp'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('should no longer be connected to the dapp after deleting and creating a new wallet', async () => {
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
          await LoginView.isVisible();

          // should tap reset wallet button
          await LoginView.tapResetWalletButton();

          await Assertions.checkIfVisible(DeleteWalletModal.container);

          //Delete wallet
          await DeleteWalletModal.tapIUnderstandButton();
          await DeleteWalletModal.typeDeleteInInputBox();
          await DeleteWalletModal.tapDeleteMyWalletButton();
          await TestHelpers.delay(2000);
          await Assertions.checkIfVisible(OnboardingView.container);
          if (device.getPlatform() === 'ios') {
            await Assertions.checkIfVisible(await CommonView.toast);
          }
          await Assertions.checkIfNotVisible(await CommonView.toast);
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
          await WalletView.isVisible();
          await ProtectYourWalletModal.tapRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();

          //should no longer be connected to the  dapp
          await TabBarComponent.tapBrowser();
          await Assertions.checkIfVisible(Browser.browserScreenID);
          await Browser.tapNetworkAvatarButtonOnBrowser();
          await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
          await Assertions.checkIfVisible(NetworkListModal.testNetToggle);
        },
      );
    });
  },
);
