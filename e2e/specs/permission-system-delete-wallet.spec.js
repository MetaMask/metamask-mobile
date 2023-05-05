'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import WalletView from '../pages/WalletView';
import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

import TabBarComponent from '../pages/TabBarComponent';

import LoginView from '../pages/LoginView';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import ConnectModal from '../pages/modals/ConnectModal';
import DeleteWalletModal from '../pages/modals/DeleteWalletModal';
import DrawerView from '../pages/Drawer/DrawerView';
import NetworkListModal from '../pages/modals/NetworkListModal';

import {
  importWalletWithRecoveryPhrase,
  testDappConnectButtonCooridinates,
} from '../viewHelper';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';
const PASSWORD = '12345678';
describe(
  Regression('Onboarding wizard opt-in, metametrics opt out from settings'),
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

    it('should navigate to wallet view', async () => {
      await TestHelpers.delay(3000);
      await TabBarComponent.tapWallet();
      // Check that we are on the browser screen
      await WalletView.isVisible();
    });

    it('should open drawer and log out', async () => {
      await WalletView.tapDrawerButton();
      await DrawerView.isVisible();
      await DrawerView.tapLockAccount();
      await DrawerView.tapYesAlertButton();
      await LoginView.isVisible();
    });

    it('should tap reset wallet button', async () => {
      await LoginView.tapResetWalletButton();

      await DeleteWalletModal.isVisible();
    });
    it('should delete wallet', async () => {
      await DeleteWalletModal.tapIUnderstandButton();
      await DeleteWalletModal.typeDeleteInInputBox();
      await DeleteWalletModal.tapDeleteMyWalletButton();
      await OnboardingView.isDeleteWalletToastVisible();
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
      await NetworkListModal.tapNetworkListCloseIcon();
    });
  },
);
