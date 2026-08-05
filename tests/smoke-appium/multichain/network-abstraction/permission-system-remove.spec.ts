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
import Matchers from '../../../framework/Matchers.js';
import { DappVariants } from '../../../framework/Constants.js';
import { PopularNetworksList } from '../../../resources/networks.e2e.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import NetworkListModal from '../../../page-objects/Network/NetworkListModal.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import NetworkManager from '../../../page-objects/wallet/NetworkManager.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import ToastModal from '../../../page-objects/wallet/ToastModal.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds.js';

const OPTIMISM = PopularNetworksList.Optimism.providerConfig.nickname;

appiumTest.describe(
  SmokeNetworkAbstractions('Chain Permission Management'),
  () => {
    appiumTest.describe.configure({ timeout: 300_000 });

    appiumTest(
      'handles permission cleanup when removing a connected chain',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            fixture: new FixtureBuilder()
              .withNetworkController(
                PopularNetworksList.Optimism.providerConfig,
              )
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();
            await Assertions.expectElementToBeVisible(Browser.browserScreenID);

            // Connect to DApp (current network Optimism is permitted by default)
            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();
            await TestDApp.tapDappConnectButton();
            await ConnectBottomSheet.tapConnectButton();

            // Browser fullscreen hides the app tab bar — leave browser first.
            await Browser.tapCloseBrowserButton();

            // Remove network using NetworkManager (replaces dead nav-bar
            // network button + long-press delete from the Detox original).
            await TabBarComponent.tapWallet();
            await WalletView.tapOnNewTokensSection();
            await WalletView.tapTokenNetworkFilter();

            // NetworkManager refuses Delete on the active network — switch
            // away from Optimism first (selecting dismisses the sheet).
            await NetworkListModal.changeNetworkTo(
              NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
            );
            await WalletView.tapTokenNetworkFilter();

            await NetworkListModal.tapNetworkRowMenuButton(OPTIMISM);
            await NetworkListModal.tapDeleteButton();
            await NetworkListModal.confirmDeleteNetwork();

            await NetworkListModal.closeNetworkManager();
            await ToastModal.waitForToastToDismiss();
            await NetworkManager.navigateBackFromTokensFullView();

            // Closing the browser drops the Detox-era auto permission sheet.
            // Verify cleanup by inspecting remaining dapp chain permissions.
            await navigateToBrowserView();
            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();

            await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
            await ConnectedAccountsModal.tapPermissionsSummaryTab();
            await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();

            await Assertions.expectElementToNotBeVisible(
              Matchers.getElementByID(`${OPTIMISM}-selected`),
              {
                description:
                  'Optimism should not remain a selected dapp chain permission after network delete',
              },
            );
          },
        );
      },
    );
  },
);
