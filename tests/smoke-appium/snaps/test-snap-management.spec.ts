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
  // Enable path may re-enter settings once when SnapController lags the Switch.
  appiumTest.describe.configure({ mode: 'serial', timeout: 200_000 });

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
          // Switch can read on before SnapController finishes enable. Settle the
          // toggle, then re-enter settings once if Send Alert still hits disabled.
          await Utilities.executeWithRetry(
            async () => {
              await navigateFromBrowserToSnapSettings();
              await SnapSettingsView.selectSnap('Dialog Example Snap');
              await SnapSettingsView.setEnabled(true);
              await navigateFromSnapSettingsToBrowser();
              await TestSnaps.tapSendAlertAndExpectEnabled({
                timeout: 45_000,
              });
            },
            {
              timeout: 150_000,
              interval: 1_000,
              maxRetries: 2,
              description:
                'Enable Dialog Snap and show enabled alert dialog',
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
