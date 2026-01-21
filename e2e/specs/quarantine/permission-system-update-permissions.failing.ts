import { SmokeNetworkAbstractions } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import NetworkConnectMultiSelector from '../../pages/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../pages/Network/NetworkNonPemittedBottomSheet';
import { CustomNetworks } from '../../resources/networks.e2e';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import ToastModal from '../../pages/wallet/ToastModal';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddNewAccountSheet from '../../pages/wallet/AddNewAccountSheet';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { DappVariants } from '../../framework/Constants';
import { logger } from '../../framework/logger';

const accountOneText = 'Account 1';
const accountTwoText = 'Account 2';
const accountThreeText = 'Account 3';

describe(SmokeNetworkAbstractions('Chain Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('allows simultaneous granting and revoking of multiple chain permissions', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission([
            '0x1',
            CustomNetworks.Sepolia.providerConfig.chainId as `0x${string}`,
          ]) // Initialize with Ethereum mainnet and Sepolia
          .build(),
        restartDevice: true,
      },
      async () => {
        logger.debug('Starting test');
        await loginToApp();
        logger.debug('Logged in');
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // Navigate to chain permissions
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // Uncheck Sepolia and check Linea Sepolia
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();

        // Update permissions
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Verify changes were saved by checking chain permissions again
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
        );
        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
        );

        await NetworkConnectMultiSelector.isNetworkChainPermissionNotSelected(
          NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
        );
      },
    );
  });

  it('should manage permissions for multiple accounts and networks accurately', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        //should navigate to browser
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        // navigate to test dapp and verify that the connected accounts modal is visible
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);

        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );

        // validate that one account is connected
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await Assertions.expectTextDisplayed(accountOneText);
        await PermissionSummaryBottomSheet.tapBackButton();

        // connect more accounts through the "connect more accounts" button
        await ConnectedAccountsModal.tapConnectMoreAccountsButton();
        await AccountListBottomSheet.tapAddAccountButton();
        await AccountListBottomSheet.tapAddEthereumAccountButton();
        await AddNewAccountSheet.tapConfirmButton();
        await Assertions.expectTextDisplayed(accountTwoText);

        await AccountListBottomSheet.tapAccountIndex(0);
        await AccountListBottomSheet.tapConnectAccountsButton();

        // should add accounts from an alternative path by clicking "Edit Accounts" in the bottom sheet
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // validate 2 accounts are connected
        await Assertions.expectTextDisplayed(accountOneText);
        await Assertions.expectTextDisplayed(accountTwoText);

        // create the third account
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapAccountListBottomSheet();
        await AccountListBottomSheet.tapAddAccountButton();
        await AccountListBottomSheet.tapAddEthereumAccountButton();
        await AddNewAccountSheet.tapConfirmButton();

        // connect the third account
        await AccountListBottomSheet.tapAccountIndex(0); // only the third account is not connected.
        await AccountListBottomSheet.tapConnectAccountsButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

        // validate 3 accounts are connected
        await Assertions.expectTextDisplayed(accountOneText);
        await Assertions.expectTextDisplayed(accountTwoText);
        await Assertions.expectTextDisplayed(accountThreeText);

        // navigate to the permissions summary tab
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        // validate that only 1 network is connected
        await Assertions.expectTextDisplayed(
          NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
        );

        // append Sepolia and Linea Sepolia to the list of networks
        await NetworkNonPemittedBottomSheet.tapSepoliaNetworkName();
        await NetworkNonPemittedBottomSheet.tapLineaSepoliaNetworkName();

        // Update permissions
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Verify changes were saved by checking chain permissions again
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
        );
        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
        );
        await NetworkConnectMultiSelector.isNetworkChainPermissionSelected(
          NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
        );

        // Navigate back because no changes were made
        await NetworkConnectMultiSelector.tapBackButton();

        // disconnect all accounts and networks
        await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToNotBeVisible(
          ConnectedAccountsModal.title,
        );
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await NetworkListModal.swipeToDismissModal();
        await Assertions.expectElementToNotBeVisible(
          NetworkListModal.networkScroll,
        );
      },
    );
  });
});
