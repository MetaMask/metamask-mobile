import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { FlaskBuildTests } from '../../tags';
import Assertions from '../../framework/Assertions';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';

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
        } catch {
          // The assertions inside may fail due to the ongoing test.
        }

        await Assertions.checkIfTextIsDisplayed(
          'The client was started successfully, and the "onStart" handler was called.',
        );
      },
    );
  });
});
