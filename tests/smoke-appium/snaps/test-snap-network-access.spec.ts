import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { LocalNodeType } from '../../framework/types.js';
import { getAnvilPortForTest } from '../../framework/fixtures/FixtureUtils.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { defaultOptions } from '../../seeder/anvil-manager.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Network Access Snap Tests'), () => {
  appiumTest.describe.configure({ timeout: 150_000 });

  appiumTest(
    'can use fetch and WebSockets',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                ...defaultOptions,
                blockTime: 2,
              },
            },
          ],
        },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectNetworkAccessButton');

          await TestSnaps.tapButton('sendNetworkAccessTestButton');
          await TestSnaps.checkResultSpanIncludes(
            'networkAccessResultSpan',
            '"hello": "world"',
          );

          const webSocketUrl = `ws://localhost:${getAnvilPortForTest()}`;
          await TestSnaps.fillMessage('webSocketUrlInput', webSocketUrl);
          await TestSnaps.tapButton('startWebSocket');

          await TestSnaps.waitForWebSocketUpdate({
            open: true,
            origin: webSocketUrl,
            blockNumber: 'number',
          });

          await TestSnaps.tapButton('stopWebSocket');

          await TestSnaps.waitForWebSocketUpdate({
            open: false,
            origin: null,
            blockNumber: null,
          });
        },
      );
    },
  );
});
