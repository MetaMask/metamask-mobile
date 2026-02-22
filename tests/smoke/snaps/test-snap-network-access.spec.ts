import { FlaskBuildTests } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../../e2e/pages/Browser/TestSnaps';
import { getAnvilPortForTest } from '../../framework/fixtures/FixtureUtils';
import { LocalNodeType } from '../../framework';
import { defaultOptions } from '../../seeder/anvil-manager';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Network Access Snap Tests'), () => {
  it('can use fetch and WebSockets', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
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
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectNetworkAccessButton');

        // Use fetch
        await TestSnaps.tapButton('sendNetworkAccessTestButton');
        await TestSnaps.checkResultSpanIncludes(
          'networkAccessResultSpan',
          '"hello": "world"',
        );

        // Use WebSockets
        // Disable synchronization on iOS before starting WebSocket to prevent
        // Detox from hanging due to the open connection keeping the app "busy"
        if (device.getPlatform() === 'ios') {
          await device.disableSynchronization();
        }

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
  });
});
