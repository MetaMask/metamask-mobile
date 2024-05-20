'use strict';
import TestHelpers from '../../helpers';
import Browser from '../../pages/Browser/BrowserView';
import AccountListView from '../../pages/AccountListView';
import TabBarComponent from '../../pages/TabBarComponent';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';

import CommonView from '../../pages/CommonView';

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
        await Assertions.checkIfVisible(Browser.browserScreenID);

        //TODO: should re add connecting to an external swap step after detox has been updated

        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
        await TestHelpers.delay(2000);

        await Assertions.checkIfNotVisible(CommonView.toast);
        await ConnectedAccountsModal.tapConnectMoreAccountsButton();
        await AccountListView.tapAddAccountButton();
        await AccountListView.tapCreateAccountButton();
        await AccountListView.isAccount2VisibleAtIndex(0);
        await AccountListView.tapAccountIndex(0);
        await AccountListView.connectAccountsButton();

        // should revoke accounts
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await ConnectedAccountsModal.tapPermissionsButton();
        await TestHelpers.delay(1500);
        await ConnectedAccountsModal.tapDisconnectAllButton();
        await Assertions.checkIfNotVisible(await CommonView.toast);

        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.swipeToDismissModal();
        await Assertions.checkIfNotVisible(NetworkListModal.networkScroll);
      },
    );
  });
});
