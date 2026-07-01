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
import AccountMenu from '../../page-objects/AccountMenu/AccountMenu';
import WalletView from '../../page-objects/wallet/WalletView';

/**
 * Navigate to Snap Settings from browser or wallet.
 * Prefer the tab bar over `browser-tab-close-button` — the close control is
 * unmounted while the URL editor is focused and is absent when not on Browser.
 */
async function navigateFromBrowserToSnapSettings() {
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

        await SnapSettingsView.tapBackButton();
        await SnapSettingsView.tapListBackButton();
        // Settings → AccountsMenu → close SettingsFlow
        await SettingsView.tapBackButton();
        await AccountMenu.tapBack();

        await navigateToBrowserView();

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

        await SnapSettingsView.tapBackButton();
        await SnapSettingsView.tapListBackButton();
        // Settings → AccountsMenu → close SettingsFlow
        await SettingsView.tapBackButton();
        await AccountMenu.tapBack();

        await navigateToBrowserView();

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
