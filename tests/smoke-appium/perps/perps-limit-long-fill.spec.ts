import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  placeLimitOrderAtPreset,
  navigateToPerpsProEntry,
  placeLimitOrderInPro,
} from '../../flows/perps.flow.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsProMarketView from '../../page-objects/Perps/PerpsProMarketView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import Utilities from '../../framework/Utilities.js';
import { TestSuiteParams } from '../../framework/types.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  PERPS_SMOKE_PERMISSIONS,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps - ETH limit long fill'), () => {
  appiumTest(
    'creates ETH limit long at Mid, shows open order, then fills after -15%',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildPerpsSmokeFixture(),
          restartDevice: true,
          currentDeviceDetails,
          permissions: PERPS_SMOKE_PERMISSIONS,
          testSpecificMock: setupPerpsSmokeMocks,
          useCommandQueueServer: true,
        },
        async ({ commandQueueServer }: TestSuiteParams) => {
          if (!commandQueueServer) {
            throw new Error('Command queue server not found');
          }

          await beginPerpsSmokeTestPlaywright();

          await placeLimitOrderAtPreset(
            PERPS_SMOKE_MARKET_SYMBOL,
            'long',
            'Mid',
          );

          await PerpsMarketDetailsView.expectCompactOpenOrderVisible({
            direction: 'long',
          });

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2125.00',
          );

          await Utilities.executeWithRetry(
            async () => {
              await PerpsMarketDetailsView.expectClosePositionButtonVisible();
            },
            {
              interval: 1000,
              timeout: 60000,
              description: 'wait for limit long to fill into an open position',
            },
          );
        },
      );
    },
  );
});

appiumTest.describe(SmokePerps('Perps Pro - ETH limit long fill'), () => {
  appiumTest(
    'creates ETH limit long at Mid in Pro mode, shows open order, then fills after -15%',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildPerpsSmokeFixture(),
          restartDevice: true,
          currentDeviceDetails,
          permissions: PERPS_SMOKE_PERMISSIONS,
          testSpecificMock: setupPerpsSmokeMocks,
          useCommandQueueServer: true,
        },
        async ({ commandQueueServer }: TestSuiteParams) => {
          if (!commandQueueServer) {
            throw new Error('Command queue server not found');
          }

          await beginPerpsSmokeTestPlaywright();

          await navigateToPerpsProEntry(PERPS_SMOKE_MARKET_SYMBOL);
          await placeLimitOrderInPro(PERPS_SMOKE_MARKET_SYMBOL, 'long', 'Mid');

          await PerpsProMarketView.expectOrderRowVisible(
            PERPS_SMOKE_MARKET_SYMBOL,
            0,
          );

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2125.00',
          );
          // Drain the queue so the mock push-price (and limit fill) is applied
          // before we assert on the Positions tab.
          commandQueueServer.requestStateExport();
          await commandQueueServer.getExportedState();

          // Scrolls to Positions panel and waits for the filled position row.
          await PerpsProMarketView.waitForPositionRow(PERPS_SMOKE_MARKET_SYMBOL);
        },
      );
    },
  );
});
