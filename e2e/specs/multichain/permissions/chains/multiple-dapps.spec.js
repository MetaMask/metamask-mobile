'use strict';
import TestHelpers from '../../../../helpers';
import { SmokeNetworkExpansion } from '../../../../tags';
import Browser from '../../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import { loginToApp } from '../../../../viewHelper';
import Assertions from '../../../../utils/Assertions';
import WalletView from '../../../../pages/wallet/WalletView';
import NetworkNonPemittedBottomSheet from '../../../../pages/Network/NetworkNonPemittedBottomSheet';
import { LINEA_MAINNET } from '../../../../../app/constants/network';

describe(SmokeNetworkExpansion('Per Dapp Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('handles two dapps concurrently', async () => {
    await withFixtures(
      {
        dapp: true,
        dappOptions: { numberOfDapps: 2 },
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission()
          .build(),
        restartDevice: true,
      },
      async () => {
        // Step 1: Navigate to browser view
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        // Step 2: Navigate to test dApp and open network settings
        await Browser.navigateToTestDApp();
        await Browser.tapOpenAllTabsButton();
        await Browser.tapSecondTabButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Uncheck Sepolia and check Linea Sepolia
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Update in Wallet
        await TabBarComponent.tapWallet();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await NetworkListModal.changeNetworkTo('Linea Mainnet');
        await device.disableSynchronization();
        await NetworkEducationModal.tapGotItButton();
        await device.enableSynchronization();

        await TabBarComponent.tapBrowser();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        // checking that dapp doesn't show the global selected network which in this case is linea mainnet
        await Assertions.checkIfTextIsDisplayed('Linea Sepolia');

        await Browser.navigateToTestDApp();
        await Browser.tapOpenAllTabsButton();
        await Browser.tapSecondTabButton();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        // checking that dapp doesn't show the global selected network which in this case is linea mainnet
        await Assertions.checkIfTextIsDisplayed('Ethereum');
      },
    );
  });
});
