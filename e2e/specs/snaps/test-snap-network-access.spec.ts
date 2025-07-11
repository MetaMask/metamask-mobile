import TestHelpers from '../../helpers';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import BrowserView from '../../pages/Browser/BrowserView';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { AnvilPort } from '../../fixtures/utils';

describe(FlaskBuildTests('Network Access Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('can use fetch and WebSockets', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        // @ts-expect-error Type for this property does not exist yet.
        localNodeOptions: [{ type: 'anvil', options: { blockTime: 2 } }],
      },
      async () => {
        await loginToApp();

        // Navigate to test snaps URL once for all tests
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();
        await TestHelpers.delay(3500); // Wait for page to load
        await Assertions.checkIfVisible(BrowserView.browserScreenID);

        await TestSnaps.installSnap('connectNetworkAccessButton');

        // Use fetch
        await TestSnaps.tapButton('sendNetworkAccessTestButton');
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpanIncludes(
          'networkAccessResultSpan',
          '"hello": "world"',
        );

        // Use WebSockets
        const webSocketUrl = `ws://localhost:${AnvilPort()}`;
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
