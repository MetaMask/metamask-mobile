import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { navigateToPerpsOrderEntry } from '../../flows/perps.flow.js';
import PerpsOrderView, {
  type PerpsOrderSurface,
} from '../../page-objects/Perps/PerpsOrderView.js';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_MARKET_SYMBOL,
  PERPS_SMOKE_PERMISSIONS,
  PERPS_TRADE_SHEET_FLAGS,
  setupPerpsSmokeMocks,
} from '../../helpers/perps/perps-smoke-helpers.js';
import { Mockttp } from 'mockttp';

/**
 * TAT-4608: a typed order amount must survive the amount keypad's Done.
 *
 * Done unmounts the keypad and remounts the amount slider. On Android that
 * remount used to commit 0% and wipe the amount. A component test cannot
 * reproduce it (the reset depends on native layout of the new slider), so this
 * runs on a device and taps Done with the driver.
 */
const SURFACES: {
  surface: PerpsOrderSurface;
  flags: Record<string, unknown>;
}[] = [
  { surface: 'screen', flags: {} },
  { surface: 'sheet', flags: PERPS_TRADE_SHEET_FLAGS },
];

/** Long enough for the remounted slider to lay out and any late commit to land. */
const SETTLE_AFTER_DONE_MS = 3000;

const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, SETTLE_AFTER_DONE_MS));

for (const { surface, flags } of SURFACES) {
  appiumTest.describe(
    SmokePerps(`Perps - Order amount keypad Done (${surface})`),
    () => {
      const run = async (
        currentDeviceDetails: Parameters<
          typeof withFixtures
        >[0]['currentDeviceDetails'],
        steps: () => Promise<void>,
      ): Promise<void> =>
        withFixtures(
          {
            fixture: buildPerpsSmokeFixture(),
            restartDevice: true,
            currentDeviceDetails,
            permissions: PERPS_SMOKE_PERMISSIONS,
            testSpecificMock: (mockServer: Mockttp) =>
              setupPerpsSmokeMocks(mockServer, flags),
          },
          async () => {
            await beginPerpsSmokeTestPlaywright();
            await navigateToPerpsOrderEntry(PERPS_SMOKE_MARKET_SYMBOL, 'long');
            await PerpsOrderView.waitForAmountSlider(surface);
            await steps();
          },
        );

      appiumTest(
        'keeps a typed amount after Done when the size was first set with the slider',
        async ({ driver: _driver, currentDeviceDetails }) => {
          await run(currentDeviceDetails, async () => {
            await PerpsOrderView.tapAmountSliderLabel('25%');
            await PerpsOrderView.expectAmountSliderNotAtZero(surface);

            await PerpsOrderView.typeAmountOnKeypad(surface, '10');
            await PerpsOrderView.tapAmountKeypadDone(surface);
            await settle();

            await PerpsOrderView.expectAmountUsd(
              '10',
              'Typed amount stays $10 after keypad Done',
            );

            // $10 rounds to 0% of the fixture max, so use an amount large
            // enough to move the slider to check it follows the typed value.
            await PerpsOrderView.typeAmountOnKeypad(surface, '5000');
            await PerpsOrderView.tapAmountKeypadDone(surface);
            await settle();

            await PerpsOrderView.expectAmountUsd(
              '5000',
              'Typed amount stays $5000 after keypad Done',
            );
            await PerpsOrderView.expectAmountSliderNotAtZero(surface);
          });
        },
      );

      appiumTest(
        'keeps a typed amount after Done when the keypad is opened on an empty size',
        async ({ driver: _driver, currentDeviceDetails }) => {
          await run(currentDeviceDetails, async () => {
            await PerpsOrderView.typeAmountOnKeypad(surface, '');
            await PerpsOrderView.tapAmountKeypadDone(surface);
            await settle();
            await PerpsOrderView.expectAmountUsd(
              '0',
              'Amount is empty before typing',
            );

            await PerpsOrderView.typeAmountOnKeypad(surface, '20');
            await PerpsOrderView.tapAmountKeypadDone(surface);
            await settle();

            await PerpsOrderView.expectAmountUsd(
              '20',
              'Typed amount stays $20 after keypad Done',
            );
          });
        },
      );
    },
  );
}
