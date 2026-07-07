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
import { createE2EStepLogger } from '../../framework/e2eStepLogger.js';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;
const step = createE2EStepLogger('network-manager2');

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
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              carouselBanners: false,
            });
          },
        },
        async () => {
          await step('login', () =>
            loginToAppPlaywright({ scenarioType: 'e2e' }),
          );

          await step('open network manager from homepage', () =>
            NetworkManager.openNetworkManagerFromHomepage(),
          );
          await step('wait for network manager to load', () =>
            NetworkManager.waitForNetworkManagerToLoad(),
          );
          await step('verify popular networks tab', async () => {
            await NetworkManager.checkPopularNetworksContainerIsVisible();
            await NetworkManager.checkTabIsSelected('Popular');
          });

          await step('select Ethereum network', async () => {
            await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.ETHEREUM,
            );
          });

          await step('navigate back from tokens full view', () =>
            NetworkManager.navigateBackFromTokensFullView(),
          );

          await step('navigate to browser view', () => navigateToBrowserView());
          await step('open test dapp via deeplink', () =>
            Browser.navigateToTestDApp(),
          );
          await step('wait for test dapp to load', () =>
            waitForTestDappToLoad(),
          );
          await step('open network picker in test dapp', () =>
            TestDApp.tapOpenNetworkPicker(),
          );
          await step(`select ${POLYGON} in test dapp`, () =>
            TestDApp.tapNetworkByName(POLYGON),
          );

          const expectedText = `Use your enabled networks, Requesting for ${POLYGON} Mainnet`;
          await step('verify edit networks permissions label', () =>
            Assertions.expectElementToHaveLabel(
              ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
              expectedText,
              {
                description: `edit networks permissions button should show "${expectedText}"`,
              },
            ),
          );
          await step('verify connect button visible', () =>
            Assertions.expectElementToBeVisible(
              ConnectBottomSheet.connectButton,
            ),
          );

          await step('approve network addition', () =>
            ConnectBottomSheet.tapConnectButton(),
          );

          await step('verify browser screen after connect', () =>
            Assertions.expectElementToBeVisible(Browser.browserScreenID, {
              description: 'Browser screen should be visible after connecting',
            }),
          );

          await step('close browser and return to wallet', async () => {
            await Browser.tapCloseBrowserButton();
            await TabBarComponent.tapWallet();
          });

          await step('verify Ethereum still active network', async () => {
            await NetworkManager.navigateToTokensFullView();
            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.ETHEREUM,
            );
          });
        },
      );
    },
  );
});
