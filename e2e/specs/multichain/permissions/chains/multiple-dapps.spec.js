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

        // Step 2: Navigate to 1st test dApp to load page this should be connected to global network selector: Eth mainnet
        await Browser.navigateToTestDApp();

        await Browser.waitForBrowserPageToLoad();

        // Navigate to 2nd test dapp to load page. This is a verification check. It should  be connected to global network selector: Eth mainnet
        await Browser.tapOpenAllTabsButton();
        await Browser.tapSecondTabButton();
        await Browser.waitForBrowserPageToLoad();

        // This is here to debug whether or not the second test dapp loads and connected to chain
        // await TestHelpers.delay(10000)

        // Closing tabs because there is a webview challenging while selecting elements with more than 1 webview (tabs) are opened
        await Browser.tapOpenAllTabsButton();
        await Browser.tapCloseSecondTabButton();

        // Back to First Dapp
        await Browser.tapFirstTabButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await device.enableSynchronization();
        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();

        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // In 1st Dapp, Update networks: grant Linea Sepolia permissions and remove permissions from mainnet
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

        // Closing tabs because there is a webview challenging while selecting elements with more than 1 webview (tabs) are opened
        await Browser.tapOpenAllTabsButton();
        await Browser.tapCloseTabsButton();
        await Browser.tapOpenNewTabButton();

        // In 2nd Dapp, Should verify that we are connected to Eth mainnet

        await Browser.navigateToSecondTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        /* ** A POTENTIAL BUG: On second Dapp Eth Mainnet should be selected by default. 
          The test is tapping to select ETH mainnet because it is deselected. 
          Also LineaSepolia is selected by default which says that the network selector from Dapp 1 carries over to Dapp 2 
          Feel free to remove lines 102 - 104 if/when this bug is fixed.
        */
        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        await device.enableSynchronization(); // re-enabling synchronization
        await Assertions.checkIfElementHasLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
          'Use your enabled networks Ethereum Main Network',
        );

        await PermissionSummaryBottomSheet.tapBackButton();
        await ConnectedAccountsModal.scrollToBottomOfModal();

        // Update in Global selector in Wallet
        await TabBarComponent.tapWallet();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo('Linea Main Network');
        await device.disableSynchronization();
        await NetworkEducationModal.tapGotItButton();
        await device.enableSynchronization();

        await TabBarComponent.tapBrowser();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate back to second Dapp and verify chain permissions
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
