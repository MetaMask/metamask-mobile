import { FlaskBuildTests } from '../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import SettingsView from '../../page-objects/Settings/SettingsView';
import SnapSettingsView from '../../page-objects/Settings/SnapSettingsView';
import { Assertions } from '../../framework';
import BrowserView from '../../page-objects/Browser/BrowserView';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Snap Management Tests'), () => {
  it('can connect to the Dialog Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
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
      },
      async () => {
        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSnaps();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();

        await SnapSettingsView.tapBackButton();
        await SnapSettingsView.tapBackButton();
        await SettingsView.tapCloseButton();

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
      },
      async () => {
        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSnaps();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.toggleEnable();

        await SnapSettingsView.tapBackButton();
        await SnapSettingsView.tapBackButton();
        await SettingsView.tapCloseButton();

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
      },
      async () => {
        await BrowserView.tapCloseBrowserButton();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSnaps();

        await SnapSettingsView.selectSnap('Dialog Example Snap');
        await SnapSettingsView.removeSnap();

        await Assertions.expectTextNotDisplayed('Dialog Example Snap');
      },
    );
  });
});
