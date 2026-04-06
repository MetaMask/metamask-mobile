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
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView';
import { createLogger, LogLevel } from '../../framework/logger';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';
import Utilities from '../../framework/Utilities';
import { TestSuiteParams } from '../../framework/types';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';

const logger = createLogger({
  name: 'PerpsPositionStopLossSpec',
  level: LogLevel.INFO,
});

describe(SmokePerps('Perps Position Stop Loss'), () => {
  it('opens a long with stop loss and closes when mark crosses the SL trigger', async () => {
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
        await loginToApp();
        await device.disableSynchronization();

        await WalletView.scrollAndTapPerpsSection();
        await PerpsMarketListView.selectMarket('ETH');
        await PerpsMarketDetailsView.tapLongButton();

        await PerpsOrderView.tapTakeProfitButton();
        // Default ETH mock mark ~2500; SL below entry for a long
        await PerpsOrderView.enterCustomStopLossTriggerPrice('2300');

        await PerpsOrderView.tapPlaceOrderButton();

        if (device.getPlatform() === 'ios') {
          await PerpsOrderView.tapTurnOnNotificationsButton();
        }

        await PerpsMarketDetailsView.waitForScreenReady();
        await PerpsMarketDetailsView.expectClosePositionButtonVisible();

        logger.info('📈 E2E Mock: Long opened with stop loss trigger at 2300');

        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'ETH',
          '2250.00',
        );

        logger.info(
          '📉 E2E Mock: Mark pushed below SL — position should close via trigger',
        );

        // Assert on market details (same screen as above): Close position was shown when the long
        // existed; after SL the mock removes the position — do not use Perps tab row + fixed "3x"
        // (mock uses params.leverage || 1; UI default is usually 3x but is not guaranteed here).
        await Utilities.executeWithRetry(
          async () => {
            await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
          },
          {
            interval: 1000,
            timeout: 30000,
            description:
              'wait for Close position to disappear after stop loss trigger',
          },
        );
      },
    );
  });
});
