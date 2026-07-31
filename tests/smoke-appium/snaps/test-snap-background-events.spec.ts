import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import {
  readTestSnapStringResult,
  withSnapsFixtures,
} from './helpers/snap-smoke.helpers.js';

/** Far enough ahead that slow Android fill/tap cannot schedule a date in the past. */
const BACKGROUND_EVENT_DATE_OFFSET_MS = 30_000;

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
          const futureDate = new Date(
            Date.now() + BACKGROUND_EVENT_DATE_OFFSET_MS,
          ).toISOString();

          await TestSnaps.fillMessage('backgroundEventDateInput', futureDate);
          await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');

          // Poll until the scheduled event fires (offset above + small buffer).
          await Assertions.expectTextDisplayed(
            'This dialog was triggered by a background event',
            { timeout: BACKGROUND_EVENT_DATE_OFFSET_MS + 15_000 },
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
          await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT10S');
          await TestSnaps.tapButton(
            'scheduleBackgroundEventWithDurationButton',
          );

          await Assertions.expectTextDisplayed(
            'This dialog was triggered by a background event',
            // Duration above + small buffer.
            { timeout: 25_000 },
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
          );

          await TestSnaps.tapButton('getBackgroundEventResultButton');
          await TestSnaps.checkResultSpanIncludes(
            'getBackgroundEventsResultSpan',
            'fireDialog',
          );

          const eventId = await readTestSnapStringResult(
            'scheduleBackgroundEventResultSpan',
          );
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
          );
          await TestSnaps.dismissAlert();
        },
      );
    },
  );
});
