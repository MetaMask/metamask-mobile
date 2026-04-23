import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { getAnvilPortForTest } from '../../framework/fixtures/FixtureUtils';
import { LocalNodeType } from '../../framework';
import { defaultOptions } from '../../seeder/anvil-manager';
import { DappVariants } from '../../framework/Constants';

jest.setTimeout(150_000);

// The snap execution WebView uses baseUrl 'https://localhost', so fetching from
// an HTTP DappServer URL triggers mixed-content blocking on iOS WKWebView.
// Use an HTTPS URL for the fetch test. This was the default behavior on main
// (window.location.href pointed to GitHub Pages HTTPS).
const FETCH_TEST_URL =
  'https://metamask.github.io/snaps/test-snaps/3.4.2/test-data.json';

describe(FlaskBuildTests('Network Access Snap Tests'), () => {
  it('can use fetch and WebSockets', async () => {
    await withFixtures(
      {
        dapps: [{ dappVariant: DappVariants.TEST_SNAPS }],
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

        // Use fetch — override the default URL (derived from window.location.href)
        // with an HTTPS endpoint to avoid iOS WKWebView mixed-content blocking
        await TestSnaps.fillMessage('fetchUrlInput', FETCH_TEST_URL);
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
