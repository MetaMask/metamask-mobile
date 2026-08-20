import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { navigateToPerpsOrderEntry } from '../../flows/perps.flow.js';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import { TestSuiteParams, Utilities } from '../../framework/index.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps - Short stop loss trigger'), () => {
  appiumTest(
    'closes a short when mark price crosses the stop loss trigger',
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

          await navigateToPerpsOrderEntry(PERPS_SMOKE_MARKET_SYMBOL, 'short');

          await PerpsOrderView.tapTakeProfitButton();
          await PerpsOrderView.enterCustomStopLossTriggerPrice('2700');
          await PerpsOrderView.tapPlaceOrderButton();

          await PerpsMarketDetailsView.waitForScreenReady();
          await PerpsMarketDetailsView.expectClosePositionButtonVisible();

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2750.00',
          );

          await Utilities.executeWithRetry(
            async () => {
              await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
            },
            {
              interval: 1000,
              timeout: 30000,
              description:
                'wait for Close position to disappear after short stop loss trigger',
            },
          );
        },
      );
    },
  );
});
