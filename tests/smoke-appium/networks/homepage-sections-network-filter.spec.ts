import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../tags.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import Assertions from '../../framework/Assertions.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants.js';
import {
  createHomepageTokensFilterFixture,
  DAI_TOKEN,
  ETH_TOKEN,
  seedUnifiedEvmAssets,
  setupNetworksTestMocks,
  USDC_TOKEN,
} from './helpers/network-test-helpers.js';

appiumTest.describe(
  SmokeNetworkAbstractions('Homepage Tokens Section - Network Filter'),
  () => {
    appiumTest(
      'navigates from homepage tokens section to tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withTokensForAllPopularNetworks([ETH_TOKEN])
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupNetworksTestMocks,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();
            await Assertions.expectElementToBeVisible(
              TokensFullView.networkFilterButton,
              {
                elemDescription:
                  'Network filter button should be visible in Tokens Full View',
              },
            );
          },
        );
      },
    );

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
            testSpecificMock: setupNetworksTestMocks,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);

            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.ETHEREUM,
            );

            for (const token of ['ETH', 'USDC', 'DAI']) {
              await NetworkManager.checkTokenIsVisible(token);
            }

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);

            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.LINEA,
            );

            await NetworkManager.checkTokenIsNotVisible('ETH');
          },
        );
      },
    );

    appiumTest(
      'shows all tokens on homepage regardless of network filter set in tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: createHomepageTokensFilterFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupNetworksTestMocks,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);
            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.LINEA,
            );

            await NetworkManager.checkTokenIsNotVisible('ETH');

            await TokensFullView.tapBackButton();
            await waitForWalletHomePlaywright();

            // Homepage tokens section is independent of the full-view network filter.
            await NetworkManager.checkTokenIsVisible('ETH');
            await NetworkManager.checkTokenIsVisible('USDC');
          },
        );
      },
    );
  },
);
