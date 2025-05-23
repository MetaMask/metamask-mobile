'use strict';
import TestHelpers from '../../../helpers';
import { SmokeNetworkExpansion } from '../../../tags';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS, DEFAULT_SOLANA_TEST_DAPP_PATH, withFixtures } from '../../../fixtures/fixture-helper';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../utils/Assertions';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors';

describe(SmokeNetworkExpansion('Solana Wallet Standard'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should load the solana test dapp', async () => {
    await withFixtures(
      {
        ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        dappPath: DEFAULT_SOLANA_TEST_DAPP_PATH,
        restartDevice: true,
      },
      async () => {
        await TestHelpers.reverseServerPort();

        // Login and navigate to the test dapp
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        // Navigate to the solana test dapp
        await SolanaTestDApp.navigateToSolanaTestDApp();

        const header = await SolanaTestDApp.getHeader();
        await header.connect();

        // Select the MetaMask wallet
        await header.selectMetaMask();

        // Verify the WebView is visible
        await Assertions.checkIfVisible(
          Promise.resolve(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))),
        );

      },
    );
  });
});
