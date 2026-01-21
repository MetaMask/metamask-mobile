import TestHelpers from '../../helpers';
import { RegressionNetworkAbstractions } from '../../tags';
import WalletView from '../../page-objects/wallet/WalletView';
import ImportAccountView from '../../page-objects/importAccount/ImportAccountView';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';

import Browser from '../../page-objects/Browser/BrowserView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';

import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import NetworkEducationModal from '../../page-objects/Network/NetworkEducationModal';

import Accounts from '../../../wdio/helpers/Accounts';
import {
  importWalletWithRecoveryPhrase,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import AddAccountBottomSheet from '../../page-objects/wallet/AddAccountBottomSheet';
import Assertions from '../../framework/Assertions';
import SuccessImportAccountView from '../../page-objects/importAccount/SuccessImportAccountView';

const SEPOLIA = 'Sepolia';

const accountPrivateKey = Accounts.getAccountPrivateKey();

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe.skip(
  RegressionNetworkAbstractions(
    'Permission System Test: Revoking accounts after connecting to a dapp',
  ),
  () => {
    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase({});
    });

    it('should navigate to browser', async () => {
      await TestHelpers.delay(2000);
      await navigateToBrowserView();
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
      await AddAccountBottomSheet.tapImportAccount();
      await Assertions.expectElementToBeVisible(ImportAccountView.container);
      await ImportAccountView.enterPrivateKey(accountPrivateKey.keys);
      await Assertions.expectElementToBeVisible(
        SuccessImportAccountView.container,
      );
      await SuccessImportAccountView.tapCloseButton();
    });

    it('should connect multiple accounts to a dapp', async () => {
      await ConnectBottomSheet.tapSelectAllButton();

      await ConnectBottomSheet.tapAccountConnectMultiSelectButton();
    });

    it('should switch to Sepolia', async () => {
      await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
      await ConnectedAccountsModal.tapNetworksPicker();
      await Assertions.expectElementToBeVisible(NetworkListModal.networkScroll);
      await NetworkListModal.tapTestNetworkSwitch();
      await NetworkListModal.changeNetworkTo(SEPOLIA);
    });

    it('should dismiss the network education modal', async () => {
      await Assertions.expectElementToBeVisible(
        NetworkEducationModal.container,
      );
      await NetworkEducationModal.tapGotItButton();
      await Assertions.expectElementToNotBeVisible(
        NetworkEducationModal.container,
      );
    });

    it('should set the imported account as primary account', async () => {
      await TestHelpers.delay(1500);
    });

    it('should navigate to wallet view', async () => {
      await TestHelpers.delay(1500);
      await TabBarComponent.tapWallet();
      await Assertions.expectElementToBeVisible(WalletView.container);
    });

    it('should remove imported account', async () => {
      // Wait for page to load
      await WalletView.tapIdenticon();
      //await AccountListView.isVisible();
      await AccountListBottomSheet.longPressImportedAccount();
      await AccountListBottomSheet.tapYesToRemoveImportedAccountAlertButton();
      //await AccountListView.accountNameNotVisible('Account 2');
    });

    it('should return to browser', async () => {
      //await AccountListView.swipeToDimssAccountsModal();
      await TestHelpers.delay(4500);
      await navigateToBrowserView();
      // Check that we are on the browser screen
      await Assertions.expectElementToBeVisible(Browser.browserScreenID);
    });

    it('imported account is not visible', async () => {
      await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
      await Assertions.expectElementToNotBeVisible(
        ConnectedAccountsModal.title,
      );
      //await AccountListView.accountNameNotVisible('Account 2');
    });
  },
);
