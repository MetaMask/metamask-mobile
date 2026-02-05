import { FlaskBuildTests } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../../e2e/pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('WASM Snap Tests'), () => {
  it('can connect to the WASM Snap', async () => {
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

        await TestSnaps.installSnap('connectWasmButton');
      },
    );
  });

  it('return a response for the given number', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
      },
      async () => {
        await TestSnaps.fillMessage('wasmInput', '23');
        await TestSnaps.tapButton('sendWasmMessageButton');
        await TestSnaps.checkResultSpan('wasmResultSpan', '28657');
      },
    );
  });
});
