'use strict';
/**
 * NOTE: This test is temporarily configured to use the online multichain test dapp
 * at https://devdapp.siteed.net/ instead of the local version.
 */
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';

describe(SmokeNetworkExpansion('Multichain API Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should load the multichain test dapp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await TestHelpers.reverseServerPort();

        // Login and navigate to the test dapp
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        // Navigate to the multichain test dapp
        await MultichainTestDApp.navigateToMultichainTestDApp();

        // Verify the WebView is visible
        await Assertions.checkIfVisible(
          Promise.resolve(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))),
        );
      },
    );
  });

  it('should connect to multichain dapp and create a session with multiple chains', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await TestHelpers.reverseServerPort();

        // Login and navigate to the test dapp
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        // Navigate to the multichain test dapp
        await MultichainTestDApp.navigateToMultichainTestDApp();

        // Connect to the dapp with window.postMessage as the extension ID
        await MultichainTestDApp.connect('window.postMessage');

        // Create a session with Ethereum and Linea networks
        await MultichainTestDApp.initCreateSessionScopes([
          'eip155:1',
          'eip155:59144',
        ]);

        // Get session data
        await MultichainTestDApp.getSession();
      },
    );
  });
});
