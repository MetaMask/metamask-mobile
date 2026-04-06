import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../page-objects/wallet/WalletView';
import PerpsMarketListView from '../../page-objects/Perps/PerpsMarketListView';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import PerpsView from '../../page-objects/Perps/PerpsView';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';
import { createLogger, LogLevel, type TestSuiteParams } from '../../framework';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';

const logger = createLogger({
  name: 'PerpsPositionLiquidationSpec',
  level: LogLevel.INFO,
});

// Skipped until liquidation mock + assertions are verified stable on iOS and Android in CI.
describe.skip(SmokePerps('Perps Position Liquidation'), () => {
  it('opens a long position and gets liquidated', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-positions')
          .withPerpsFirstTimeUser(false)
          .withNetworkController({
            type: 'rpc',
            chainId: '0xa4b1',
            rpcUrl: 'https://arb1.arbitrum.io/rpc',
            nickname: 'Arbitrum One',
            ticker: 'ETH',
          })
          .withTokensForAllPopularNetworks([
            {
              address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              type: 'erc20',
            },
          ])
          .withPopularNetworks()
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagHomepageSectionsV1Enabled(),
          });
          await PERPS_ARBITRUM_MOCKS(mockServer);
          await mockPerpsGeolocation(
            mockServer,
            RampsRegions[RampsRegionsEnum.SPAIN],
          );
        },
        useCommandQueueServer: true,
      },
      async ({ commandQueueServer }: TestSuiteParams) => {
        if (!commandQueueServer) {
          throw new Error('Command queue server not found');
        }
        logger.info('💰 Using E2E mock balance - no wallet import needed');
        logger.info('🎯 Mock account: $10,000 total, $8,000 available');
        await loginToApp();
        await device.disableSynchronization();

        // Navigate to Perps via homepage section (same click path as smoke perps tests)
        await WalletView.scrollAndTapPerpsSection();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();
        await PerpsOrderView.tapPlaceOrderButton();

        if (device.getPlatform() === 'ios') {
          await PerpsOrderView.tapTurnOnNotificationsButton();
        }

        // Wait for market details like perps-position.spec: a price push before the
        // sheet finishes closing can redraw the chart and leave the scroll view
        // under the 75% visible / not-obscured threshold on Android.
        await PerpsMarketDetailsView.waitForScreenReady();
        await PerpsMarketDetailsView.expectClosePositionButtonVisible();

        logger.info('📈 E2E Mock: Order placed successfully');
        logger.info('💎 E2E Mock: Position created with mock data');

        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'ETH',
          '2125.00',
        );
        await PerpsE2EModifiers.triggerLiquidationServer(
          commandQueueServer,
          'ETH',
        );
        logger.info(
          'E2E Mock: First liquidation attempt at 2125 — position expected to stay open until a lower mark',
        );

        await PerpsView.tapBackButtonPositionSheet();
        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'ETH',
          '1200.00',
        );
        await PerpsE2EModifiers.triggerLiquidationServer(
          commandQueueServer,
          'ETH',
        );

        logger.info(
          'E2E Mock: Second liquidation attempt at 1200 — position expected to clear',
        );

        await PerpsView.expectPositionRowNotVisibleAnyLeverage(
          'ETH',
          'long',
          0,
        );
      },
    );
  });
});
