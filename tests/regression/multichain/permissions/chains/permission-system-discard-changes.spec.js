import TestHelpers from '../../../../helpers';
import { RegressionNetworkAbstractions } from '../../../../tags';
import Browser from '../../../../page-objects/Browser/BrowserView';
import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../page-objects/viewHelper';
import Assertions from '../../../../framework/Assertions';
import NetworkConnectMultiSelector from '../../../../page-objects/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../page-objects/Network/NetworkNonPemittedBottomSheet';
import { DappVariants } from '../../../../framework/Constants';

describe(RegressionNetworkAbstractions('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('preserves original chain permissions when user cancels modification', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        await Browser.navigateToTestDApp();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions and add Sepolia
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();

        // Navigate back without confirming changes
        await NetworkConnectMultiSelector.tapBackButton();

        // Verify changes were discarded by checking chain permissions again
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Deselect Ethereum mainnet (should be the only chain selected)
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();

        // Verify the disconnect all button appears (indicating no chain are selected)
        await Assertions.expectElementToBeVisible(
          ConnectedAccountsModal.disconnectNetworksButton,
        );
      },
    );
  });
});
