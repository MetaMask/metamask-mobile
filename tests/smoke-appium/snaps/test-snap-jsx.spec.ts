import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('JSX Snap Tests'), () => {
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can connect to the JSX Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectJsx');
        },
      );
    },
  );

  appiumTest(
    'displays a modifiable JSX interface',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.tapButton('displayJsxButton');
          await Assertions.expectElementToBeVisible(
            TestSnaps.jsxCountElement('0'),
          );
          await TestSnaps.tapJsxIncrementButton();
          await Assertions.expectElementToBeVisible(
            TestSnaps.jsxCountElement('1'),
          );
        },
      );
    },
  );
});
