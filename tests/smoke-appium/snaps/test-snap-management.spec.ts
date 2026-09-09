import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { Assertions, Utilities } from '../../framework/index.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import SnapSettingsView from '../../page-objects/Settings/SnapSettingsView.js';
import {
  loginAndOpenTestSnaps,
  navigateFromBrowserToSnapSettings,
  navigateFromSnapSettingsToBrowser,
} from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Snap Management Tests'), () => {
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can connect to the Dialog Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectDialogSnapButton');
        },
      );
    },
  );

  appiumTest(
    'can disable a Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await navigateFromBrowserToSnapSettings();
          await SnapSettingsView.selectSnap('Dialog Example Snap');
          // Verify native Switch value flips before leaving settings — a bare
          // tap can succeed on iOS without disabling the Snap.
          await SnapSettingsView.setEnabled(false);
          await navigateFromSnapSettingsToBrowser();

          await TestSnaps.tapButton('sendAlertButton');
          await TestSnaps.expectDisabledSnapAlert();
          await TestSnaps.dismissAlert();
        },
      );
    },
  );

  appiumTest(
    'can enable a Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await navigateFromBrowserToSnapSettings();
          await SnapSettingsView.selectSnap('Dialog Example Snap');
          await SnapSettingsView.setEnabled(true);
          await navigateFromSnapSettingsToBrowser();

          // Re-tap until the enabled dialog is visible. Probe first on retries
          // so a slow prior tap does not queue a second snap_dialog.
          let firstAttempt = true;
          await Utilities.executeWithRetry(
            async () => {
              if (!firstAttempt) {
                try {
                  await TestSnaps.expectEnabledSnapAlert(1_000);
                  return; // prior tap succeeded — dialog on screen
                } catch {
                  /* not yet — re-tap */
                }
              }
              firstAttempt = false;
              await TestSnaps.tapButton('sendAlertButton');
              await TestSnaps.expectEnabledSnapAlert(8_000);
            },
            {
              timeout: 45_000,
              interval: 500,
              maxRetries: 5,
              elemDescription: 'Send Alert button / enabled Snap alert dialog',
              description: 'Send enabled Snap alert until dialog is visible',
            },
          );
          await TestSnaps.tapOkButton();
        },
      );
    },
  );

  appiumTest(
    'can remove a Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await navigateFromBrowserToSnapSettings();
          await SnapSettingsView.selectSnap('Dialog Example Snap');
          await SnapSettingsView.removeSnap();
          await Assertions.expectTextNotDisplayed('Dialog Example Snap');
        },
      );
    },
  );
});
