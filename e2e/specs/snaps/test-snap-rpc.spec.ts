import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { getFixturesServerPort } from '../../fixtures/utils';
import TestHelpers from '../../helpers';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('Snap RPC Tests'), () => {
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

  it('can use the cross-snap RPC endowment and produce a public key', async () => {
    await TestSnaps.installSnap('connectBip32Button');
    await TestSnaps.installSnap('connectJsonRpcButton');

    await TestSnaps.tapButton('sendRpcButton');
    await TestSnaps.checkResultSpan(
      'rpcResultSpan',
      '"0x033e98d696ae15caef75fa8dd204a7c5c08d1272b2218ba3c20feeb4c691eec366"',
    );
  });
});
