'use strict';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import TestHelpers from '../../../../helpers';
import Browser from '../../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../../pages/Browser/ConnectBottomSheet';
import TestDApp from '../../../../pages/Browser/TestDApp';
import NetworkEducationModal from '../../../../pages/Network/NetworkEducationModal';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import WalletView from '../../../../pages/wallet/WalletView';
import { CustomNetworks } from '../../../../resources/networks.e2e';
import { SmokeMultiChainPermissions } from '../../../../tags';
import Assertions from '../../../../utils/Assertions';
import { loginToApp } from '../../../../viewHelper';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';

describe(SmokeMultiChainPermissions('Chain Permission System'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  describe('When a dApp requests to switch to a new chain', () => {
    it('should grant permission to the new chain and switch to it when approved', async () => {
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withNetworkController(CustomNetworks.ElysiumTestnet)
            .withNetworkController(CustomNetworks.EthereumMainCustom)
            .withPermissionController()
            .build(),
          restartDevice: true,
        },
        async () => {
          // Setup: Login and navigate to browser
          await loginToApp();
          await TabBarComponent.tapBrowser();
          await Assertions.checkIfVisible(Browser.browserScreenID);

          // Connect to test dApp
          await Browser.navigateToTestDApp();

          await TestDApp.connect();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkNonPemittedBottomSheet.tapElysiumTestnetNetworkName();
          await NetworkConnectMultiSelector.tapUpdateButton();
          await ConnectBottomSheet.tapConnectButton();

          // Grant permission and switch to new chain
          await TestDApp.switchChainFromTestDapp();
          await ConnectBottomSheet.tapConnectButton();
          await NetworkEducationModal.tapGotItButton();

          // Verify network switch was successful
          await TabBarComponent.tapWallet();
          await Assertions.checkIfVisible(WalletView.container);
          const networkPicker = await WalletView.getNavbarNetworkPicker();
          await Assertions.checkIfElementHasLabel(
            networkPicker,
            CustomNetworks.ElysiumTestnet.providerConfig.nickname,
          );
        },
      );
    });
  });
});
