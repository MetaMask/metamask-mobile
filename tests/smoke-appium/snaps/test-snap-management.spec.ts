import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { Assertions } from '../../framework/index.js';
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
          // Android Appium often omits/escapes quotes in alert copy; assert stable substrings.
          await Assertions.expectTextDisplayed('dialog-example-snap', {
            timeout: 30_000,
          });
          await Assertions.expectTextDisplayed('disabled', {
            timeout: 30_000,
          });
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

          await TestSnaps.tapButton('sendAlertButton');
          // Android Appium often omits/escapes quotes in alert copy; assert stable substrings.
          await Assertions.expectTextDisplayed('This is an alert dialog');
          await Assertions.expectTextDisplayed('single button');
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
