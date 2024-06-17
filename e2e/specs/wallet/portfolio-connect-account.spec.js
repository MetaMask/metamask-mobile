'use strict';
import { SmokeCore } from '../../tags';
import TabBarComponent from '../../pages/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/WalletView';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import BrowserView from '../../pages/Browser/BrowserView';
import PortfolioHomePage from '../../pages/Browser/PortfolioHomePage';

const fixtureServer = new FixtureServer();

describe(SmokeCore('Connect account to Portfolio'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    fixture.state.user.seedphraseBackedUp = false;
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should connect wallet account to portfolio', async () => {
    await loginToApp();
    await WalletView.isVisible();
    if (device.getPlatform() === 'android') {
      /* closing all browser tabs before tapping Portfolio to interact with webview */
      //   await TabBarComponent.tapBrowser();
      //   await BrowserView.tapOpenAllTabsButton();
      //   await BrowserView.tapCloseAll();
      //   await TabBarComponent.tapWallet();
      await TabBarComponent.tapBrowser();
      await BrowserView.waitForBrowserPageToLoad();
      await BrowserView.tapUrlInputBox();
      await BrowserView.navigateToURL('https://portfolio.metamask.io');
      await BrowserView.waitForBrowserPageToLoad();
    } else {
      await WalletView.tapPortfolio();
      await BrowserView.waitForBrowserPageToLoad();
    }
    await PortfolioHomePage.tapConnectMetaMask();
  });

  //   it('should not open additional browser tabs to portfolio', async () => {});
});
