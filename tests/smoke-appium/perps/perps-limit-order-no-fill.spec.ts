import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { placeLimitOrderAtPreset } from '../../flows/perps.flow.js';
import PerpsView from '../../page-objects/Perps/PerpsView.js';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers.js';
import Assertions from '../../framework/Assertions.js';
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
          await PerpsView.navigateToPerpsPortfolioHomeFromMarketOrderFlow();

          await PerpsView.expectLimitOrderVisibleOnPortfolio({
            symbol: PERPS_SMOKE_MARKET_SYMBOL,
            direction: 'long',
          });

          await PerpsE2EModifiers.updateMarketPriceServer(
            commandQueueServer,
            PERPS_SMOKE_MARKET_SYMBOL,
            '2480.00',
          );

          await PerpsView.expectLimitOrderVisibleOnPortfolio({
            symbol: PERPS_SMOKE_MARKET_SYMBOL,
            direction: 'long',
          });

          await Assertions.expectElementToNotBeVisible(
            PerpsView.getPositionItemAnyLeverage(
              PERPS_SMOKE_MARKET_SYMBOL,
              'long',
            ),
            {
              description:
                'No ETH long position row while limit order remains unfilled',
              timeout: 5000,
            },
          );
        },
      );
    },
  );
});
