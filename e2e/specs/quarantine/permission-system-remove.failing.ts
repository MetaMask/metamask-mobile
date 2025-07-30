import TestHelpers from '../../helpers';
import { SmokeNetworkAbstractions } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';

import { PopularNetworksList } from '../../resources/networks.e2e';

import SettingsView from '../../pages/Settings/SettingsView';
import NetworksView from '../../pages/Settings/NetworksView';
import TestDApp from '../../pages/Browser/TestDApp';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';
import NetworkConnectMultiSelector from '../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../pages/Network/NetworkNonPemittedBottomSheet';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import { DappVariants } from '../../framework/Constants';

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
        await TabBarComponent.tapBrowser();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        // Connect to DApp and configure network permissions
        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();
        await ConnectBottomSheet.tapConnectButton();

        // Remove network from settings
        await TabBarComponent.tapSettings();
        await SettingsView.tapNetworks();
        await NetworksView.longPressToRemoveNetwork(
          PopularNetworksList.Polygon.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();

        // Verify permission cleanup
        await TabBarComponent.tapBrowser();
        await Assertions.expectElementToBeVisible(
          PermissionSummaryBottomSheet.addNetworkPermissionContainer,
        );
      },
    );
  });
});
