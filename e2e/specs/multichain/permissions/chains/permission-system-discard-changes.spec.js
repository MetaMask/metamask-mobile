import TestHelpers from '../../../../helpers';
import { SmokeNetworkAbstractions } from '../../../../tags';
import Browser from '../../../../pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp, navigateToBrowserView } from '../../../../viewHelper';
import Assertions from '../../../../../tests/framework/Assertions';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';
import { DappVariants } from '../../../../../tests/framework/Constants';

describe(SmokeNetworkAbstractions('Chain Permission Management'), () => {
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
