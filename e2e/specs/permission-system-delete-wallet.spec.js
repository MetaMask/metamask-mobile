'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import WalletView from '../pages/WalletView';

import Browser from '../pages/Drawer/Browser';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

import TabBarComponent from '../pages/TabBarComponent';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import ConnectModal from '../pages/modals/ConnectModal';
import DeleteWalletModal from '../pages/modals/DeleteWalletModal';
import SecurityAndPrivacyView from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import NetworkListModal from '../pages/modals/NetworkListModal';

import {
  importWalletWithRecoveryPhrase,
  testDappConnectButtonCooridinates,
} from '../viewHelper';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';
const PASSWORD = '12345678';
describe(
  Regression('Permission System: Deleting wallet after connecting to a dapp'),
  () => {
    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase();
    });

    it('should navigate to browser', async () => {
      await TabBarComponent.tapBrowser();
      await Browser.isVisible();
    });

    it('should connect to the test dapp', async () => {
      await TestHelpers.delay(3000);
      // Tap on search in bottom navbar
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(TEST_DAPP);
      await TestHelpers.delay(3000);
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappConnectButtonCooridinates,
      );
      await ConnectModal.isVisible();
      await ConnectModal.tapConnectButton();
    });
    it('should go to settings then security & privacy', async () => {
      await TestHelpers.delay(3500); // need a better way to wait until the toast message disappear

      await TabBarComponent.tapSettings();
      await SettingsView.tapSecurityAndPrivacy();
    });

    it('should delete wallet from settings and privacy view', async () => {
      await SecurityAndPrivacyView.scrollToChangePasswordView();
      await SecurityAndPrivacyView.isChangePasswordSectionVisible();
      await SecurityAndPrivacyView.scrollToDeleteWalletButton();
      await SecurityAndPrivacyView.tapDeleteWalletButton();
    });

    it('should delete wallet', async () => {
      await DeleteWalletModal.tapIUnderstandButton();
      await DeleteWalletModal.typeDeleteInInputBox();
      await DeleteWalletModal.tapDeleteMyWalletButton();
      await TestHelpers.delay(2000);
      await OnboardingView.isVisible();
    });

    it('should create new wallet', async () => {
      await OnboardingView.deleteWalletToastisNotVisible();
      await OnboardingView.tapCreateWallet();

      await CreatePasswordView.isVisible();
      await CreatePasswordView.enterPassword(PASSWORD);
      await CreatePasswordView.reEnterPassword(PASSWORD);
      await CreatePasswordView.tapIUnderstandCheckBox();
      await CreatePasswordView.tapCreatePasswordButton();
    });

    it('Should skip backup check', async () => {
      await ProtectYourWalletView.isVisible();
      await ProtectYourWalletView.tapOnRemindMeLaterButton();

      await SkipAccountSecurityModal.tapIUnderstandCheckBox();
      await SkipAccountSecurityModal.tapSkipButton();
      await WalletView.isVisible();
    });

    it('should go to browser', async () => {
      await TabBarComponent.tapBrowser();
      await Browser.isVisible();
    });

    it('should no longer be connected to the  dapp', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await ConnectedAccountsModal.isNotVisible();
      await NetworkListModal.isVisible();
    });
  },
);
