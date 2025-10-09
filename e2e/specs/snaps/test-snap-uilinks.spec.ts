import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { Assertions, Matchers } from '../../framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('UI Links Snap Test'), () => {
  it('displays a link in the UI', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectDialogSnapButton');

        await TestSnaps.tapButton('sendConfirmationButton');
        await Assertions.expectTextDisplayed('Confirmation Dialog');

        const link = Matchers.getElementByID('snaps-ui-link-icon');
        await Assertions.expectElementToBeVisible(link);

        // Today there's no way to assert that the link opened the device browser. Instead we just test that
        // the link is displayed.
        // TODO: Assert that the browser has been opened and that the correct page has been displayed
      },
    );
  });
});
