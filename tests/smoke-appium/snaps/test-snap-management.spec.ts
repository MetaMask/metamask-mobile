import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { Assertions } from '../../framework/index.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import BrowserView from '../../page-objects/Browser/BrowserView.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountMenu from '../../page-objects/AccountMenu/AccountMenu.js';
import SettingsView from '../../page-objects/Settings/SettingsView.js';
import SnapSettingsView from '../../page-objects/Settings/SnapSettingsView.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

async function navigateFromBrowserToSnapSettings(): Promise<void> {
  await BrowserView.tapCloseBrowserButton();
  await TabBarComponent.tapWallet();
  await WalletView.tapHamburgerMenu();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10_000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapSettings();
  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10_000,
    description: 'Settings view title should be visible',
  });
  await SettingsView.tapSnaps();
}

async function navigateFromSnapSettingsToBrowser(): Promise<void> {
  await SnapSettingsView.tapBackButton();
  await SnapSettingsView.tapListBackButton();

  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10_000,
    description: 'Settings view should be visible',
  });
  await SettingsView.tapBackButton();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10_000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapBack();

  await navigateToBrowserView();
}

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
        await Assertions.expectTextDisplayed(
          `Snap "npm:@metamask/dialog-example-snap" is disabled.`,
        );
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
