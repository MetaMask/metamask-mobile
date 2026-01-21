import { FlaskBuildTests } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import Assertions from '../../../tests/framework/Assertions';
import { getEventsPayloads } from '../../../tests/helpers/analytics/helpers';
import TestHelpers from '../../helpers';

jest.setTimeout(150_000);

const eventToTrack = 'Test Event';

const navigateToDappAndShowPreinstalledDialog = async () => {
  await loginToApp();
  await navigateToBrowserView();
  await TestSnaps.navigateToTestSnap();
};

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
        await navigateToDappAndShowPreinstalledDialog();
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
