'use strict';
import TestHelpers from '../../../../helpers';
import { SmokeMultiChainPermissions } from '../../../../tags';
import Browser from '../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import { loginToApp } from '../../../../viewHelper';
import Assertions from '../../../../utils/Assertions';

describe(SmokeMultiChainPermissions('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('removes chain access permission while maintaining account connections', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission()
          .build(),
        restartDevice: true,
      },
      async () => {
        // Step 1: Navigate to browser view
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        // Step 2: Navigate to test dApp and open network settings
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarButtonOnBrowser();

        // Step 3: Navigate through permission management flow
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await ConnectedAccountsModal.tapSelectAllNetworksButton();
        await ConnectedAccountsModal.tapDeselectAllNetworksButton();
        await ConnectedAccountsModal.tapDisconnectNetworksButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        // Step 4: Verify UI state after permission removal
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.swipeToDismissModal();
        await Assertions.checkIfNotVisible(NetworkListModal.networkScroll);
      },
    );
  });
});
