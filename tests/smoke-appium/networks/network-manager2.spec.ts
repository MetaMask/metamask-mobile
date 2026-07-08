import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import Assertions from '../../framework/Assertions.js';
import { DappVariants } from '../../framework/Constants.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../page-objects/Browser/TestDApp.js';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal.js';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { getDappUrlForFixture } from '../../framework/fixtures/FixtureUtils.js';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

appiumTest.describe(SmokeNetworkAbstractions('Network Manager'), () => {
  appiumTest(
    'should preserve existing enabled networks when adding a network via dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: (() => {
            const built = new FixtureBuilder()
              .withNetworkEnabledMap({
                eip155: { '0x1': true },
              })
              .withPermissionControllerConnectedToTestDapp()
              .withChainPermission()
              .withPopularNetworks()
              .build();
            built.state.browser.tabs[0].url = getDappUrlForFixture(0);
            return built;
          })(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              carouselBanners: false,
            });
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await NetworkManager.openNetworkManagerFromHomepage();
          await NetworkManager.waitForNetworkManagerToLoad();
          await NetworkManager.checkPopularNetworksContainerIsVisible();
          await NetworkManager.checkTabIsSelected('Popular');

          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );

          await NetworkManager.navigateBackFromTokensFullView();

          await navigateToBrowserView();
          await waitForTestDappToLoad();
          await TestDApp.tapOpenNetworkPicker();
          await TestDApp.tapNetworkByName(POLYGON);

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

          await ConnectBottomSheet.tapConnectButton();

          await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
            description: 'Browser screen should be visible after connecting',
          });

          await Browser.tapCloseBrowserButton();
          await TabBarComponent.tapWallet();

          await NetworkManager.navigateToTokensFullView();
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );
        },
      );
    },
  );
});
