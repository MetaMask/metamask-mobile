'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import TabBarComponent from '../../pages/TabBarComponent';

import Browser from '../../pages/Browser/BrowserView';
import AccountListView from '../../pages/AccountListView';

import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';

import Accounts from '../../../wdio/helpers/Accounts';
import { TestDApp } from '../../pages/Browser/TestDApp';

import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import AddAccountModal from '../../pages/modals/AddAccountModal';
import Assertions from '../../utils/Assertions';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';

const SEPOLIA = 'Sepolia';

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
      await Assertions.checkIfVisible(Browser.browserScreenID);
    });

    it('should trigger connect modal in the test dapp', async () => {
      await TestHelpers.delay(3000);
      //TODO: Create goToTestDappAndTapConnectButton method.
      // await TestDApp.goToTestDappAndTapConnectButton();
    });

    it('should go to multiconnect in the connect account modal', async () => {
      await TestHelpers.delay(3000);
      await ConnectBottomSheet.tapConnectMultipleAccountsButton();
    });

    it('should import account', async () => {
      await ConnectBottomSheet.tapImportAccountOrHWButton();
      await AddAccountModal.tapImportAccount();
      await Assertions.checkIfVisible(ImportAccountView.container);
      await ImportAccountView.enterPrivateKey(accountPrivateKey.keys);
      await Assertions.checkIfVisible(SuccessImportAccountView.container);
      await SuccessImportAccountView.tapCloseButton();
    });

    it('should connect multiple accounts to a dapp', async () => {
      await ConnectBottomSheet.tapSelectAllButton();

      await ConnectBottomSheet.tapAccountConnectMultiSelectButton();
    });

    it('should switch to Sepolia', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await ConnectedAccountsModal.tapNetworksPicker();
      await Assertions.checkIfVisible(NetworkListModal.networkScroll);
      await NetworkListModal.tapTestNetworkSwitch();
      await NetworkListModal.changeNetworkTo(SEPOLIA);
    });

    it('should dismiss the network education modal', async () => {
      await Assertions.checkIfVisible(NetworkEducationModal.container);
      await NetworkEducationModal.tapGotItButton();
      await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    });

    it('should set the imported account as primary account', async () => {
      await TestHelpers.delay(1500);
    });

    it('should navigate to wallet view', async () => {
      await TestHelpers.delay(1500);
      await TabBarComponent.tapWallet();
      await Assertions.checkIfVisible(WalletView.container);
    });

    it('should remove imported account', async () => {
      // Wait for page to load
      await WalletView.tapIdenticon();
      //await AccountListView.isVisible();
      await AccountListView.longPressImportedAccount();
      await AccountListView.tapYesToRemoveImportedAccountAlertButton();
      //await AccountListView.accountNameNotVisible('Account 2');
    });

    it('should return to browser', async () => {
      //await AccountListView.swipeToDimssAccountsModal();
      await TestHelpers.delay(4500);
      await TabBarComponent.tapBrowser();
      // Check that we are on the browser screen
      await Assertions.checkIfVisible(Browser.browserScreenID);
    });

    it('imported account is not visible', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
      //await AccountListView.accountNameNotVisible('Account 2');
    });
  },
);
