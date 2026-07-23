import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { placeLimitOrderAtPreset } from '../../flows/perps.flow.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import { TestSuiteParams } from '../../framework/types.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  PERPS_SMOKE_PERMISSIONS,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps - Limit order no fill'), () => {
  appiumTest(
    'keeps a limit long open when mark price moves but does not cross the limit',
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

          await placeLimitOrderAtPreset(PERPS_SMOKE_MARKET_SYMBOL, 'long', -1);

          await PerpsMarketDetailsView.expectCompactOpenOrderVisible({
            direction: 'long',
          });

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2480.00',
          );

          await PerpsMarketDetailsView.expectCompactOpenOrderVisible({
            direction: 'long',
          });

          await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
        },
      );
    },
  );
});
