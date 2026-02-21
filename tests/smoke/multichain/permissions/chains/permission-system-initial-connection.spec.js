import { SmokeNetworkExpansion } from '../../../../tags';
import Browser from '../../../../page-objects/Browser/BrowserView';
import TestDApp from '../../../../page-objects/Browser/TestDApp';
import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../../../flows/wallet.flow';
import { navigateToBrowserView } from '../../../../flows/browser.flow';
import Assertions from '../../../../framework/Assertions';
import ConnectBottomSheet from '../../../../page-objects/Browser/ConnectBottomSheet';
import NetworkNonPemittedBottomSheet from '../../../../page-objects/Network/NetworkNonPemittedBottomSheet';
import NetworkConnectMultiSelector from '../../../../page-objects/Browser/NetworkConnectMultiSelector';
import PermissionSummaryBottomSheet from '../../../../page-objects/Browser/PermissionSummaryBottomSheet';
import { DappVariants } from '../../../../framework/Constants';

describe(SmokeNetworkExpansion('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('grants default permissions to single account and chain on first connect', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder().withPermissionController().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(
          PermissionSummaryBottomSheet.addNetworkPermissionContainer,
        );
      },
    );
  });

  it('allows user to modify permitted chains before completing connection', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder().withPermissionController().build(),
        restartDevice: true,
      },
      async () => {
        // Initial setup: Login and navigate to test dapp
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();
        // First permission modification: Add Linea Sepolia
        await TestDApp.connect();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        await ConnectedAccountsModal.tapSelectAllNetworksButton();
        await ConnectedAccountsModal.tapDeselectAllNetworksButton();
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();
        // Second permission modification: Replace Linea Sepolia with Sepolia
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName(); // uncheck Linea Sepolia
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName(); // check Sepolia
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Complete initial connection
        await ConnectBottomSheet.tapConnectButton();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(
          PermissionSummaryBottomSheet.addNetworkPermissionContainer,
        );
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        // Verify final permissions state
        // - Should have only Ethereum Mainnet and Sepolia selected
        // - Deselecting both should show the disconnect all button
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();
      },
    );
  });
});
