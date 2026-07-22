import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('WASM Snap Tests'), () => {
  appiumTest(
    'can connect to the WASM Snap and return a response for the given number',
    async ({ currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectWasmButton');
        await TestSnaps.fillMessage('wasmInput', '23');
        await TestSnaps.tapButton('sendWasmMessageButton');
        await TestSnaps.checkResultSpan('wasmResultSpan', '28657');
      });
    },
  );
});
