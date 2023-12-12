'use strict';
import TestHelpers from '../../helpers';

import Browser from '../../pages/Drawer/Browser';

import AccountListView from '../../pages/AccountListView';
import TabBarComponent from '../../pages/TabBarComponent';

import ConnectModal from '../../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';

import { loginToApp } from '../../viewHelper';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

const SUSHI_SWAP = 'https://app.sushi.com/swap';
const SUSHI_SWAP_SHORT_HAND_URL = 'app.sushi.com';

describe('Connecting to multiple dapps and revoking permission on one but staying connected to the other', () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should connect multiple accounts and revoke them', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        //should navigate to browser
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.isVisible();

        // should connect to sushi swap dapp
        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(SUSHI_SWAP);
        await ConnectModal.isVisible();
        await ConnectModal.scrollToBottomOfModal();
        await Browser.isAccountToastVisible('Account 1');

        // should connect with multiple accounts
        await Browser.tapOpenAllTabsButton();
        await Browser.tapOpenNewTabButton();
        await Browser.navigateToTestDApp();
        await Browser.isAccountToastVisible('Account 1');
        await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
        await ConnectedAccountsModal.isVisible();
        await ConnectedAccountsModal.tapConnectMoreAccountsButton();
        await TestHelpers.delay(1000);
        await AccountListView.tapAddAccountButton();
        await AccountListView.tapCreateAccountButton();
        await AccountListView.isAccount2VisibleAtIndex(0);
        await AccountListView.tapAccountIndex(0);
        await AccountListView.connectAccountsButton();

        // should revoke accounts
        await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
        await ConnectedAccountsModal.tapPermissionsButton();
        await TestHelpers.delay(1500);
        await ConnectedAccountsModal.tapDisconnectAllButton();
        await Browser.isRevokeAllAccountToastVisible();
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await ConnectedAccountsModal.isNotVisible();
        await NetworkListModal.isVisible();
        await NetworkListModal.swipeToDismissModal();
        await NetworkListModal.isNotVisible();
        await TestHelpers.delay(3500);
        await Browser.tapOpenAllTabsButton();
        await TestHelpers.tapByText(SUSHI_SWAP_SHORT_HAND_URL);
        await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
        await NetworkListModal.isVisible();
      },
    );
  });
});
