import { FlaskBuildTests } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { Assertions } from '../../framework';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Cronjob Snap Tests'), () => {
  it('can connect to the Cronjob Snap which triggers a dialog', async () => {
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

        await TestSnaps.installSnap('connectCronjobSnapButton');

        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a cronjob.',
          { timeout: 30_000 },
        );
      },
    );
  });
});
