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
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';
import {
  createLogger,
  LogLevel,
  Utilities,
  type TestSuiteParams,
} from '../../framework';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import PerpsHomeView from '../../page-objects/Perps/PerpsHomeView';
import CommandQueueServer from '../../framework/fixtures/CommandQueueServer';

const logger = createLogger({
  name: 'PerpsPositionLiquidationSpec',
  level: LogLevel.INFO,
});

const NON_LIQUIDATING_ETH_MARK_PRICE = '2400.00';
const LIQUIDATING_ETH_MARK_PRICE = '1.00';

const setupPerpsMocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
  });
  await PERPS_ARBITRUM_MOCKS(mockServer);
  await mockPerpsGeolocation(mockServer, RampsRegions[RampsRegionsEnum.SPAIN]);
};

const buildPerpsFixture = () =>
  new FixtureBuilder()
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
    .build();

const expectPositionClosedAfterLiquidation = async () => {
  await Utilities.executeWithRetry(
    async () => {
      await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
    },
    {
      interval: 1000,
      timeout: 30000,
      description: 'wait for Close position to disappear after liquidation',
    },
  );
};

const openEthLongPosition = async () => {
  await WalletView.scrollAndTapPerpsSection();
  await PerpsHomeView.tapExploreCryptoIfVisible();

  await PerpsMarketListView.selectMarket('ETH');
  await PerpsMarketDetailsView.tapLongButton();
  await PerpsOrderView.tapPlaceOrderButton();
  await PerpsMarketDetailsView.waitForScreenReady();
  await PerpsMarketDetailsView.expectClosePositionButtonVisible();
};

const queueEthLiquidationCheckAtPrice = async (
  commandQueueServer: CommandQueueServer,
  price: string,
) => {
  await PerpsE2EModifiers.updateMarketPriceServer(
    commandQueueServer,
    'ETH',
    price,
  );
  await PerpsE2EModifiers.triggerLiquidationServer(commandQueueServer, 'ETH');
};

const waitForCommandQueueToProcess = async (
  commandQueueServer: CommandQueueServer,
) => {
  commandQueueServer.requestStateExport();
  await commandQueueServer.getExportedState();
};

describe(SmokePerps('Perps Position Liquidation'), () => {
  it('liquidates a long position when mark price falls below liquidation price', async () => {
    await withFixtures(
      {
        fixture: buildPerpsFixture(),
        restartDevice: true,
        testSpecificMock: setupPerpsMocks,
        useCommandQueueServer: true,
      },
      async ({ commandQueueServer }: TestSuiteParams) => {
        if (!commandQueueServer) {
          throw new Error('Command queue server not found');
        }

        logger.info('Using E2E mock balance - no wallet import needed');
        logger.info('Opening ETH long position');

        await loginToApp();
        await device.disableSynchronization();

        await openEthLongPosition();

        logger.info(
          'Pushing ETH mark price above liquidation price; long should stay open',
        );

        await queueEthLiquidationCheckAtPrice(
          commandQueueServer,
          NON_LIQUIDATING_ETH_MARK_PRICE,
        );
        await waitForCommandQueueToProcess(commandQueueServer);

        logger.info(
          'Verifying ETH long remains open after non-liquidating price change',
        );
        await PerpsMarketDetailsView.expectClosePositionButtonVisible();

        logger.info(
          'Pushing ETH mark price below liquidation price to liquidate long',
        );

        await queueEthLiquidationCheckAtPrice(
          commandQueueServer,
          LIQUIDATING_ETH_MARK_PRICE,
        );

        logger.info('Verifying ETH long is closed after liquidation');
        await expectPositionClosedAfterLiquidation();
      },
    );
  });
});
