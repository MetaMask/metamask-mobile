import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
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
          const dynamicSvg = Matchers.getElementByID('snaps-ui-image');
          await Assertions.expectElementToBeVisible(dynamicSvg);
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
          const dynamicPng = Matchers.getElementByID('snaps-ui-image');
          await Assertions.expectElementToBeVisible(dynamicPng);
        },
      );
    },
  );
});
