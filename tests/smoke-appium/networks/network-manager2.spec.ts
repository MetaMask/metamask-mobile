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
import { getDappUrlForFixture } from '../../framework/fixtures/FixtureUtils.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../page-objects/Browser/TestDApp.js';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal.js';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import type { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers.js';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

const step = (label: string): void => {
  console.log(`[network-manager2] ▶ ${label}`);
};

appiumTest.describe(SmokeNetworkAbstractions('Network Manager'), () => {
  appiumTest(
    'should preserve existing enabled networks when adding a network via dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const dappTestMock = async (mockServer: Mockttp) => {
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
            .withBrowserActiveTabUrl(getDappUrlForFixture(0))
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: dappTestMock,
        },
        async () => {
          step('login');
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          step('open network manager from homepage');
          await NetworkManager.openNetworkManagerFromHomepage();
          step('wait for network manager');
          await NetworkManager.waitForNetworkManagerToLoad();
          step('check popular networks visible');
          await NetworkManager.checkPopularNetworksContainerIsVisible();
          step('check Popular tab selected');
          await NetworkManager.checkTabIsSelected('Popular');
          step('tap Ethereum network');
          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
          step('check Ethereum in control bar');
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );
          step('navigate back from tokens full view');
          await NetworkManager.navigateBackFromTokensFullView();

          step('navigate to browser view');
          await navigateToBrowserView();
          // Fixture tab URL is pre-seeded to the test dapp; Appium Android URL bar
          // entry is unreliable on CI, so interact with the dapp WebView directly.
          step('tap open network picker in dapp');
          await TestDApp.tapOpenNetworkPicker();
          step(`tap network ${POLYGON} in dapp`);
          await TestDApp.tapNetworkByName(POLYGON);

          step('assert edit networks permissions label');
          const expectedText = `Use your enabled networks, Requesting for ${POLYGON} Mainnet`;
          await Assertions.expectElementToHaveLabel(
            ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
            expectedText,
            {
              description: `edit networks permissions button should show "${expectedText}"`,
            },
          );
          step('assert connect button visible');
          await Assertions.expectElementToBeVisible(
            ConnectBottomSheet.connectButton,
          );

          step('tap connect');
          await ConnectBottomSheet.tapConnectButton();
          // Fixture pre-connects the dapp on Ethereum; Connect approves Polygon.
          await PlaywrightContextHelpers.switchToNativeContext();
          step('close browser');
          await Browser.tapCloseBrowserButton();
          step('tap wallet tab');
          await TabBarComponent.tapWallet();
          step('navigate to tokens full view');
          await NetworkManager.navigateToTokensFullView();
          step('assert Ethereum still in control bar');
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );
          step('test complete');
        },
      );
    },
  );
});
