import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import BrowserView from '../../pages/Browser/BrowserView';
import TestSnaps from '../../pages/Browser/TestSnap';

const fixtureServer = new FixtureServer();

describe(SmokeNetworkExpansion('BIP-44 Snap Tests'), () => {

  const BIP_44_SNAP_NAME = 'BIP-44 Example Snap';
  const EXPECTED_PUBLIC_KEY = '"0x90043dd7faa56b3ed9fe959d25ae17132dc7e0f604663e68a84cf21e0f64390fbdd4781e4baa99c236f3bbf95182bdee"';
  const EXPECTED_SIGNATURE = '"0xa0cb4e931890059764c8ef1c4a7380c1d0bd11209eb899d49f5d2856224cb2a8a82f5136b7bc579c539332609336f3a6159fc1df6116acfe55dbbe5ccdffecc4984904c603dda0b3c91757dc6a590069a6c41837e1ab88e9dc21769d742f9a67"';
  const expectedCustomSignature = '"0xac396aaaf817d880ceab9b24995818436dee605524ae68061661fd69e340068fd55a24f579017c3591ed60d4738f25720ac3f23964c0209119e8afb2e20088a652b581a32b96002b7a282bf200ef1a463fb0ff56e2c3937f140a5300a5eacbc1"';
  const customMessage = 'This is a custom test message.';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    // Navigate to test snaps URL once for all tests
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();
    await Assertions.checkIfVisible(BrowserView.browserScreenID);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should connect to BIP-44 snap', async ()=> {
    // Connect to BIP-44 snap
    await TestSnaps.connectToBip44Snap();
    await TestHelpers.delay(1000);
    await TestSnaps.connectToSnap();
    await Assertions.checkIfTextIsDisplayed(BIP_44_SNAP_NAME);
    await TestSnaps.connectToSnapPermissionsRequest();
    await TestSnaps.approveSnapPermissionsRequest();
    await TestSnaps.connectToSnapInstallOk();
  });

  it('should get BIP-44 public key', async () => {
    // Get public key
    await TestSnaps.tapPublicKeyBip44Button();
    await TestHelpers.delay(3000);
    const actualText = await TestSnaps.getBip44ResultText();
    await Assertions.checkIfTextMatches(actualText, EXPECTED_PUBLIC_KEY);
  });

  it('should sign BIP-44 message', async () => {
    // Click sign button
    await TestSnaps.tapSignBip44MessageButton();
    await Assertions.checkIfTextIsDisplayed('Signature request');
    await TestHelpers.delay(1000);
    await TestSnaps.approveSignRequest();
    await TestHelpers.delay(3000);
    const actualText = await TestSnaps.getSignBip44MessageResultText();
    await Assertions.checkIfTextMatches(actualText, EXPECTED_SIGNATURE);
  });

  it('should sign a custom message', async () => {
    await TestSnaps.typeSignMessage(customMessage);
    await TestSnaps.tapSignBip44MessageButton();
    await TestSnaps.approveSignRequest();
    await TestHelpers.delay(3000);
    const actualText = await TestSnaps.getSignBip44MessageResultText();
    await Assertions.checkIfTextMatches(actualText, expectedCustomSignature);
  });
});
