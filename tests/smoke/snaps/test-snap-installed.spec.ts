import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { FlaskBuildTests } from '../../tags';

import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import { DappVariants } from '../../framework/Constants';
import { getDappUrlForFixture } from '../../framework/fixtures/FixtureUtils';

jest.setTimeout(150_000);

const localhostOrigin = getDappUrlForFixture(0);

describe(FlaskBuildTests('Installed Snap Tests'), () => {
  it('connects to the snap and displays the installed snaps', async () => {
    await withFixtures(
      {
        dapps: [{ dappVariant: DappVariants.TEST_SNAPS }],
        fixture: new FixtureBuilder()
          .withPermissionController({
            subjects: {
              [localhostOrigin]: {
                origin: localhostOrigin,
                permissions: {
                  wallet_snap: {
                    id: 'preinstalled-snap-localhost',
                    parentCapability: 'wallet_snap',
                    invoker: localhostOrigin,
                    caveats: [
                      {
                        type: 'snapIds',
                        value: {
                          'npm:@metamask/preinstalled-example-snap': {},
                        },
                      },
                    ],
                    date: 1713744000000,
                  },
                },
              },
            },
          })
          .build(),
        restartDevice: true,
        skipReactNativeReload: true,
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
