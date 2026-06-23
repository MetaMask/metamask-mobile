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
import {
  DAI_TOKEN,
  ETH_TOKEN,
  seedUnifiedEvmAssets,
  setupNetworksTestMocks,
  USDC_TOKEN,
} from './helpers/network-test-helpers.js';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

appiumTest.describe(SmokeNetworkAbstractions('Network Manager'), () => {
  // Blocked by production bug — same skip as Detox smoke/networks/network-manager2.spec.ts
  appiumTest.skip('should filter by Solana', async () => {
    // Intentionally skipped — parity with Detox.
  });

  appiumTest(
    'should filter tokens by selected network from list of enabled popular networks',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: (() => {
            const fixture = new FixtureBuilder()
              .withTokensForAllPopularNetworks([
                ETH_TOKEN,
                USDC_TOKEN,
                DAI_TOKEN,
              ])
              .build();
            seedUnifiedEvmAssets(fixture, [ETH_TOKEN, USDC_TOKEN, DAI_TOKEN]);
            return fixture;
          })(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: setupNetworksTestMocks,
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

          for (const token of ['ETH', 'USDC', 'DAI']) {
            await NetworkManager.checkTokenIsVisible(token);
          }

          for (const token of ['SOL', 'Linea']) {
            await NetworkManager.checkTokenIsNotVisible(token);
          }
        },
      );
    },
  );

  appiumTest(
    'should filter tokens by custom enabled networks',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withTokensForAllPopularNetworks([
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ethereum',
              },
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'SepoliaETH',
                decimals: 18,
                name: 'SepoliaETH',
              },
              {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'LineaETH',
                decimals: 18,
                name: 'LineaETH',
              },
            ])
            .withTokens(
              [
                {
                  address: '0x0000000000000000000000000000000000000000',
                  symbol: 'SepoliaETH',
                  decimals: 18,
                  name: 'SepoliaETH',
                },
              ],
              '0xaa36a7',
            )
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: setupNetworksTestMocks,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await NetworkManager.openNetworkManagerFromHomepage();
          await NetworkManager.waitForNetworkManagerToLoad();
          await NetworkManager.checkPopularNetworksContainerIsVisible();

          await NetworkManager.tapCustomNetworksTab();
          await NetworkManager.checkCustomNetworksContainerIsVisible();
          await NetworkManager.checkTabIsSelected('Custom');

          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM_SEPOLIA);

          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM_SEPOLIA,
          );

          await NetworkManager.checkTokenIsNotVisible('PALM');
          await NetworkManager.checkTokenIsNotVisible('ETH');
        },
      );
    },
  );

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
          await Browser.navigateToTestDApp();
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
