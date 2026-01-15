import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { FlaskBuildTests } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Snap RPC Tests'), () => {
  it('can use the cross-snap RPC endowment and produce a public key', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectBip32Button');
        await TestSnaps.installSnap('connectJsonRpcButton');

        await TestSnaps.tapButton('sendRpcButton');
        await TestSnaps.checkResultSpan(
          'rpcResultSpan',
          '"0x033e98d696ae15caef75fa8dd204a7c5c08d1272b2218ba3c20feeb4c691eec366"',
        );
      },
    );
  });
});
