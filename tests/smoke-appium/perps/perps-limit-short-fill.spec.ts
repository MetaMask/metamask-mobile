import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { placeLimitOrderAtPreset } from '../../flows/perps.flow.js';
import PerpsView from '../../page-objects/Perps/PerpsView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import { TestSuiteParams } from '../../framework/types.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  PERPS_SMOKE_PERMISSIONS,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps - ETH limit short fill'), () => {
  appiumTest(
    'creates ETH limit short at Mid, shows open order, then fills after +15%',
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
            'short',
            'Mid',
          );
          await PerpsView.navigateToPerpsPortfolioHomeFromMarketOrderFlow();

          await PerpsView.expectLimitOrderVisibleOnPortfolio({
            symbol: PERPS_SMOKE_MARKET_SYMBOL,
            direction: 'short',
          });

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2875.00',
          );

          await PerpsView.expectPositionRowAfterLimitOrderFilled({
            symbol: PERPS_SMOKE_MARKET_SYMBOL,
            direction: 'short',
          });
        },
      );
    },
  );
});
