import TestHelpers from '../../../../../e2e/helpers';
import { RegressionNetworkExpansion } from '../../../../../e2e/tags';
import Browser from '../../../../../e2e/pages/Browser/BrowserView';
import TabBarComponent from '../../../../../e2e/pages/wallet/TabBarComponent';
import NetworkListModal from '../../../../../e2e/pages/Network/NetworkListModal';
import ConnectedAccountsModal from '../../../../../e2e/pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../../e2e/viewHelper';
import Assertions from '../../../../framework/Assertions';
import WalletView from '../../../../../e2e/pages/wallet/WalletView';
import NetworkNonPemittedBottomSheet from '../../../../../e2e/pages/Network/NetworkNonPemittedBottomSheet';
import NetworkConnectMultiSelector from '../../../../../e2e/pages/Browser/NetworkConnectMultiSelector';
import NetworkEducationModal from '../../../../../e2e/pages/Network/NetworkEducationModal';
import PermissionSummaryBottomSheet from '../../../../../e2e/pages/Browser/PermissionSummaryBottomSheet';
import { DappVariants } from '../../../../framework/Constants';
import TestDApp from '../../../../../e2e/pages/Browser/TestDApp';

/*
Test Steps:
1. Opening wallet on ETH Mainnet
2. Open Dapp 1 and Open Dapp 2
3. Dapp 1: ETH => Linea Sepolia
4. Close Dapp 1
5. Dapp 2: ETH => Sepolia
6. Wallet to Linea mainnet
7. Check Dapp 1 is still on Linea Sepolia
8. Check Dapp 2 is still on ETH Mainnet
*/
describe(RegressionNetworkExpansion('Per Dapp Management'), (): void => {
  beforeAll(async (): Promise<void> => {
    jest.setTimeout(300000);
    await TestHelpers.reverseServerPort();
  });
  it('handles two dapps concurrently', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp({}, true)
          .withChainPermission()
          .withExtraTabs(1)
          .build(),
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        restartDevice: true,
      },
      async (): Promise<void> => {
        // Step 1: Navigate to browser view
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        // Step 2: Navigate to 1st test dApp to load page this should be connected to global network selector: Eth mainnet
        await Browser.navigateToTestDApp();

        // Navigate to 2nd test dapp to load page. This is a verification check. It should  be connected to global network selector: Eth mainnet
        // The delay is used here to ensure the connected notice has been displayed
        await Browser.tapOpenAllTabsButton();
        await Browser.tapSecondTabButton();

        // This is here to debug whether or not the second test dapp loads and connected to chain
        // await TestHelpers.delay(10000)

        // Closing tabs because there is a webview challenging while selecting elements with more than 1 webview (tabs) are opened
        // The delay here is purposely longer as we need to wait for the second dapp to load and only then open the tabs
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

        await Assertions.expectElementToHaveLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton as TypableElement,
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

        // This will wait for the test dapp to actually connect after loading
        await TestDApp.isConnectedToTestDapp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        await NetworkNonPemittedBottomSheet.tapEthereumMainNetNetworkName();
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        await device.enableSynchronization(); // re-enabling synchronization
        await Assertions.expectElementToHaveLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton as TypableElement,
          'Use your enabled networks Sepolia',
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

        await navigateToBrowserView();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate back to second Dapp and verify chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();

        await Assertions.expectElementToHaveLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton as TypableElement,
          'Use your enabled networks Sepolia',
        );

        // // checking that dapp doesn't show the global selected network which in this case is linea mainnet
        await PermissionSummaryBottomSheet.tapBackButton();
        await ConnectedAccountsModal.scrollToBottomOfModal();

        // // Going back to test dapp 1 to verify that the network is still  linea sepolia
        await Browser.tapOpenAllTabsButton();
        await Browser.tapCloseTabsButton();
        await Browser.tapOpenNewTabButton();
        await Browser.navigateToTestDApp();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();

        await Assertions.expectElementToHaveLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton as TypableElement,
          'Use your enabled networks Linea Sepolia',
        );
      },
    );
  });
});
