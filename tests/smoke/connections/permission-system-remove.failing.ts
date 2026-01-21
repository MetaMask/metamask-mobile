import TestHelpers from '../../helpers';
import { SmokeNetworkAbstractions } from '../../tags';
import Browser from '../../page-objects/Browser/BrowserView';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import Assertions from '../../framework/Assertions';

import { PopularNetworksList } from '../../resources/networks.e2e';

import WalletView from '../../page-objects/wallet/WalletView';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import TestDApp from '../../page-objects/Browser/TestDApp';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import PermissionSummaryBottomSheet from '../../page-objects/Browser/PermissionSummaryBottomSheet';
import NetworkConnectMultiSelector from '../../page-objects/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../page-objects/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal';
import { DappVariants } from '../../framework/Constants';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe.skip(SmokeNetworkAbstractions('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('handles permission cleanup when removing a connected chain', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withNetworkController(PopularNetworksList.Polygon)
          .build(),
        restartDevice: true,
      },
      async () => {
        // Setup: Navigate to browser and login
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        // Connect to DApp and configure network permissions
        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();
        await ConnectBottomSheet.tapConnectButton();

        // Remove network using network switcher
        await TabBarComponent.tapWallet();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.longPressOnNetwork(
          PopularNetworksList.Polygon.providerConfig.nickname,
        );
        await NetworkListModal.deleteNetwork();
        await NetworkListModal.tapDeleteButton();

        // Verify permission cleanup
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(
          PermissionSummaryBottomSheet.addNetworkPermissionContainer,
        );
      },
    );
  });
});
