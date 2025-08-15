import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import BrowserView from '../../pages/Browser/BrowserView';
import TestSnaps from '../../pages/Browser/TestSnaps';
import { AnvilPort } from '../../fixtures/utils';
import { LocalNodeType } from '../../framework';
import { defaultOptions } from '../../seeder/anvil-manager';

describe(FlaskBuildTests('Network Access Snap Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('can use fetch and WebSockets', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
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

        // Navigate to test snaps URL once for all tests
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();
        await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);

        await TestSnaps.installSnap('connectNetworkAccessButton');

        // Use fetch
        await TestSnaps.tapButton('sendNetworkAccessTestButton');
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
