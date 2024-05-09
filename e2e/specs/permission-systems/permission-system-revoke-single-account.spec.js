'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/TabBarComponent';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import CommonView from '../../pages/CommonView';

describe(SmokeCore('Revoke Single Account after connecting to a dapp'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should no longer be connected to the dapp after deleting and creating a new wallet', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarButtonOnBrowser();

        await ConnectedAccountsModal.tapPermissionsButton();
        await TestHelpers.delay(5500); // this is because the toast is delayed.

        await ConnectedAccountsModal.tapDisconnectAllButton();
        await Assertions.checkIfNotVisible(await CommonView.toast);

        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
      },
    );
  });
});
