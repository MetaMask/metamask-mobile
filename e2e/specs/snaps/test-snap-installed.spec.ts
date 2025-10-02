import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { FlaskBuildTests } from '../../tags';

import TestSnaps from '../../pages/Browser/TestSnaps';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Installed Snap Tests'), () => {
  it('connects to the snap and displays the installed snaps', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectErrorSnapButton');

        await TestSnaps.checkInstalledSnaps(
          'npm:@metamask/preinstalled-example-snap, npm:@metamask/error-example-snap',
        );
      },
    );
  });

  it('can throw an error', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        await TestSnaps.tapButton('sendErrorButton');
        await TestSnaps.checkResultSpan('errorResultSpan', '"Hello, world!"');
      },
    );
  });
});
