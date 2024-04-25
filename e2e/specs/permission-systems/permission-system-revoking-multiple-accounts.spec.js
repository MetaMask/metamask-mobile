'use strict';
import TestHelpers from '../../helpers';
import Browser from '../../pages/Browser';
import AccountListView from '../../pages/AccountListView';
import TabBarComponent from '../../pages/TabBarComponent';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';
import { loginToApp } from '../../viewHelper';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';

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

        //TODO: should re add connecting to an external swap step after detox has been updated

        await Browser.navigateToTestDApp();
        await Browser.isAccountToastVisible('Account 1');
        await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
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
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.swipeToDismissModal();
        await Assertions.checkIfNotVisible(NetworkListModal.networkScroll);
      },
    );
  });
});
