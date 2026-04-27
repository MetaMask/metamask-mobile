import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import sdkPackageJson from '@metamask/snaps-sdk/package.json';
import packageJson from '../../../package.json';
import { Mockttp } from 'mockttp';
import { mockClientStatusSnap } from '../../api-mocking/mock-response-data/snaps/snap-binary-mocks';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Client Status Snap Tests'), () => {
  it('connects to the Client Status Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockClientStatusSnap(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectClientStatusSnapButton');
      },
    );
  });

  it('returns the client status', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        await TestSnaps.tapButton('sendClientStatusButton');
        await TestSnaps.checkClientStatus({
          locked: false,
          active: true,
          clientVersion: packageJson.version,
          platformVersion: sdkPackageJson.version,
        });
      },
    );
  });

  // Can't test this right now because the client needs to be unlocked in order
  // to interact with the Snap.
  it.todo('returns the client status with a locked client');
});
