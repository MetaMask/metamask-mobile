import { SmokeSnaps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import { DappVariants } from '../../framework/Constants';
import { getDappUrlForFixture } from '../../framework/fixtures/FixtureUtils';
import { testSnapPreinstalledAnalyticsExpectations } from '../../helpers/analytics/expectations/test-snap-preinstalled.analytics';

jest.setTimeout(150_000);

const localhostOrigin = getDappUrlForFixture(0);

const eventToTrack = 'Test Event';

describe(SmokeSnaps('Preinstalled Snap Tests'), () => {
  it.todo('displays the Snap settings page');

  /**
   * We're combining the 2 tests as currently we don't have a way to share the mockServer instance between the 2 tests.
   */
  it('uses `initialConnections` to allow JSON-RPC and tracks an event in Segment with `snap_trackEvent`', async () => {
    await withFixtures(
      {
        dapps: [{ dappVariant: DappVariants.TEST_SNAPS }],
        fixture: new FixtureBuilder()
          .withMetaMetricsOptIn()
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
        analyticsExpectations: testSnapPreinstalledAnalyticsExpectations,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();
        await TestSnaps.tapButton('showPreinstalledDialogButton');

        await Assertions.expectTextDisplayed(
          'This is a custom dialog. It has a custom footer and can be resolved to any value.',
        );

        await TestSnaps.tapCancelButton();

        await TestSnaps.tapButton('trackEventButton');
        await TestHelpers.delay(1000);
      },
    );
  });

  it.todo('tracks an error in Sentry with `snap_trackError`');

  it.todo(
    'starts and ends a performance trace in Sentry with `snap_startTrace` and `snap_endTrace`',
  );
});
