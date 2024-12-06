'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import NetworkConnectMultiSelector from '../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../pages/Network/NetworkNonPemittedBottomSheet';

describe(SmokeCore('MultiChain Permissions System:'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  fit('should discard network permission changes when navigating back without confirming', async () => {
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

        // Navigate to network permissions and add Sepolia
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();

        // Navigate back without confirming changes
        await NetworkConnectMultiSelector.tapBackButton();

        // Verify changes were discarded by checking network permissions again
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Deselect Ethereum mainnet (should be the only network selected)
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();

        // Verify the disconnect all button appears (indicating no networks are selected)
        await Assertions.checkIfVisible(
          ConnectedAccountsModal.disconnectNetworksButton,
        );
      },
    );
  });
});
