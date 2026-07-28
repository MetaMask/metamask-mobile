import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('JSX Snap Tests'), () => {
  appiumTest(
    'can connect to the JSX Snap and displays a modifiable JSX interface',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectJsx');
        await TestSnaps.tapButton('displayJsxButton');
        await Assertions.expectTextDisplayed('0');
        const dynamicButton = Matchers.getElementByText('Increment');
        await Gestures.tap(dynamicButton);
        await Assertions.expectTextDisplayed('1');
      });
    },
  );
});
