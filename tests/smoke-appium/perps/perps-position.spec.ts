import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  navigateToPerpsOrderEntry,
  navigateToPerpsProEntry,
  openPositionInPro,
} from '../../flows/perps.flow.js';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView.js';
import PerpsOrderView from '../../page-objects/Perps/PerpsOrderView.js';
import PerpsProMarketView from '../../page-objects/Perps/PerpsProMarketView.js';
import PerpsView from '../../page-objects/Perps/PerpsView.js';
import Utilities from '../../framework/Utilities.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  PERPS_SMOKE_PERMISSIONS,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';

appiumTest.describe(SmokePerps('Perps Position'), () => {
  appiumTest(
    'opens a long position with custom profit and closes it',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildPerpsSmokeFixture(),
          restartDevice: true,
          currentDeviceDetails,
          permissions: PERPS_SMOKE_PERMISSIONS,
          testSpecificMock: setupPerpsSmokeMocks,
        },
        async () => {
          await beginPerpsSmokeTestPlaywright();

          await navigateToPerpsOrderEntry(PERPS_SMOKE_MARKET_SYMBOL, 'long');

          await PerpsOrderView.tapTakeProfitButton();
          await PerpsOrderView.enterCustomTakeProfitTriggerPrice('2800');
          await PerpsOrderView.tapPlaceOrderButton();

          await PerpsMarketDetailsView.waitForScreenReady();
          await PerpsMarketDetailsView.expectClosePositionButtonVisible();

          await PerpsView.tapClosePositionButton();
          await PerpsView.tapClosePositionBottomSheetButton();

          await Utilities.executeWithRetry(
            async () => {
              await PerpsMarketDetailsView.expectClosePositionButtonNotVisible();
            },
            {
              interval: 1000,
              timeout: 30000,
              description:
                'wait for Close position to disappear after manual close',
            },
          );
        },
      );
    },
  );
});

appiumTest.describe(SmokePerps('Perps Pro - Position'), () => {
  appiumTest(
    'opens a long position in Pro mode and closes it from the positions panel',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildPerpsSmokeFixture(),
          restartDevice: true,
          currentDeviceDetails,
          permissions: PERPS_SMOKE_PERMISSIONS,
          testSpecificMock: setupPerpsSmokeMocks,
        },
        async () => {
          await beginPerpsSmokeTestPlaywright();

          await navigateToPerpsProEntry(PERPS_SMOKE_MARKET_SYMBOL);
          await openPositionInPro(PERPS_SMOKE_MARKET_SYMBOL, 'long');

          await PerpsProMarketView.tapPositionCloseButton(
            PERPS_SMOKE_MARKET_SYMBOL,
          );
          await PerpsView.tapClosePositionBottomSheetButton();

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
                'wait for Pro position to disappear after manual close',
            },
          );
        },
      );
    },
  );
});
