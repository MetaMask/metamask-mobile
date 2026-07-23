import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

// TODO: Re-introduce onStart lifecycle hook coverage when the framework can set
// StorageService source code (required for the Snap to run and call onStart).
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
