'use strict';
import TestHelpers from '../helpers';
import { Smoke } from '../tags';
import WalletView from '../pages/WalletView';
import ImportAccountView from '../pages/ImportAccountView';
import TabBarComponent from '../pages/TabBarComponent';
import TransactionConfirmationView from '../pages/TransactionConfirmView';

import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';
import AccountListView from '../pages/AccountListView';

import ConnectModal from '../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';

import Accounts from '../../wdio/helpers/Accounts';

import {
  importWalletWithRecoveryPhrase,
  testDappConnectButtonCooridinates,
  testDappSendEIP1559ButtonCoordinates,
} from '../viewHelper';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';
const SEPOLIA = 'Sepolia Test Network';

const accountPrivateKey = Accounts.getAccountPrivateKey();
describe.skip(
  Smoke('Permission System Test: Revoking accounts after connecting to a dapp'),
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

    it('should connect to the test dapp', async () => {
      await TestHelpers.delay(3000);
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(TEST_DAPP);
      await TestHelpers.delay(3000);
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappConnectButtonCooridinates,
      );
      await ConnectModal.isVisible();
    });

    it('should go to multiconnect in the connect account modal', async () => {
      await ConnectModal.tapConnectMultipleAccountsButton();
    });

    it('should import account', async () => {
      await ConnectModal.tapImportAccountButton();
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
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await ConnectedAccountsModal.tapNetworksPicker();
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

    it('should submit a EIP1559 transaction ', async () => {
      await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up', 'slow', 0.1);
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappSendEIP1559ButtonCoordinates,
      );

      await TransactionConfirmationView.isBalanceVisible();
      await TestHelpers.tapByText('Confirm', 1);
      await TransactionConfirmationView.isBalanceNotVisible();
    });

    it('should navigate to wallet view', async () => {
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
      await TabBarComponent.tapBrowser();
      // Check that we are on the browser screen
      await Browser.isVisible();
    });

    it('imported account is not visible', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await ConnectedAccountsModal.isVisible();
      await AccountListView.accountNameNotVisible('Account 2');
    });
  },
);
