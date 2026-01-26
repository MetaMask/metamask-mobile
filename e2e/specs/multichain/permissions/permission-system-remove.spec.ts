import TestHelpers from '../../../helpers';
import { SmokeNetworkAbstractions } from '../../../tags';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';

import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp, navigateToBrowserView } from '../../../viewHelper';
import Assertions from '../../../../tests/framework/Assertions';

import { PopularNetworksList } from '../../../../tests/resources/networks.e2e';

import WalletView from '../../../pages/wallet/WalletView';
import NetworkListModal from '../../../pages/Network/NetworkListModal';
import TestDApp from '../../../pages/Browser/TestDApp';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import PermissionSummaryBottomSheet from '../../../pages/Browser/PermissionSummaryBottomSheet';
import NetworkConnectMultiSelector from '../../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../pages/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import { DappVariants } from '../../../../tests/framework/Constants';

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
