import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { Mockttp } from 'mockttp';
import { mockWasmSnap } from '../../api-mocking/mock-response-data/snaps/snap-binary-mocks';

jest.setTimeout(150_000);

describe(FlaskBuildTests('WASM Snap Tests'), () => {
  it('can connect to the WASM Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockWasmSnap(mockServer);
        },
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
