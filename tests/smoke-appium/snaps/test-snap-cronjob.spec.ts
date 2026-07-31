import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { Assertions } from '../../framework/index.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Cronjob Snap Tests'), () => {
  appiumTest.describe.configure({ timeout: 150_000 });

  appiumTest(
    'can connect to the Cronjob Snap which triggers a dialog',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectCronjobSnapButton');
          await Assertions.expectTextDisplayed(
            'This dialog was triggered by a cronjob.',
            { timeout: 30_000 },
          );
        },
      );
    },
  );
});
