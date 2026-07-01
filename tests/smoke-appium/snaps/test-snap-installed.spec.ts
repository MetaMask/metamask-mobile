import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe.configure({ mode: 'serial' });

appiumTest.describe(SmokeSnaps('Installed Snap Tests'), () => {
  appiumTest(
    'connects to the snap and displays the installed snaps',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await TestSnaps.installSnap('connectErrorSnapButton');
        await TestSnaps.checkInstalledSnaps(
          'npm:@metamask/preinstalled-example-snap, npm:@metamask/error-example-snap',
        );
      });
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
