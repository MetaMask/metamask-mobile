'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';
import WalletView from '../pages/WalletView';
import ImportAccountView from '../pages/ImportAccountView';
import TabBarComponent from '../pages/TabBarComponent';

import Browser from '../pages/Drawer/Browser';
import AccountListView from '../pages/AccountListView';

import ConnectModal from '../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';

import Accounts from '../../wdio/helpers/Accounts';

import { importWalletWithRecoveryPhrase } from '../viewHelper';

const SEPOLIA = 'Sepolia Test Network';

const accountPrivateKey = Accounts.getAccountPrivateKey();
describe(
  Regression(
    'Permission System Test: Revoking accounts after connecting to a dapp',
  ),
  () => {
    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase();
    });

    it('should navigate to browser', async () => {
      await TestHelpers.delay(2000);
      await TabBarComponent.tapBrowser();
      await Browser.isVisible();
    });

    it('should trigger connect modal in the test dapp', async () => {
      await TestHelpers.delay(3000);
      await Browser.goToTestDappAndTapConnectButton();
    });

    it('should go to multiconnect in the connect account modal', async () => {
      await TestHelpers.delay(3000);
      await ConnectModal.tapConnectMultipleAccountsButton();
    });

    it('should import account', async () => {
      await AccountListView.tapAddAccountButton();

      await AccountListView.tapImportAccountButton();
      await ImportAccountView.isVisible();
      await ImportAccountView.enterPrivateKey(accountPrivateKey.keys);
      await ImportAccountView.isImportSuccessSreenVisible();
      await ImportAccountView.tapCloseButtonOnImportSuccess();
    });

    it('should connect multiple accounts to a dapp', async () => {
      await ConnectModal.tapSelectAllButton();

      await ConnectModal.tapAccountConnectMultiSelectButton();
    });

    it('should switch to Sepolia', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
      await ConnectedAccountsModal.tapNetworksPicker();
      await NetworkListModal.isVisible();
      await TestHelpers.delay(2000);
      await NetworkListModal.tapTestNetworkSwitch();
      await NetworkListModal.changeNetwork(SEPOLIA);
    });

    it('should dismiss the network education modal', async () => {
      await NetworkEducationModal.isVisible();
      await NetworkEducationModal.tapGotItButton();
      await NetworkEducationModal.isNotVisible();
    });

    it('should set the imported account as primary account', async () => {
      await TestHelpers.delay(1500);
      await ConnectedAccountsModal.tapToSetAsPrimaryAccount();
    });

    it('should navigate to wallet view', async () => {
      await TestHelpers.delay(1500);
      await TabBarComponent.tapWallet();
      await WalletView.isVisible();
    });

    it('should remove imported account', async () => {
      // Wait for page to load
      await WalletView.tapIdenticon();
      await AccountListView.isVisible();
      await AccountListView.longPressImportedAccount();
      await AccountListView.tapYesToRemoveImportedAccountAlertButton();
      await AccountListView.accountNameNotVisible('Account 2');
    });

    it('should return to browser', async () => {
      await AccountListView.swipeToDimssAccountsModal();
      await TestHelpers.delay(4500);
      await TabBarComponent.tapBrowser();
      // Check that we are on the browser screen
      await Browser.isVisible();
    });

    it('imported account is not visible', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
      await ConnectedAccountsModal.isVisible();
      await AccountListView.accountNameNotVisible('Account 2');
    });
  },
);
