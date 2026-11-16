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
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector.js';

/**
 * Chain-edit half of the old "manages permissions for multiple accounts and
 * networks" case. Starts from the single connected account so this file does
 * not repeat the account-add path. Timeout stays 360s.
 */
appiumTest.describe(
  SmokeNetworkAbstractions('Chain Permission Management'),
  () => {
    appiumTest.describe.configure({ timeout: 360_000 });

    appiumTest(
      'updates chain permissions for the connected account and disconnects',
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
            await ConnectedAccountsModal.openFromBrowser();
            await ConnectedAccountsModal.expectConnectedAccountDisplayed(
              'Account 1',
            );

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
