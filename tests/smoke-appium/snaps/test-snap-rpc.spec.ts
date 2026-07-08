// Prefer release/main-e2e builds for Snap smoke — debug builds may open the RN dev menu during browser actions (see helpers/snap-smoke.helpers.ts).
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Snap RPC Tests'), () => {
  appiumTest(
    'can use the cross-snap RPC endowment and produce a public key',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        },
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
