import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import WebView from '../../framework/WebView.js';
import TestSnaps, {
  TEST_SNAPS_URL,
} from '../../page-objects/Browser/TestSnaps.js';
import { TestSnapResultSelectorWebIDS } from '../../selectors/Browser/TestSnaps.selectors.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';
import { testSnapsAndroidScrollOptions } from './helpers/android-test-snaps-native.helpers.js';

const TEST_SNAPS_WEBVIEW_OPTIONS = {
  pageUrl: TEST_SNAPS_URL,
  ...testSnapsAndroidScrollOptions,
};

appiumTest.describe(SmokeSnaps('Background Events Snap Tests'), () => {
  appiumTest(
    'connects to the Background Events Snap and schedules, lists, and cancels events',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectBackgroundEventsButton');

        const futureDate = new Date(Date.now() + 5_000).toISOString();
        await TestSnaps.fillMessage('backgroundEventDateInput', futureDate);
        await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
        await TestSnaps.checkResultSpanNotEmpty(
          'scheduleBackgroundEventResultSpan',
        );
        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a background event',
          { timeout: 30_000 },
        );
        await TestSnaps.tapFooterButton();

        await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT5S');
        await TestSnaps.tapButton('scheduleBackgroundEventWithDurationButton');
        await TestSnaps.checkResultSpanNotEmpty(
          'scheduleBackgroundEventResultSpan',
        );
        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a background event',
          { timeout: 30_000 },
        );
        await TestSnaps.tapFooterButton();

        // Schedule 1 hour ahead so the event does not fire during the test.
        await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT1H');
        await TestSnaps.tapButton('scheduleBackgroundEventWithDurationButton');
        await TestSnaps.checkResultSpanNotEmpty(
          'scheduleBackgroundEventResultSpan',
        );

        await TestSnaps.tapButton('getBackgroundEventResultButton');
        await TestSnaps.checkResultSpanIncludes(
          'getBackgroundEventsResultSpan',
          'fireDialog',
        );

        const scheduleResultText = await WebView.readTextById(
          TestSnapResultSelectorWebIDS.scheduleBackgroundEventResultSpan,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );
        const eventId = JSON.parse(scheduleResultText);
        await TestSnaps.fillMessage('cancelBackgroundEventInput', eventId);
        await TestSnaps.tapButton('cancelBackgroundEventButton');

        await TestSnaps.tapButton('getBackgroundEventResultButton');
        await TestSnaps.checkResultJson('getBackgroundEventsResultSpan', []);

        const pastDate = new Date(Date.now() - 5_000).toISOString();
        await TestSnaps.fillMessage('backgroundEventDateInput', pastDate);
        await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
        await Assertions.expectTextDisplayed(
          'Cannot schedule an event in the past.',
          { timeout: 30_000 },
        );
        await TestSnaps.dismissAlert();
      });
    },
  );
});
