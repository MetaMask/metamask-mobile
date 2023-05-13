'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

import AccountListView from '../pages/AccountListView';
import TabBarComponent from '../pages/TabBarComponent';

import ConnectModal from '../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import NetworkListModal from '../pages/modals/NetworkListModal';

import {
  importWalletWithRecoveryPhrase,
  testDappConnectButtonCooridinates,
} from '../viewHelper';

const SUSHI_SWAP = 'https://app.sushi.com/swap';
const TEST_DAPP = 'https://metamask.github.io/test-dapp/';

describe(
  Regression(
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

    it('should go to the test dapp', async () => {
      // Tap on search in bottom navbar
      await Browser.tapOpenAllTabsButton();
      await Browser.tapOpenNewTabButton();
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(TEST_DAPP);
      await Browser.waitForBrowserPageToLoad();
      await TestHelpers.tapAtPoint(
        BROWSER_SCREEN_ID,
        testDappConnectButtonCooridinates,
      );
      await ConnectModal.isVisible();
    });

    it('should go to multiconnect in the connect account modal', async () => {
      await ConnectModal.tapConnectMultipleAccountsButton();
    });

    it('should connect with multiple accounts', async () => {
      // Wait for page to load
      await ConnectModal.tapCreateAccountButton();
      await AccountListView.isNewAccountNameVisible();
      await AccountListView.tapAccountByName('Account 2');

      await ConnectModal.tapAccountConnectMultiSelectButton();
    });

    it('should revoke accounts', async () => {
      await Browser.tapNetworkAvatarButtonOnBrowser();
      await ConnectedAccountsModal.tapPermissionsButton();
      // await TestHelpers.delay(1500);
      // await ConnectedAccountsModal.tapRevokeAllButton();
      // Browser.isRevokeAllAccountToastVisible();
    });

    // it('should no longer be connected to the test dapp', async () => {
    //   await Browser.tapNetworkAvatarButtonOnBrowser();
    //   await ConnectedAccountsModal.isNotVisible();
    //   await NetworkListModal.tapNetworkListCloseIcon();
    // });

    // it('should open sushi swap dapp', async () => {
    //   // Wait for page to load
    //   await Browser.tapOpenAllTabsButton();
    //   await TestHelpers.tapByText('app.sushi.com');
    // });

    // it('should still be connected to sushi swap', async () => {
    //   // Wait for page to load
    //   await Browser.tapNetworkAvatarButtonOnBrowser();
    //   await ConnectedAccountsModal.isVisible();
    // });
  },
);
