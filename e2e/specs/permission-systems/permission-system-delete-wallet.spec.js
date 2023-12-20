'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import OnboardingView from '../../pages/Onboarding/OnboardingView';
import ProtectYourWalletView from '../../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../../pages/Onboarding/CreatePasswordView';
import WalletView from '../../pages/WalletView';
import Browser from '../../pages/Drawer/Browser';
import SettingsView from '../../pages/Drawer/Settings/SettingsView';
import TabBarComponent from '../../pages/TabBarComponent';
import SkipAccountSecurityModal from '../../pages/modals/SkipAccountSecurityModal';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';
import DeleteWalletModal from '../../pages/modals/DeleteWalletModal';
import SecurityAndPrivacyView from '../../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import MetaMetricsOptIn from '../../pages/Onboarding/MetaMetricsOptInView';
import ProtectYourWalletModal from '../../pages/modals/ProtectYourWalletModal';

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
          await Browser.isVisible();
          await Browser.navigateToTestDApp();
          await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
          await ConnectedAccountsModal.isVisible();
          await NetworkListModal.isNotVisible();
          await ConnectedAccountsModal.scrollToBottomOfModal();

          //go to settings then security & privacy
          await TabBarComponent.tapSettings();
          await SettingsView.tapSecurityAndPrivacy();
          await SecurityAndPrivacyView.scrollToChangePasswordView();
          await expect(
            await SecurityAndPrivacyView.changePasswordSection,
          ).toBeVisible();
          await SecurityAndPrivacyView.scrollToDeleteWalletButton();
          await SecurityAndPrivacyView.tapDeleteWalletButton();

          //Delete wallet
          await DeleteWalletModal.tapIUnderstandButton();
          await DeleteWalletModal.typeDeleteInInputBox();
          await DeleteWalletModal.tapDeleteMyWalletButton();
          await TestHelpers.delay(2000);
          await OnboardingView.isVisible();
          await OnboardingView.deleteWalletToastIsNotVisible();
          await OnboardingView.tapCreateWallet();

          //Create new wallet
          await MetaMetricsOptIn.isVisible();
          await MetaMetricsOptIn.tapAgreeButton();
          await CreatePasswordView.isVisible();
          await CreatePasswordView.enterPassword(PASSWORD);
          await CreatePasswordView.reEnterPassword(PASSWORD);
          await CreatePasswordView.tapIUnderstandCheckBox();
          await CreatePasswordView.tapCreatePasswordButton();
          await ProtectYourWalletView.isVisible();
          await ProtectYourWalletView.tapOnRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();
          await WalletView.isVisible();
          await ProtectYourWalletModal.tapRemindMeLaterButton();
          await SkipAccountSecurityModal.tapIUnderstandCheckBox();
          await SkipAccountSecurityModal.tapSkipButton();

          //should no longer be connected to the  dapp
          await TabBarComponent.tapBrowser();
          await Browser.isVisible();
          await Browser.tapNetworkAvatarButtonOnBrowser();
          await ConnectedAccountsModal.isNotVisible();
          await NetworkListModal.isVisible();
        },
      );
    });
  },
);
