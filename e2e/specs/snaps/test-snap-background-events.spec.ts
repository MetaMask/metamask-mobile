import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors.ts';
import { TestSnapResultSelectorWebIDS } from '../../selectors/Browser/TestSnaps.selectors.ts';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Background Events Snap Tests'), () => {
  it('can connect to the background events Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectBackgroundEventsButton');
      },
    );
  });

  it('it schedules a background event with an ISO 8601 date string', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        const futureDate = new Date(Date.now() + 5_000).toISOString();

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
      },
      async () => {
        await TestSnaps.fillMessage('backgroundEventDurationInput', 'PT5S');
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
      },
      async () => {
        const pastDate = new Date(Date.now() - 5_000).toISOString();

        await TestSnaps.fillMessage('backgroundEventDateInput', pastDate);
        await TestSnaps.tapButton('scheduleBackgroundEventWithDateButton');
        await Assertions.expectTextDisplayed(
          'Cannot schedule an event in the past.',
        );
      },
    );
  });
});
