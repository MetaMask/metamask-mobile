import { FlaskBuildTests } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../../e2e/pages/Browser/TestSnaps';
import Assertions from '../../framework/Assertions';
import { getEventsPayloads } from '../../helpers/analytics/helpers';
import TestHelpers from '../../../e2e/helpers';

jest.setTimeout(150_000);

const eventToTrack = 'Test Event';

describe(FlaskBuildTests('Preinstalled Snap Tests'), () => {
  it.todo('displays the Snap settings page');

  /**
   * We're combining the 2 tests as currently we don't have a way to share the mockServer instance between the 2 tests.
   */
  it('uses `initialConnections` to allow JSON-RPC and tracks an event in Segment with `snap_trackEvent`', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async ({ mockServer }) => {
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

        const events = await getEventsPayloads(mockServer, [eventToTrack]);

        await Assertions.checkIfObjectsMatch(events[0], {
          event: eventToTrack,
          properties: {
            test_property: 'test value',
          },
        });
      },
    );
  });

  it.todo('tracks an error in Sentry with `snap_trackError`');

  it.todo(
    'starts and ends a performance trace in Sentry with `snap_startTrace` and `snap_endTrace`',
  );
});
