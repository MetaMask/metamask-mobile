import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('WASM Snap Tests'), () => {
  // Serial: later cases reuse the installed Snap / Appium session from the connect test.
  // Android install allows 60s per sheet. Login plus three sheets exceeds 150s.
  appiumTest.describe.configure({ mode: 'serial', timeout: 240_000 });

  appiumTest(
    'can connect to the WASM Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectWasmButton');
        },
      );
    },
  );

  appiumTest(
    'return a response for the given number',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.fillMessage('wasmInput', '23');
          await TestSnaps.tapButton('sendWasmMessageButton');
          await TestSnaps.checkResultSpan('wasmResultSpan', '28657');
        },
      );
    },
  );
});
