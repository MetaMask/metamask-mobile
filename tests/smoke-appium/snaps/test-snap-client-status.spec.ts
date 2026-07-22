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
  appiumTest(
    'connects to the Client Status Snap and returns the client status',
    async ({ currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
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
