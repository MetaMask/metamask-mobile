import { SmokeSnaps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import SettingsView from '../../page-objects/Settings/SettingsView';
import SnapSettingsView from '../../page-objects/Settings/SnapSettingsView';
import { Assertions } from '../../framework';
import BrowserView from '../../page-objects/Browser/BrowserView';
import AccountMenu from '../../page-objects/AccountMenu/AccountMenu';
import WalletView from '../../page-objects/wallet/WalletView';

/**
 * Navigate from the browser to Snap Settings.
 * With disableSynchronization the tab bar may not be immediately available
 * after closing the browser, so we navigate step-by-step with explicit waits.
 */
async function navigateFromBrowserToSnapSettings() {
  await BrowserView.tapCloseBrowserButton();
  await TabBarComponent.tapWallet();
  await WalletView.tapHamburgerMenu();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapSettings();
  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10000,
    description: 'Settings view title should be visible',
  });
  await SettingsView.tapSnaps();
}

/**
 * Navigate from Snap settings to the browser
 */
async function navigateFromSnapSettingsToBrowser() {
  await SnapSettingsView.tapBackButton();
  await SnapSettingsView.tapListBackButton();

  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10000,
    description: 'Settings view should be visible',
  });
  await SettingsView.tapBackButton();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapBack();

  await navigateToBrowserView();
}

jest.setTimeout(150_000);

describe(SmokeSnaps('Snap Management Tests'), () => {
  it('can connect to the Dialog Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        disableSynchronization: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectDialogSnapButton');
      },
    );
  });

  it('can disable a Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
        disableSynchronization: true,
      },
      async () => {
        await navigateFromBrowserToSnapSettings();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();

        await navigateFromSnapSettingsToBrowser();

        await TestSnaps.tapButton('sendAlertButton');

        await Assertions.expectTextDisplayed(
          `Snap "npm:@metamask/dialog-example-snap" is disabled.`,
        );
        await TestSnaps.dismissAlert();
      },
    );
  });

  it('can enable a Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
        disableSynchronization: true,
      },
      async () => {
        await navigateFromBrowserToSnapSettings();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();

        await navigateFromSnapSettingsToBrowser();

        await TestSnaps.tapButton('sendAlertButton');

        await Assertions.expectTextDisplayed(
          'This is an alert dialog. It has a single button: "OK".',
        );

        await TestSnaps.tapOkButton();
      },
    );
  });

  it('can remove a Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
        disableSynchronization: true,
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
