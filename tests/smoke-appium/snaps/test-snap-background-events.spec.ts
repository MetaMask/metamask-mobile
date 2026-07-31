import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import WebView from '../../framework/WebView.js';
import TestSnaps, {
  TEST_SNAPS_URL,
} from '../../page-objects/Browser/TestSnaps.js';
import {
  TestSnapResultSelectorWebIDS,
  testSnapsAndroidScrollOptions,
} from '../../selectors/Browser/TestSnaps.selectors.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

const TEST_SNAPS_WEBVIEW_OPTIONS = {
  pageUrl: TEST_SNAPS_URL,
  ...testSnapsAndroidScrollOptions,
};

appiumTest.describe(SmokeSnaps('Background Events Snap Tests'), () => {
  // Serial: later cases reuse the installed Snap / Appium session from the connect test.
  // this will allow the test to fail fast
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can connect to the background events Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectBackgroundEventsButton');
        },
      );
    },
  );

  appiumTest(
    'schedules a background event with an ISO 8601 date string',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          const futureDate = new Date(Date.now() + 5_000).toISOString();

          await TestSnaps.fillMessage('backgroundEventDateInput', futureDate);
          await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
          await TestSnaps.checkResultSpanNotEmpty(
            'scheduleBackgroundEventResultSpan',
            { timeout: 30_000, interval: 500 },
          );

          await Assertions.expectTextDisplayed(
            'This dialog was triggered by a background event',
            { timeout: 30_000 },
          );
          await TestSnaps.tapFooterButton();
        },
      );
    },
  );

  appiumTest(
    'schedules a background event with an ISO 8601 duration',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT5S');
          await TestSnaps.tapButton(
            'scheduleBackgroundEventWithDurationButton',
          );
          await TestSnaps.checkResultSpanNotEmpty(
            'scheduleBackgroundEventResultSpan',
            { timeout: 30_000, interval: 500 },
          );

          await Assertions.expectTextDisplayed(
            'This dialog was triggered by a background event',
            { timeout: 30_000 },
          );
          await TestSnaps.tapFooterButton();
        },
      );
    },
  );

  appiumTest(
    'schedules, lists, and cancels a background event',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          // Intentionally scheduling an event for 1 hour into the future, so it
          // doesn't actually fire during the test.
          await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT1H');
          await TestSnaps.tapButton(
            'scheduleBackgroundEventWithDurationButton',
          );
          await TestSnaps.checkResultSpanNotEmpty(
            'scheduleBackgroundEventResultSpan',
            { timeout: 30_000, interval: 500 },
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
          // Android UiAutomator often omits JSON string quotes that Detox/iOS include.
          let eventId: unknown;
          try {
            eventId = JSON.parse(scheduleResultText);
          } catch {
            eventId = scheduleResultText.replace(/^"|"$/g, '');
          }
          if (typeof eventId !== 'string' || eventId.length === 0) {
            throw new Error(
              `Expected scheduled background event id string, got: ${scheduleResultText}`,
            );
          }
          await TestSnaps.fillMessage('cancelBackgroundEventInput', eventId);
          await TestSnaps.tapButton('cancelBackgroundEventButton');

          await TestSnaps.tapButton('getBackgroundEventResultButton');
          await TestSnaps.checkResultJson('getBackgroundEventsResultSpan', []);
        },
      );
    },
  );

  appiumTest(
    'shows an error when trying to schedule a background event in the past',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: false },
        async () => {
          const pastDate = new Date(Date.now() - 5_000).toISOString();

          await TestSnaps.fillMessage('backgroundEventDateInput', pastDate);
          await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
          await Assertions.expectTextDisplayed(
            'Cannot schedule an event in the past.',
            { timeout: 30_000 },
          );
          await TestSnaps.dismissAlert();
        },
      );
    },
  );
});
