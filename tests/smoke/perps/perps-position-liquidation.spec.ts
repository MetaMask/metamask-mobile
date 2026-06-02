import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
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
import CommandQueueServer from '../../framework/fixtures/CommandQueueServer';
import {
  openPosition,
  type PerpsPositionDirection,
} from '../../flows/perps.flow';

const logger = createLogger({
  name: 'PerpsPositionLiquidationSpec',
  level: LogLevel.INFO,
});

const MARKET_SYMBOL = 'ETH';
const POSITION_DIRECTION: PerpsPositionDirection = 'long';
const MARK_PRICE_BY_DIRECTION: Record<
  PerpsPositionDirection,
  {
    nonLiquidating: string;
    liquidating: string;
    liquidatingPriceDirection: 'below' | 'above';
  }
> = {
  long: {
    nonLiquidating: '2400.00',
    liquidating: '1.00',
    liquidatingPriceDirection: 'below',
  },
  short: {
    nonLiquidating: '2600.00',
    liquidating: '100000.00',
    liquidatingPriceDirection: 'above',
  },
};

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

const queueLiquidationCheckAtPrice = async (
  commandQueueServer: CommandQueueServer,
  symbol: string,
  price: string,
) => {
  await PerpsE2EModifiers.updateMarketPriceServer(
    commandQueueServer,
    symbol,
    price,
  );
  await PerpsE2EModifiers.triggerLiquidationServer(commandQueueServer, symbol);
};

const waitForCommandQueueToProcess = async (
  commandQueueServer: CommandQueueServer,
) => {
  commandQueueServer.requestStateExport();
  await commandQueueServer.getExportedState();
};

// Unblocking CI
describe.skip(SmokePerps('Perps Position Liquidation'), () => {
  it(`liquidates a ${POSITION_DIRECTION} position when mark price moves ${MARK_PRICE_BY_DIRECTION[POSITION_DIRECTION].liquidatingPriceDirection} liquidation price`, async () => {
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
        logger.info(`Opening ${MARKET_SYMBOL} ${POSITION_DIRECTION} position`);

        await loginToApp();
        await device.disableSynchronization();

        await openPosition(MARKET_SYMBOL, POSITION_DIRECTION);

        logger.info(
          `Pushing ${MARKET_SYMBOL} mark price that should keep ${POSITION_DIRECTION} open`,
        );

        await queueLiquidationCheckAtPrice(
          commandQueueServer,
          MARKET_SYMBOL,
          MARK_PRICE_BY_DIRECTION[POSITION_DIRECTION].nonLiquidating,
        );
        await waitForCommandQueueToProcess(commandQueueServer);

        logger.info(
          `Verifying ${MARKET_SYMBOL} ${POSITION_DIRECTION} remains open after non-liquidating price change`,
        );
        await PerpsMarketDetailsView.expectClosePositionButtonVisible();

        logger.info(
          `Pushing ${MARKET_SYMBOL} mark price ${MARK_PRICE_BY_DIRECTION[POSITION_DIRECTION].liquidatingPriceDirection} liquidation price to liquidate ${POSITION_DIRECTION}`,
        );

        await queueLiquidationCheckAtPrice(
          commandQueueServer,
          MARKET_SYMBOL,
          MARK_PRICE_BY_DIRECTION[POSITION_DIRECTION].liquidating,
        );

        logger.info(
          `Verifying ${MARKET_SYMBOL} ${POSITION_DIRECTION} is closed after liquidation`,
        );
        await expectPositionClosedAfterLiquidation();
      },
    );
  });
});
