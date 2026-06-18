import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import {
  connectDialogSnap,
  navigateBackFromSnapSettingsToWallet,
  navigateFromBrowserToSnapSettings,
} from '../../flows/snaps.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import SnapSettingsView from '../../page-objects/Settings/SnapSettingsView.js';
import Assertions from '../../framework/Assertions.js';

appiumTest.describe.configure({ mode: 'serial' });

appiumTest.describe(SmokeSnaps('Snap Management Tests'), () => {
  appiumTest(
    'can connect to the Dialog Snap',
    async ({ currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await connectDialogSnap();
        },
      );
    },
  );

  appiumTest('can disable a Snap', async ({ currentDeviceDetails }) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        currentDeviceDetails,
      },
      async () => {
        await navigateFromBrowserToSnapSettings();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();

        await navigateBackFromSnapSettingsToWallet();

        await navigateToBrowserView();

        await TestSnaps.tapButton('sendAlertButton');

        await Assertions.expectTextDisplayed(
          `Snap "npm:@metamask/dialog-example-snap" is disabled.`,
        );
        await TestSnaps.dismissAlert();
      },
    );
  });

  appiumTest('can enable a Snap', async ({ currentDeviceDetails }) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        currentDeviceDetails,
      },
      async () => {
        await navigateFromBrowserToSnapSettings();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();

        await navigateBackFromSnapSettingsToWallet();

        await navigateToBrowserView();

        await TestSnaps.tapButton('sendAlertButton');

        await Assertions.expectTextDisplayed(
          'This is an alert dialog. It has a single button: "OK".',
        );

        await TestSnaps.tapOkButton();
      },
    );
  });

  appiumTest('can remove a Snap', async ({ currentDeviceDetails }) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        currentDeviceDetails,
      },
      async () => {
        await navigateFromBrowserToSnapSettings();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.removeSnap();

        await Assertions.expectTextNotDisplayed('Dialog Example Snap');
      },
    );
  });
});
