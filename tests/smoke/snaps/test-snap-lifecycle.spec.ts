import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { FlaskBuildTests } from '../../tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Lifecycle hooks Snap Tests'), () => {
  it('runs the onInstall lifecycle hook when the Snap is installed', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectLifeCycleButton');
        await Assertions.checkIfTextIsDisplayed(
          'The Snap was installed successfully, and the "onInstall" handler was called.',
        );
      },
    );
  });

  it('runs the onStart lifecycle hook when the client is started', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withSnapControllerOnStartLifecycleSnap()
          .build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        try {
          await loginToApp();
        } catch (error) {
          // loginToApp may fail if the onStart snap dialog appears before
          // the wallet view becomes visible. Only swallow errors caused by
          // this expected interruption; re-throw anything else so genuine
          // login failures are not silently hidden.
          if (
            !(error instanceof Error) ||
            !error.message.includes('Wallet container')
          ) {
            throw error;
          }
        }

        await Assertions.checkIfTextIsDisplayed(
          'The client was started successfully, and the "onStart" handler was called.',
        );
      },
    );
  });
});
