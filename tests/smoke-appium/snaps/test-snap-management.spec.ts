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
  // Increased from 150 s: 4 serial tests include a snap install (up to 60 s
  // on Android) and two full browser→settings→browser navigation round-trips,
  // exhausting 150 s on slower CI runners on both Android and iOS.
  appiumTest.describe.configure({ mode: 'serial', timeout: 240_000 });

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

          // Shared POM: re-tap + one page reload if the Snap runtime is not
          // ready yet after enable (post-#35803 residual).
          await TestSnaps.tapSendAlertAndExpectEnabled();
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
