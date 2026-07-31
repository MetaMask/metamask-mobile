import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import sdkPackageJson from '@metamask/snaps-sdk/package.json';
import packageJson from '../../../package.json';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

// TODO: Re-introduce locked-client status when we can interact with snaps while locked
// (the client must be unlocked to interact with the Snap).
// `driver` must be requested so Playwright starts the Appium session fixture
// (sets FrameworkDetector + globals), even when unused in the body.
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

  appiumTest(
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
