import { SmokeNetworkExpansion } from '../../../../tags';
import Browser from '../../../../pages/Browser/BrowserView';
import TestDApp from '../../../../pages/Browser/TestDApp';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp, navigateToBrowserView } from '../../../../viewHelper';
import Assertions from '../../../../../tests/framework/Assertions';
import ConnectBottomSheet from '../../../../pages/Browser/ConnectBottomSheet';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import { DappVariants } from '../../../../../tests/framework/Constants';
import { setupRemoteFeatureFlagsMock } from '../../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../../../tests/api-mocking/mock-responses/feature-flags-mocks';

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
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(false),
          );
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
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
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(false),
          );
        },
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

        // Open network permissions menu
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Verify final permissions state
        // - Should have only Ethereum Mainnet and Sepolia selected
        // - Deselecting both should show the disconnect all button
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await Assertions.expectElementToBeVisible(
          ConnectedAccountsModal.disconnectNetworksButton,
        );
      },
    );
  });
});
