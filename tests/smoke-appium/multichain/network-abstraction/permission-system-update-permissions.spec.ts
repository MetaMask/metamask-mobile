import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { DappVariants } from '../../../framework/Constants.js';
import { CustomNetworks } from '../../../resources/networks.e2e.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector.js';

appiumTest.describe(
  SmokeNetworkAbstractions('Chain Permission Management'),
  () => {
    // iOS chain-edit sheet transitions run long. 360s matches other multi-step
    // smokes. Do not raise it — split slow cases into their own files instead.
    appiumTest.describe.configure({ timeout: 360_000 });

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
            await ConnectedAccountsModal.openFromBrowser();

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
  },
);
