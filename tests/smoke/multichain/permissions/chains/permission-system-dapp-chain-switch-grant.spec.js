import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import Browser from '../../../../../e2e/pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../../../e2e/pages/Browser/ConnectBottomSheet';
import TestDApp from '../../../../../e2e/pages/Browser/TestDApp';
import { CustomNetworks } from '../../../../resources/networks.e2e';
import { SmokeNetworkAbstractions } from '../../../../../e2e/tags';
import Assertions from '../../../../framework/Assertions';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../../e2e/viewHelper';
import ConnectedAccountsModal from '../../../../../e2e/pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../../e2e/pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../../e2e/pages/Network/NetworkNonPemittedBottomSheet';
import { DappVariants } from '../../../../framework/Constants';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../../api-mocking/mock-responses/feature-flags-mocks';

describe.skip(SmokeNetworkAbstractions('Chain Permission System'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  describe('When a dApp requests to switch to a new chain', () => {
    it('grants permission to the new chain and switches to it when approved', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withNetworkController(CustomNetworks.ElysiumTestnet)
            .withNetworkController(CustomNetworks.EthereumMainCustom)
            .withPermissionController()
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(false),
            );
          },
        },
        async () => {
          // Setup: Login and navigate to browser
          await loginToApp();
          await navigateToBrowserView();
          await Assertions.expectElementToBeVisible(Browser.browserScreenID);

          // Connect to test dApp
          await Browser.navigateToTestDApp();

          await TestDApp.connect();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkNonPemittedBottomSheet.tapElysiumTestnetNetworkName();
          await NetworkConnectMultiSelector.tapUpdateButton();
          await ConnectBottomSheet.tapConnectButton();

          // Verify browser is still visible after modal closes
          await Assertions.expectElementToBeVisible(Browser.browserScreenID);

          // Grant permission and switch to new chain
          await TestDApp.switchChainFromTestDapp();
          await ConnectBottomSheet.tapConnectButton();

          // Verify network switch was successful
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

          // Navigate back to second Dapp and verify chain permissions
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();

          const networkPicker = ConnectedAccountsModal.networkPicker;
          await Assertions.expectElementToHaveLabel(networkPicker, 'E');
        },
      );
    });
  });
});
