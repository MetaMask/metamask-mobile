import { FlaskBuildTests } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent';
import TestSnaps from '../../../e2e/pages/Browser/TestSnaps';
import SettingsView from '../../../e2e/pages/Settings/SettingsView';
import SnapSettingsView from '../../../e2e/pages/Settings/SnapSettingsView';
import { Assertions } from '../../framework';
import BrowserView from '../../../e2e/pages/Browser/BrowserView';

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
        await SettingsView.tapBackButton();

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
        await SettingsView.tapBackButton();

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
