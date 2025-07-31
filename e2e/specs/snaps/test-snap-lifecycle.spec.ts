import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import TestHelpers from '../../helpers';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import Assertions from '../../utils/Assertions';
import { loginToApp } from '../../viewHelper';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('Lifecycle hooks Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150_000);
  });

  it('runs the `onInstall` lifecycle hook when the Snap is installed', async () => {
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();

    await TestSnaps.installSnap('connectLifeCycleButton');

    await Assertions.checkIfTextIsDisplayed(
      'The Snap was installed successfully, and the "onInstall" handler was called.',
    );
  });

  it('runs the `onStart` lifecycle hook when the client is started', async () => {
    await TestHelpers.terminateApp();

    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    await Assertions.checkIfTextIsDisplayed(
      'The client was started successfully, and the "onStart" handler was called.',
    );
  });
});
