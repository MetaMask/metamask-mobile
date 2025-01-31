'use strict';
import TestHelpers from '../../../../helpers';
import { SmokeMultiChainPermissions } from '../../../../tags';
import Browser from '../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import { loginToApp } from '../../../../viewHelper';
import Assertions from '../../../../utils/Assertions';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';

describe(SmokeMultiChainPermissions('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('preserves original chain permissions when user cancels modification', async () => {
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
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        await Browser.navigateToTestDApp();

        await Browser.tapNetworkAvatarButtonOnBrowser();

        // Navigate to chain permissions and add Sepolia
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();

        // Navigate back without confirming changes
        await NetworkConnectMultiSelector.tapBackButton();

        // Verify changes were discarded by checking chain permissions again
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Deselect Ethereum mainnet (should be the only chain selected)
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();

        // Verify the disconnect all button appears (indicating no chain are selected)
        await Assertions.checkIfVisible(
          ConnectedAccountsModal.disconnectNetworksButton,
        );
      },
    );
  });
});
