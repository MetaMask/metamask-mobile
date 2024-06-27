'use strict';
import { SmokeCore } from '../../tags';
import TabBarComponent from '../../pages/TabBarComponent';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import WalletView from '../../pages/WalletView';
import BrowserView from '../../pages/Browser/BrowserView';
import PortfolioHomePage from '../../pages/Browser/PortfolioHomePage';
import Assertions from '../../utils/Assertions';
import ConnectModal from '../../pages/modals/ConnectModal';

describe(SmokeCore('Connect account to Portfolio'), () => {
  beforeAll(async () => {
    jest.setTimeout(200000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should connect wallet account to portfolio', async () => {
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapBrowser();
    await BrowserView.tapOpenAllTabsButton();
    await BrowserView.tapCloseTabsButton();
    await Assertions.checkIfVisible(BrowserView.noTabsMessage);
    await TabBarComponent.tapWallet();
    await WalletView.tapPortfolio();
    await BrowserView.waitForBrowserPageToLoad();

    try {
      await PortfolioHomePage.closePrivacyModal();
    } catch {
      /* eslint-disable no-console */
      console.log('The Portfolio privacy modal is not visible');
    }
    await Assertions.checkIfVisible(ConnectModal.container);
    await ConnectModal.tapConnectButton();
    await Assertions.checkIfNotVisible(ConnectModal.container);
    await ConnectModal.tapConnectButton();
  });

  it('should not open additional browser tabs to portfolio', async () => {
    await Assertions.checkIfHasText(BrowserView.tabsNumber, '1');
    await TabBarComponent.tapWallet();
    await WalletView.tapPortfolio();
    await BrowserView.waitForBrowserPageToLoad();
    await Assertions.checkIfHasText(BrowserView.tabsNumber, '1');
  });
});
