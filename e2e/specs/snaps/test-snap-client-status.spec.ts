import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Client Status Snap Tests'), () => {
  it('connects to the Client Status Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectClientStatusSnapButton');
      },
    );
  });

  it('returns the client status', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('sendClientStatusButton');
        await TestSnaps.checkResultJson('clientStatusResultSpan', {
          locked: false,
          active: true,
        });
      },
    );
  });

  // Can't test this right now because the client needs to be unlocked in order
  // to interact with the Snap.
  it.todo('returns the client status with a locked client');
});
