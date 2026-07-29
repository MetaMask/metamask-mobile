import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { testSnapPreinstalledAnalyticsExpectations } from '../../helpers/analytics/expectations/test-snap-preinstalled.analytics.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Preinstalled Snap Tests'), () => {
  // TODO(Appium): implement — skipped placeholder (Playwright has no test.todo;
  // Detox used it.todo for the same unfinished coverage).
  appiumTest.skip('displays the Snap settings page', async () => {
    // To be implemented.
  });

  /**
   * Combined with the messenger test: Appium specs do not share mockServer
   * instances across separate tests the way chained Detox `it`s did.
   */
  appiumTest(
    'uses `initialConnections` to allow JSON-RPC and tracks an event in Segment with `snap_trackEvent`',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
          analyticsExpectations: testSnapPreinstalledAnalyticsExpectations,
        },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.tapButton('showPreinstalledDialogButton');
          await Assertions.expectTextDisplayed(
            'This is a custom dialog. It has a custom footer and can be resolved to any value.',
          );
          await TestSnaps.tapCancelButton();
          await TestSnaps.tapButton('trackEventButton');

          await TestSnaps.tapButton('messengerCallButton');
          await TestSnaps.checkResultSpan('preinstalledResultSpan', 'false');
        },
      );
    },
  );

  // TODO(Appium): implement — skipped placeholder for unfinished Sentry error tracking coverage.
  appiumTest.skip(
    'tracks an error in Sentry with `snap_trackError`',
    async () => {
      // To be implemented.
    },
  );

  // TODO(Appium): implement — skipped placeholder for unfinished Sentry performance-trace coverage.
  appiumTest.skip(
    'starts and ends a performance trace in Sentry with `snap_startTrace` and `snap_endTrace`',
    async () => {
      // To be implemented.
    },
  );
});
