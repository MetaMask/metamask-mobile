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
import NetworkConnectMultiSelector from '../../../../pages/Browser/NetworkConnectMultiSelector';
import NetworkEducationModal from '../../../../pages/Network/NetworkEducationModal';

import PermissionSummaryBottomSheet from '../../../../pages/Browser/PermissionSummaryBottomSheet';

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

        await Browser.waitForBrowserPageToLoad();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await device.enableSynchronization();
        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();

        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Update network to Linea Sepolia
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        await Assertions.checkIfElementHasLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
          'Use your enabled networks Linea Sepolia',
        );

        // await TestHelpers.delay(2000);
        await PermissionSummaryBottomSheet.tapBackButton();
        await ConnectedAccountsModal.scrollToBottomOfModal();

                await TestHelpers.delay(2000);
        await Browser.tapOpenAllTabsButton();
        await Browser.tapCloseTabsButton();
        await Browser.tapOpenNewTabButton();

        await Browser.navigateToSecondTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        await Assertions.checkIfElementHasLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
          'Use your enabled networks Ethereum Main Network',
        );

        await PermissionSummaryBottomSheet.tapBackButton();
        await ConnectedAccountsModal.scrollToBottomOfModal();
        // Update in Wallet
        await TabBarComponent.tapWallet();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo('Linea Main Network');
        await device.disableSynchronization();
        await NetworkEducationModal.tapGotItButton();
        await device.enableSynchronization();

        await TabBarComponent.tapBrowser();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();

        await Assertions.checkIfElementHasLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
          'Use your enabled networks Ethereum Main Network',
        );

        // // checking that dapp doesn't show the global selected network which in this case is linea mainnet
        await PermissionSummaryBottomSheet.tapBackButton();
        await ConnectedAccountsModal.scrollToBottomOfModal();

        // // Going back to test dapp 1 to verify that the network is still  linea sepolia
        await TestHelpers.delay(2000);
        await Browser.tapOpenAllTabsButton();
        await Browser.tapCloseTabsButton();
        await Browser.tapOpenNewTabButton();
        await Browser.navigateToTestDApp();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();

        await Assertions.checkIfElementHasLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
          'Use your enabled networks Linea Sepolia',
        );

      },
    );
  });
});
