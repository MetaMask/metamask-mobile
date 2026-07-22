import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('UI Links Snap Test'), () => {
  appiumTest('displays a link in the UI', async ({ currentDeviceDetails }) => {
    await withSnapsFixtures(currentDeviceDetails, {}, async () => {
      await loginAndOpenTestSnaps();
      await TestSnaps.installSnap('connectDialogSnapButton');
      await TestSnaps.tapButton('sendConfirmationButton');
      await TestSnaps.expectSnapDialogLinkDisplayed({ timeout: 30_000 });
      // Today there's no way to assert that the link opened the device browser. Instead we just test that
      // the link is displayed.
      // TODO: Assert that the browser has been opened and that the correct page has been displayed
    });
  });
});
