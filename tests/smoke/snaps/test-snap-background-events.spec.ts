import { SmokeSnaps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { TestSnapResultSelectorWebIDS } from '../../selectors/Browser/TestSnaps.selectors';
import { Mockttp } from 'mockttp';
import { mockBackgroundEventsSnap } from '../../api-mocking/mock-response-data/snaps/snap-binary-mocks';

jest.setTimeout(150_000);

describe(SmokeSnaps('Background Events Snap Tests'), () => {
  it('can connect to the background events Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        disableSynchronization: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockBackgroundEventsSnap(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectBackgroundEventsButton');
      },
    );
  });

  it('it schedules a background event with an ISO 8601 date string', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        // 10s window: long enough to outlast the snap's scheduling round-trip
        // (avoiding the "in the past" rejection alert), short enough that
        // expectTextDisplayed below catches the firing dialog within its
        // default timeout.
        const futureDate = new Date(Date.now() + 10_000).toISOString();

        await TestSnaps.fillMessage('backgroundEventDateInput', futureDate);
        await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
        await TestSnaps.checkResultSpanNotEmpty(
          'scheduleBackgroundEventResultSpan',
        );

        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a background event',
        );
        await TestSnaps.tapFooterButton();
      },
    );
  });

  it('schedules a background event with an ISO 8601 duration', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        // 10s window: long enough for snap to accept the schedule before the
        // duration elapses, short enough for the firing dialog to land within
        // expectTextDisplayed's default timeout.
        await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT10S');
        await TestSnaps.tapButton('scheduleBackgroundEventWithDurationButton');
        await TestSnaps.checkResultSpanNotEmpty(
          'scheduleBackgroundEventResultSpan',
        );

        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a background event',
        );
        await TestSnaps.tapFooterButton();
      },
    );
  });

  it('schedules, lists, and cancels a background event', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        // Intentionally scheduling an event for 1 hour into the future, so it
        // doesn't actually fire during the test.
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

        const resultElement = await Matchers.getElementByWebID(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
          TestSnapResultSelectorWebIDS.scheduleBackgroundEventResultSpan,
        );

        const id = JSON.parse(await resultElement.getText());
        await TestSnaps.fillMessage('cancelBackgroundEventInput', id);
        await TestSnaps.tapButton('cancelBackgroundEventButton');

        await TestSnaps.tapButton('getBackgroundEventResultButton');
        await TestSnaps.checkResultJson('getBackgroundEventsResultSpan', []);
      },
    );
  });

  it('shows an error when trying to schedule a background event in the past', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        const pastDate = new Date(Date.now() - 5_000).toISOString();

        await TestSnaps.fillMessage('backgroundEventDateInput', pastDate);
        await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
        // Both iOS and Android show the snap's error as a native window.alert()
        // dialog from the test-snaps page (covers the WebView, so reading from
        // the in-page result span fails to find browser-webview). Match against
        // the alert text instead.
        await Assertions.expectTextDisplayed(
          'Cannot schedule an event in the past.',
          { timeout: 30000 },
        );
      },
    );
  });
});
