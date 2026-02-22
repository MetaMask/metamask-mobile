import TestHelpers from '../../../../../e2e/helpers';
import { SmokeNetworkAbstractions } from '../../../../../e2e/tags';
import Browser from '../../../../../e2e/pages/Browser/BrowserView';
import TabBarComponent from '../../../../../e2e/pages/wallet/TabBarComponent';

import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../../e2e/viewHelper';
import Assertions from '../../../../framework/Assertions';

import { PopularNetworksList } from '../../../../resources/networks.e2e';

import WalletView from '../../../../../e2e/pages/wallet/WalletView';
import NetworkListModal from '../../../../../e2e/pages/Network/NetworkListModal';
import TestDApp from '../../../../../e2e/pages/Browser/TestDApp';
import ConnectBottomSheet from '../../../../../e2e/pages/Browser/ConnectBottomSheet';
import PermissionSummaryBottomSheet from '../../../../../e2e/pages/Browser/PermissionSummaryBottomSheet';
import NetworkConnectMultiSelector from '../../../../../e2e/pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../../e2e/pages/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../../../../e2e/pages/Browser/ConnectedAccountsModal';
import { DappVariants } from '../../../../framework/Constants';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeNetworkAbstractions('Chain Permission Management'), () => {
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
