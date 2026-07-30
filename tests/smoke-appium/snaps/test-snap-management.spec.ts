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
  appiumTest(
    'can connect to the Dialog Snap and disable, enable, and remove it from settings',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectDialogSnapButton');

        await navigateFromBrowserToSnapSettings();
        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();
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

        await navigateFromBrowserToSnapSettings();
        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();
        await navigateFromSnapSettingsToBrowser();

        await TestSnaps.tapButton('sendAlertButton');
        await Assertions.expectTextDisplayed(
          'This is an alert dialog. It has a single button: "OK".',
        );
        await TestSnaps.tapOkButton();

        await navigateFromBrowserToSnapSettings();
        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.removeSnap();
        await Assertions.expectTextNotDisplayed('Dialog Example Snap');
      });
    },
  );
});
