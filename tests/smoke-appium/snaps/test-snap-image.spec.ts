import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Image Snap Tests'), () => {
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can connect to the Image Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectImageButton');
        },
      );
    },
  );

  appiumTest(
    'can display SVGs',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('showSVGImage');
          await TestSnaps.expectSnapUiImageVisible({
            description: 'Snap UI SVG image (snaps-ui-image)',
          });
          await TestSnaps.tapOkButton();
        },
      );
    },
  );

  appiumTest(
    'can display PNGs',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('showPNGImage');
          await TestSnaps.expectSnapUiImageVisible({
            description: 'Snap UI PNG image (snaps-ui-image)',
          });
        },
      );
    },
  );
});
