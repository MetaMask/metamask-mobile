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
import Browser from '../../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';

const SEPOLIA = CustomNetworks.Sepolia.providerConfig.nickname;

appiumTest.describe(
  SmokeNetworkAbstractions('Chain Permission System, non-permitted chain'),
  () => {
    appiumTest.describe.configure({ timeout: 300_000 });

    appiumTest(
      'requests permission when switching to non-permitted chain from dapp',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            fixture: new FixtureBuilder()
              .withPermissionControllerConnectedToTestDapp()
              .withChainPermission()
              .withPopularNetworks()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();

            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();

            await TestDApp.tapOpenNetworkPicker();
            // Exact match: "Sepolia" is a substring of "Linea Sepolia"
            await TestDApp.tapNetworkByName(SEPOLIA, { exactMatch: true });

            // RN a11y joins sibling Text nodes with ", "
            const expectedText = `Use your enabled networks, Requesting for ${SEPOLIA}`;
            await Assertions.expectElementToHaveLabel(
              ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
              expectedText,
              {
                description: `edit networks permissions button should show "${expectedText}"`,
              },
            );
            await Assertions.expectElementToBeVisible(
              ConnectBottomSheet.connectButton,
            );
            await ConnectBottomSheet.tapConnectButton();
          },
        );
      },
    );
  },
);
