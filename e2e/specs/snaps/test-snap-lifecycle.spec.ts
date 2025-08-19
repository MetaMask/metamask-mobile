import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import TestHelpers from '../../helpers';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import Assertions from '../../utils/Assertions';
import { loginToApp } from '../../viewHelper';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Lifecycle hooks Snap Tests'), () => {
  it('runs the `onInstall` lifecycle hook when the Snap is installed', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectLifeCycleButton');
        await Assertions.checkIfTextIsDisplayed(
          'The Snap was installed successfully, and the "onInstall" handler was called.',
        );
      },
    );
  });

  it('runs the `onStart` lifecycle hook when the client is started', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestHelpers.terminateApp();
        await TestHelpers.launchApp({
          launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
        });
        await loginToApp();

        await Assertions.checkIfTextIsDisplayed(
          'The client was started successfully, and the "onStart" handler was called.',
        );
      },
    );
  });
});
