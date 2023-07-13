'use strict';
import TestHelpers from '../helpers';
import { Regression } from '../tags';

import Browser from '../pages/Drawer/Browser';

import TabBarComponent from '../pages/TabBarComponent';

import NetworkListModal from '../pages/modals/NetworkListModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import ConnectModal from '../pages/modals/ConnectModal';

import { CreateNewWallet } from '../viewHelper';

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
    await Browser.goToTestDappAndTapConnectButton();

    await ConnectModal.tapConnectButton();

    await ConnectModal.isNotVisible();
  });

  it('should revoke accounts', async () => {
    await TestHelpers.delay(3000);
    await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
    // await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.tapPermissionsButton();
    await ConnectedAccountsModal.tapDisconnectAllButton();
    await Browser.isAccountToastVisible('Account 1');

    await TestHelpers.delay(5500);
  });

  it('should no longer be connected to the  dapp', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.isNotVisible();
    await NetworkListModal.isVisible();
  });
});
