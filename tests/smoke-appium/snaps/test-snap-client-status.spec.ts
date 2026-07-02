// Prefer release/main-e2e builds for Snap smoke — debug builds may open the RN dev menu during browser actions (see helpers/snap-smoke.helpers.ts).
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import sdkPackageJson from '@metamask/snaps-sdk/package.json';
import packageJson from '../../../package.json';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Client Status Snap Tests'), () => {
  appiumTest(
    'connects to the Client Status Snap and returns the client status',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await TestSnaps.installSnap('connectClientStatusSnapButton');
        await TestSnaps.tapButton('sendClientStatusButton');
        await TestSnaps.checkClientStatus({
          locked: false,
          active: true,
          clientVersion: packageJson.version,
          platformVersion: sdkPackageJson.version,
        });
      });
    },
  );
});
