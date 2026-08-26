import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  navigateToPerpsOrderEntry,
  navigateToPerpsProEntry,
} from '../../flows/perps.flow.js';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsProMarketView from '../../page-objects/Perps/PerpsProMarketView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import { TestSuiteParams, Utilities } from '../../framework/index.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps - Take profit trigger'), () => {
  appiumTest(
    'closes a long when mark price crosses the take profit trigger',
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

          await navigateToPerpsOrderEntry(PERPS_SMOKE_MARKET_SYMBOL, 'long');

          await PerpsOrderView.tapTakeProfitButton();
          await PerpsOrderView.enterCustomTakeProfitTriggerPrice('2800');
          await PerpsOrderView.tapPlaceOrderButton();

          await PerpsMarketDetailsView.waitForScreenReady();
          await PerpsMarketDetailsView.expectClosePositionButtonVisible();

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2850.00',
          );

          await Utilities.executeWithRetry(
            async () => {
              await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
            },
            {
              interval: 1000,
              timeout: 30000,
              description:
                'wait for Close position to disappear after take profit trigger',
            },
          );
        },
      );
    },
  );
});

appiumTest.describe(SmokePerps('Perps Pro - Take profit trigger'), () => {
  appiumTest(
    'closes a long in Pro mode when mark price crosses the take profit trigger',
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

          await navigateToPerpsProEntry(PERPS_SMOKE_MARKET_SYMBOL);

          await PerpsProMarketView.selectDirection('long');
          await PerpsProMarketView.enterSize('500');
          await PerpsProMarketView.tapTpslSection();
          await PerpsOrderView.enterCustomTakeProfitTriggerPrice('2800');
          await PerpsProMarketView.tapPlaceOrderButton();

          await PerpsProMarketView.waitForPositionRow(PERPS_SMOKE_MARKET_SYMBOL);

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2850.00',
          );

          await Utilities.executeWithRetry(
            async () => {
              await PerpsProMarketView.expectPositionRowNotVisible(
                PERPS_SMOKE_MARKET_SYMBOL,
              );
            },
            {
              interval: 1000,
              timeout: 30000,
              description:
                'wait for Pro position to close after take profit trigger',
            },
          );
        },
      );
    },
  );
});
