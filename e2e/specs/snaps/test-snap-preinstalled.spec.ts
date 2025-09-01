import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';
import Assertions from '../../framework/Assertions';
import { getEventsPayloads } from '../analytics/helpers';
import TestHelpers from '../../helpers';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Preinstalled Snap Tests'), () => {
  it.todo('displays the Snap settings page');

  it('uses `initialConnections` to allow JSON-RPC', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.tapButton('showPreinstalledDialogButton');

        await Assertions.expectTextDisplayed(
          'This is a custom dialog. It has a custom footer and can be resolved to any value.',
        );

        await TestSnaps.tapCancelButton();
      },
    );
  });

  it.todo('tracks an error in Sentry with `snap_trackError`');

  it('tracks an event in Segment with `snap_trackEvent`', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
      },
      async ({ mockServer }) => {
        await TestSnaps.tapButton('trackEventButton');
        await TestHelpers.delay(1000);

        const events = await getEventsPayloads(mockServer);

        await Assertions.checkIfObjectsMatch(events[0], {
          event: 'Test Event',
          properties: {
            test_property: 'test value',
          },
        });
      },
    );
  });

  it.todo(
    'starts and ends a performance trace in Sentry with `snap_startTrace` and `snap_endTrace`',
  );
});
