'use strict';
import TestHelpers from '../helpers';

import Browser from '../pages/Drawer/Browser';
import { Smoke } from '../tags';

import AccountListView from '../pages/AccountListView';
import TabBarComponent from '../pages/TabBarComponent';

import ConnectModal from '../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';

import { importWalletWithRecoveryPhrase } from '../viewHelper';
import NetworkListModal from '../pages/modals/NetworkListModal';

const SUSHI_SWAP = 'https://app.sushi.com/swap';
const SUSHI_SWAP_SHORT_HAND_URL = 'app.sushi.com';
describe(
  Smoke(
    'Connecting to multiple dapps and revoking permission on one but staying connected to the other',
  ),
  () => {
    beforeEach(() => {
      jest.setTimeout(150000);
    });

    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase();
    });

    it('should navigate to browser', async () => {
      await TabBarComponent.tapBrowser();
      // Check that we are on the browser screen
      await Browser.isVisible();
    });

    it('should connect to sushi swap dapp', async () => {
      await TestHelpers.delay(3000);
      // Tap on search in bottom navbar
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(SUSHI_SWAP);
      await ConnectModal.isVisible();
      await ConnectModal.tapConnectButton();
      await Browser.isAccountToastVisible('Account 1');
    });

    it('should trigger connect modal in the test dapp', async () => {
      await TestHelpers.delay(3000);
      await Browser.tapOpenAllTabsButton();
      await Browser.tapOpenNewTabButton();
      await Browser.goToTestDappAndTapConnectButton();
    });

    it('should go to multiconnect in the connect account modal', async () => {
      await ConnectModal.isVisible();
      await ConnectModal.tapConnectMultipleAccountsButton();
    });

    it('should connect with multiple accounts', async () => {
      // Wait for page to load
      await TestHelpers.delay(1000);
      await AccountListView.tapAddAccountButton();
      await AccountListView.tapCreateAccountButton();
      await AccountListView.isNewAccountNameVisible();
      await AccountListView.tapNewAccount2();

      await ConnectModal.tapAccountConnectMultiSelectButton();
    });

    it('should revoke accounts', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
      await ConnectedAccountsModal.tapPermissionsButton();
      await TestHelpers.delay(1500);
      await ConnectedAccountsModal.tapDisconnectAllButton();
      await Browser.isRevokeAllAccountToastVisible();
    });

    it('should no longer be connected to the test dapp', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await ConnectedAccountsModal.isNotVisible();
    });

    it('should open sushi swap dapp', async () => {
      // Wait for page to load
      await NetworkListModal.isVisible();
      await NetworkListModal.swipeToDismissModal();
      await NetworkListModal.isNotVisible();
      await TestHelpers.delay(3500);

      await Browser.tapOpenAllTabsButton();
      await TestHelpers.tapByText(SUSHI_SWAP_SHORT_HAND_URL);
    });

    it('should still be connected to sushi swap', async () => {
      // Wait for page to load
      await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
      await ConnectedAccountsModal.isVisible();
    });
  },
);
