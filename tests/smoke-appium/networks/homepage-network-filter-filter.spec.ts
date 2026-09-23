import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  ETH_TOKEN,
  USDC_TOKEN,
  DAI_TOKEN,
  seedUnifiedEvmAssets,
} from './homepage-network-filter.helpers.js';

appiumTest.describe(
  SmokeWalletPlatform('Homepage Network Filter - Filter by Network'),
  () => {
    appiumTest(
      'filters tokens by selected network in tokens full view',
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
                .withNetworkEnabledMap({
                  eip155: { '0x1': true, '0xe708': true },
                })
                .build();
              seedUnifiedEvmAssets(fixture, [ETH_TOKEN, USDC_TOKEN, DAI_TOKEN]);
              return fixture;
            })(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);

            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.ETHEREUM,
            );

            await NetworkManager.checkTokenIsVisible('ETH');
            await NetworkManager.checkTokenIsVisible('USDC');
            await NetworkManager.checkTokenIsVisible('DAI');

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);

            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.LINEA,
            );

            // Use checkTokenDoesNotExist (10 s) instead of checkTokenIsNotVisible
            // (3 s): the token list re-renders asynchronously after the network
            // filter changes, and 3 s was too short for slower CI runners.
            await NetworkManager.checkTokenDoesNotExist('ETH');
          },
        );
      },
    );
  },
);
