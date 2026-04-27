import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { FlaskBuildTests } from '../../tags';

import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import { Mockttp } from 'mockttp';
import { mockErrorSnap } from '../../api-mocking/mock-response-data/snaps/snap-binary-mocks';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Installed Snap Tests'), () => {
  it('connects to the snap and displays the installed snaps', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockErrorSnap(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
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
