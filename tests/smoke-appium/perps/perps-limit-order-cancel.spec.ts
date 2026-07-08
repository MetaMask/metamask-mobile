import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { placeLimitOrderAtPreset } from '../../flows/perps.flow.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsOrderDetailsView from '../../page-objects/Perps/PerpsOrderDetailsView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import { TestSuiteParams } from '../../framework/types.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  PERPS_SMOKE_PERMISSIONS,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps - Limit order cancel'), () => {
  appiumTest(
    'cancels an open ETH limit long from order details and keeps portfolio clear of positions',
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

          await PerpsMarketDetailsView.tapFirstCompactOrderRow();
          await PerpsOrderDetailsView.tapCancelOrderButton();

          await PerpsMarketDetailsView.expectCompactOpenOrderNotVisible({
            direction: 'long',
          });

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2125.00',
          );

          await PerpsMarketDetailsView.expectCompactOpenOrderNotVisible({
            direction: 'long',
          });
        },
      );
    },
  );
});
