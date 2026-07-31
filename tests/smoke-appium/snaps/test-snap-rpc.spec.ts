import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

const multiSrpFixture = new FixtureBuilder()
  .withMultiSRPKeyringController()
  .build();

appiumTest.describe(SmokeSnaps('Snap RPC Tests'), () => {
  appiumTest.describe.configure({ timeout: 150_000 });

  appiumTest(
    'can use the cross-snap RPC endowment and produce a public key',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { fixture: multiSrpFixture, restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectBip32Button');
          await TestSnaps.installSnap('connectJsonRpcButton');
          await TestSnaps.tapButton('sendRpcButton');
          await TestSnaps.checkResultSpan(
            'rpcResultSpan',
            '"0x033e98d696ae15caef75fa8dd204a7c5c08d1272b2218ba3c20feeb4c691eec366"',
          );
        },
      );
    },
  );
});
