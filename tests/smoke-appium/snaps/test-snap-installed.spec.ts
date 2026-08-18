import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Installed Snap Tests'), () => {
  // Serial: later cases reuse the installed Snap / Appium session from the connect test.
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'connects to the snap and displays the installed snaps',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectErrorSnapButton');
          await TestSnaps.checkInstalledSnaps(
            'npm:@metamask/preinstalled-example-snap, npm:@metamask/error-example-snap',
          );
        },
      );
    },
  );

  appiumTest(
    'can throw an error',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('sendErrorButton');
          await TestSnaps.checkResultSpan('errorResultSpan', '"Hello, world!"');
        },
      );
    },
  );
});
