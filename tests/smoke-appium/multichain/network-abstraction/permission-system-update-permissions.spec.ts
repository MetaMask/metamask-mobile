import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../framework/Assertions.js';
import { DappVariants } from '../../../framework/Constants.js';
import { CustomNetworks } from '../../../resources/networks.e2e.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector.js';
import ToastModal from '../../../page-objects/wallet/ToastModal.js';
import AccountListBottomSheet from '../../../page-objects/wallet/AccountListBottomSheet.js';

appiumTest.describe(
  SmokeNetworkAbstractions('Chain Permission Management'),
  () => {
    appiumTest.describe.configure({ timeout: 300_000 });

    appiumTest(
      'allows simultaneous granting and revoking of multiple chain permissions',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            fixture: new FixtureBuilder()
              .withPermissionControllerConnectedToTestDapp()
              .withChainPermission([
                '0x1',
                CustomNetworks.Sepolia.providerConfig.chainId as `0x${string}`,
              ])
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();

            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();
            await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();

            await ConnectedAccountsModal.tapPermissionsSummaryTab();
            await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
            );
            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
            );

            await NetworkConnectMultiSelector.tapUpdateButton();

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
      },
    );

    appiumTest(
      'manages permissions for multiple accounts and networks accurately',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            fixture: new FixtureBuilder()
              .withPermissionControllerConnectedToTestDapp()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();

            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();
            await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
            await Assertions.expectElementToNotBeVisible(
              ToastModal.notificationTitle,
            );
            await Assertions.expectTextDisplayed('Account 1');
            await Assertions.expectElementToBeVisible(
              ConnectedAccountsModal.disconnectAllAccountsAndNetworksButton,
            );

            await ConnectedAccountsModal.tapAccountListBottomSheet();
            await AccountListBottomSheet.tapAddAccountButtonV2();
            await Assertions.expectTextDisplayed('Account 2');

            await AccountListBottomSheet.tapAccountByNameV2('Account 2');
            await AccountListBottomSheet.tapConnectAccountsButton();

            await Assertions.expectTextDisplayed('Account 1');
            await Assertions.expectTextDisplayed('Account 2');

            await ConnectedAccountsModal.tapAccountListBottomSheet();
            await AccountListBottomSheet.tapAddAccountButtonV2();
            await Assertions.expectTextDisplayed('Account 3');

            await AccountListBottomSheet.tapAccountByNameV2('Account 3');
            await AccountListBottomSheet.tapConnectAccountsButton();

            await Assertions.expectTextDisplayed('Account 1');
            await Assertions.expectTextDisplayed('Account 2');
            await Assertions.expectTextDisplayed('Account 3');

            await ConnectedAccountsModal.tapPermissionsSummaryTab();
            await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

            await Assertions.expectTextDisplayed(
              NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
            );

            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
            );
            await NetworkConnectMultiSelector.selectNetworkChainPermission(
              NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
            );
            await NetworkConnectMultiSelector.tapUpdateButton();

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

            await NetworkConnectMultiSelector.tapBackButton();

            await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
            await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

            await Assertions.expectElementToBeVisible(Browser.addressBar);
            await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
            await Assertions.expectElementToNotBeVisible(
              ConnectedAccountsModal.disconnectAllAccountsAndNetworksButton,
            );
          },
        );
      },
    );
  },
);
