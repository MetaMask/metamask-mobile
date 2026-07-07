// Prefer release/main-e2e builds for Snap smoke — debug builds may open the RN dev menu during browser actions (see helpers/snap-smoke.helpers.ts).
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('UI Links Snap Test'), () => {
  appiumTest(
    'displays a link in the UI',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await TestSnaps.installSnap('connectDialogSnapButton');
        await TestSnaps.tapButton('sendConfirmationButton');
        await TestSnaps.expectSnapDialogLinkDisplayed({ timeout: 30_000 });
      });
    },
  );
});
