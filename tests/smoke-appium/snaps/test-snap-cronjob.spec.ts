// Prefer release/main-e2e builds for Snap smoke — debug builds may open the RN dev menu during browser actions (see helpers/snap-smoke.helpers.ts).
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { Assertions } from '../../framework/index.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Cronjob Snap Tests'), () => {
  appiumTest(
    'can connect to the Cronjob Snap which triggers a dialog',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await TestSnaps.installSnap('connectCronjobSnapButton');
        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a cronjob.',
          { timeout: 30_000 },
        );
      });
    },
  );
});
