import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Lifecycle hooks Snap Tests'), () => {
  appiumTest(
    'runs the onInstall lifecycle hook when the Snap is installed',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await TestSnaps.installSnap('connectLifeCycleButton');
        await Assertions.expectTextDisplayed(
          'The Snap was installed successfully, and the "onInstall" handler was called.',
          { timeout: 30_000 },
        );
      });
    },
  );
});
