import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants.js';
import Assertions from '../../framework/Assertions.js';
import { DappVariants } from '../../framework/Constants.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../page-objects/Browser/TestDApp.js';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal.js';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import type { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { setupNetworksTestMocks } from './helpers/network-test-helpers.js';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

appiumTest.describe(SmokeNetworkAbstractions('Network Manager'), () => {
  appiumTest(
    'should preserve existing enabled networks when adding a network via dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const dappTestMock = async (mockServer: Mockttp) => {
        await setupNetworksTestMocks(mockServer);
        await setupRemoteFeatureFlagsMock(mockServer, {
          carouselBanners: false,
        });
      };

      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withNetworkEnabledMap({
              eip155: { '0x1': true },
            })
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission()
            .withPopularNetworks()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: dappTestMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          // Step 1: Navigate to TokensFullView, then select Ethereum
          await NetworkManager.openNetworkManagerFromHomepage();
          await NetworkManager.waitForNetworkManagerToLoad();
          await NetworkManager.checkPopularNetworksContainerIsVisible();
          await NetworkManager.checkTabIsSelected('Popular');

          // Select Ethereum as the active network — sheet closes, lands on TokensFullView
          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );

          // Go back to homepage before navigating to browser
          await NetworkManager.navigateBackFromTokensFullView();

          // Step 2: Navigate to dapp and request network addition
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await TestDApp.tapOpenNetworkPicker();
          await TestDApp.tapNetworkByName(POLYGON);

          // Verify the permission request UI.
          // The button auto-aggregates two text children ("Use your enabled
          // networks" + "Requesting for <network> Mainnet") into one a11y label.
          // iOS UIAccessibility joins those with ", " (RN 0.81 behavior change).
          const expectedText = `Use your enabled networks, Requesting for ${POLYGON} Mainnet`;
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

          // Step 3: Approve the network addition
          await ConnectBottomSheet.tapConnectButton();

          // Wait for browser screen to be visible after connection modal dismisses
          await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
            description: 'Browser screen should be visible after connecting',
          });

          // Step 4: Close browser to reveal app tab bar, then return to wallet
          await Browser.tapCloseBrowserButton();
          await TabBarComponent.tapWallet();

          // Navigate to TokensFullView to verify Ethereum is still the active network
          await NetworkManager.navigateToTokensFullView();
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );
        },
      );
    },
  );
});
