import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Image Snap Tests'), () => {
  appiumTest(
    'can connect to the Image Snap, display SVGs, and display PNGs',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectImageButton');

        await TestSnaps.tapButton('showSVGImage');
        const dynamicSvg = Matchers.getElementByID('snaps-ui-image');
        await Assertions.expectElementToBeVisible(dynamicSvg);
        await TestSnaps.tapOkButton();

        await TestSnaps.tapButton('showPNGImage');
        const dynamicPng = Matchers.getElementByID('snaps-ui-image');
        await Assertions.expectElementToBeVisible(dynamicPng);
      });
    },
  );
});
