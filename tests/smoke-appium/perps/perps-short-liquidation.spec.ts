import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import { TestSuiteParams, Utilities } from '../../framework/index.js';
import CommandQueueServer from '../../framework/fixtures/CommandQueueServer.js';
import { openPosition } from '../../flows/perps.flow.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

const NON_LIQUIDATING_MARK_PRICE = '2600.00';
const LIQUIDATING_MARK_PRICE = '100000.00';

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
  await commandQueueServer.requestAndWaitForExportedState({
    timeout: 10000,
    maxAttempts: 3,
  });
};

appiumTest.describe(SmokePerps('Perps - Short liquidation'), () => {
  appiumTest(
    'liquidates a short position when mark price moves above liquidation price',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildPerpsSmokeFixture(),
          restartDevice: true,
          currentDeviceDetails,
          permissions: { notifications: 'YES' },
          testSpecificMock: setupPerpsSmokeMocks,
          useCommandQueueServer: true,
        },
        async ({ commandQueueServer }: TestSuiteParams) => {
          if (!commandQueueServer) {
            throw new Error('Command queue server not found');
          }

          await beginPerpsSmokeTestPlaywright();

          await openPosition(PERPS_SMOKE_MARKET_SYMBOL, 'short');

          await queueLiquidationCheckAtPrice(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            NON_LIQUIDATING_MARK_PRICE,
          );
          await waitForCommandQueueToProcess(commandQueueServer);
          await PerpsMarketDetailsView.expectClosePositionButtonVisible();

          await queueLiquidationCheckAtPrice(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            LIQUIDATING_MARK_PRICE,
          );

          await Utilities.executeWithRetry(
            async () => {
              await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
            },
            {
              interval: 1000,
              timeout: 30000,
              description:
                'wait for Close position to disappear after short liquidation',
            },
          );
        },
      );
    },
  );
});
