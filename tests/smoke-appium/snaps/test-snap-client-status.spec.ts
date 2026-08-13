import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import sdkPackageJson from '@metamask/snaps-sdk/package.json';
import packageJson from '../../../package.json';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

// TODO: Re-introduce locked-client status when we can interact with snaps while locked
// (the client must be unlocked to interact with the Snap).
appiumTest.describe(SmokeSnaps('Client Status Snap Tests'), () => {
  // Serial: later cases reuse the installed Snap / Appium session from the connect test.
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'connects to the Client Status Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectClientStatusSnapButton');
        },
      );
    },
  );

  // 8.7.0: spec pins platformVersion to @metamask/snaps-sdk in this
  // branch (11.2.0); the client returns 12.0.0. Main already has sdk 12
  // (#34460). Do not cherry-pick that train onto the RC.
  appiumTest.skip(
    'returns the client status',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('sendClientStatusButton');
          await TestSnaps.checkClientStatus({
            locked: false,
            active: true,
            clientVersion: packageJson.version,
            platformVersion: sdkPackageJson.version,
          });
        },
      );
    },
  );
});
