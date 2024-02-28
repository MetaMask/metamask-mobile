'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import Browser from '../../pages/Browser';
import TabBarComponent from '../../pages/TabBarComponent';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import ConnectedAccountsModal from '../../pages/modals/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';

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
        await Browser.isVisible();
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarButtonOnBrowserWhileAccountIsConnectedToDapp();
        await ConnectedAccountsModal.tapPermissionsButton();
        await ConnectedAccountsModal.tapDisconnectAllButton();
        await Browser.isAccountToastVisible('Account 1');

        await TestHelpers.delay(5500);
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await NetworkListModal.isVisible();
      },
    );
  });
});
