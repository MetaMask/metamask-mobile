'use strict';
import TestHelpers from '../../helpers';
import { SmokeMultiChain } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import NetworkNonPemittedBottomSheet from '../../pages/Network/NetworkNonPemittedBottomSheet';
import NetworkConnectMultiSelector from '../../pages/Browser/NetworkConnectMultiSelector';

describe(SmokeMultiChain('MultiChain Permissions System:'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should grant initial permissions for one account and one chain', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().withPermissionController().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();

        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
      },
    );
  });

  it('should allow modifying network permissions during initial connection flow', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().withPermissionController().build(),
        restartDevice: true,
      },
      async () => {
        // Initial setup: Login and navigate to test dapp
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestHelpers.delay(3000);
        await Assertions.checkIfVisible(Browser.browserScreenID);
        await Browser.navigateToTestDApp();

        // First permission modification: Add Linea Sepolia
        await TestDApp.connect();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Second permission modification: Replace Linea Sepolia with Sepolia
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName(); // uncheck Linea Sepolia
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName(); // check Sepolia
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Complete initial connection
        await ConnectBottomSheet.tapConnectButton();

        // Open network permissions menu
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Verify final permissions state
        // - Should have only Ethereum Mainnet and Sepolia selected
        // - Deselecting both should show the disconnect all button
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await Assertions.checkIfVisible(
          ConnectedAccountsModal.disconnectNetworksButton,
        );
      },
    );
  });
});
