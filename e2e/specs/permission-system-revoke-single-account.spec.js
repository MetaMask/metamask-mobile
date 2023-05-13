'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

import TabBarComponent from '../pages/TabBarComponent';

import NetworkListModal from '../pages/modals/NetworkListModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import ConnectModal from '../pages/modals/ConnectModal';

import {
  CreateNewWallet,
  testDappConnectButtonCooridinates,
} from '../viewHelper';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';

describe(Regression('Revoke Single Account after connecting to a dapp'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should create new wallet', async () => {
    await CreateNewWallet();
  });

  it('should navigate to browser', async () => {
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen
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
    await Browser.isAccountToastVisible('Account 1');
  });

  it('should revoke accounts', async () => {
    await TestHelpers.delay(3000);
    await TestHelpers.waitAndTap('navbar-account-button');
    // await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.tapPermissionsButton();
    await ConnectedAccountsModal.tapRevokeButton();
    await Browser.isAccountToastVisible('Account 1');

    await TestHelpers.delay(3500);
  });

  it('should no longer be connected to the  dapp', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.isNotVisible();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapNetworkListCloseIcon();
  });
});
