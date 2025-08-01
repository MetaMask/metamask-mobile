import TestHelpers from '../../helpers';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('Client Status Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withMultiSRPKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    // Navigate to test snaps URL once for all tests
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150_000);
  });

  it('connects to the Client Status Snap', async () => {
    await TestSnaps.installSnap('connectClientStatusSnapButton');
  });

  it('returns the client status', async () => {
    await TestSnaps.tapButton('sendClientStatusButton');
    await TestSnaps.checkResultSpan(
      'clientStatusResultSpan',
      JSON.stringify({ locked: false, active: true }, null, 2),
    );
  });

  // Can't test this right now because the client needs to be unlocked in order
  // to interact with the Snap.
  it.todo('returns the client status with a locked client');
});
