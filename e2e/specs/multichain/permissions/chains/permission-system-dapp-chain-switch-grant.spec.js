'use strict';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import TestHelpers from '../../../../helpers';
import Browser from '../../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../../pages/Browser/ConnectBottomSheet';
import TestDApp from '../../../../pages/Browser/TestDApp';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import { CustomNetworks } from '../../../../resources/networks.e2e';
import { SmokeNetworkAbstractions } from '../../../../tags';
import Assertions from '../../../../utils/Assertions';
import { loginToApp } from '../../../../viewHelper';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';
import { ConnectedAccountsSelectorsIDs } from '../../../../selectors/Browser/ConnectedAccountModal.selectors';
import Matchers from '../../../../utils/Matchers';

describe(SmokeNetworkAbstractions('Chain Permission System'), () => {
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
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkNonPemittedBottomSheet.tapElysiumTestnetNetworkName();
          await NetworkConnectMultiSelector.tapUpdateButton();
          await ConnectBottomSheet.tapConnectButton();
          await TabBarComponent.tapBrowser();
          // Grant permission and switch to new chain
          await TestDApp.switchChainFromTestDapp();
          await ConnectBottomSheet.tapConnectButton();

          // Verify network switch was successful
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

          // Navigate back to second Dapp and verify chain permissions
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();

          const networkPicker = ConnectedAccountsModal.networkPicker;
          await Assertions.checkIfElementHasLabel(networkPicker, 'E');
        },
      );
    });
  });
});
