import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import Utilities from '../../framework/Utilities.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { testSnapPreinstalledAnalyticsExpectations } from '../../helpers/analytics/expectations/test-snap-preinstalled.analytics.js';
import { getEventsPayloads } from '../../helpers/analytics/helpers.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

const preinstalledFixture = new FixtureBuilder().withMetaMetricsOptIn().build();
const TEST_EVENT = 'Test Event';

appiumTest.describe(SmokeSnaps('Preinstalled Snap Tests'), () => {
  // TODO(Appium): displays the Snap settings page
  // (Playwright has no test.todo; Detox used it.todo for this unfinished coverage.)

  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'uses `initialConnections` to allow JSON-RPC and tracks an event in Segment with `snap_trackEvent`',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: preinstalledFixture,
          analyticsExpectations: testSnapPreinstalledAnalyticsExpectations,
          restartDevice: true,
        },
        async ({ mockServer }) => {
          await loginAndOpenTestSnaps();
          await TestSnaps.tapButton('showPreinstalledDialogButton');
          await Assertions.expectTextDisplayed(
            'This is a custom dialog. It has a custom footer and can be resolved to any value.',
          );
          await TestSnaps.tapCancelButton();
          await TestSnaps.tapButton('trackEventButton');

          await Utilities.waitUntil(
            async () =>
              (await getEventsPayloads(mockServer, [TEST_EVENT])).length > 0,
            { timeout: 5_000, interval: 1_000 },
          );
        },
      );
    },
  );

  appiumTest(
    'can access the messenger',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: preinstalledFixture,
          restartDevice: false,
        },
        async () => {
          await TestSnaps.tapButton('messengerCallButton');
          await TestSnaps.checkResultSpan('preinstalledResultSpan', 'false');
        },
      );
    },
  );

  // TODO(Appium): tracks an error in Sentry with `snap_trackError`
  // TODO(Appium): starts and ends a performance trace in Sentry with `snap_startTrace` and `snap_endTrace`
});
