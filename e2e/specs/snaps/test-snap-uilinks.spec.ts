import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { Assertions, Gestures, Matchers } from '../../framework';
import { emptyHtmlPage } from '../../api-mocking/mock-responses/empty-page-mock';

jest.setTimeout(150_000);

describe(FlaskBuildTests('UI Links Snap Test'), () => {
  it('opens a link in the browser', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [
            {
              urlEndpoint: 'https://snaps.metamask.io/',
              responseCode: 200,
              response: emptyHtmlPage,
            },
          ],
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectDialogSnapButton');

        await TestSnaps.tapButton('sendConfirmationButton');
        await Assertions.expectTextDisplayed('Confirmation Dialog');

        const link = Matchers.getElementByID('snaps-ui-link-icon');
        await Gestures.tap(link);

        await Assertions.expectTextDisplayed('Empty page by MetaMask');
      },
    );
  });
});
