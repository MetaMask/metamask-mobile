import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

// This test is currently skipped because there is no way to set the source code in the StorageService, which is required for the Snap to run and call the onStart lifecycle hook.
// appiumTest.skip('runs the onStart lifecycle hook when the client is started');
appiumTest.describe(SmokeSnaps('Lifecycle hooks Snap Tests'), () => {
  appiumTest(
    'runs the onInstall lifecycle hook when the Snap is installed',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectLifeCycleButton');
        await Assertions.expectTextDisplayed(
          'The Snap was installed successfully, and the "onInstall" handler was called.',
          { timeout: 30_000 },
        );
      });
    },
  );
});
