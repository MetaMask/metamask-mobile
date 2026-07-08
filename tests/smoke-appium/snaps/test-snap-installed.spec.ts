// Prefer release/main-e2e builds for Snap smoke — debug builds may open the RN dev menu during browser actions (see helpers/snap-smoke.helpers.ts).
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Installed Snap Tests'), () => {
  appiumTest(
    'connects to the snap, displays installed snaps, and can throw an error',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectErrorSnapButton');
        await TestSnaps.checkInstalledSnaps(
          'npm:@metamask/preinstalled-example-snap, npm:@metamask/error-example-snap',
        );
        await TestSnaps.tapButton('sendErrorButton');
        await TestSnaps.checkResultSpan('errorResultSpan', '"Hello, world!"');
      });
    },
  );
});
