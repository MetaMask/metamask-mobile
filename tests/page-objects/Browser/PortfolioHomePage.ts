import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import {
  PortfolioPageSelectorsXpath,
  PortfolioPageSelectorsWebID,
} from '../../selectors/Browser/PortfolioPage.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';

class PortfolioHomePage {
  getConnectWalletButton(pageUrl: string): Promise<AppiumElement> {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsWebID.CONNECT_WALLET_BUTTON,
      pageUrl,
    );
  }

  getCloseIconPrivacyModal(pageUrl: string): Promise<AppiumElement> {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.CLOSE_PRIVACY_MODAL,
      pageUrl,
    );
  }

  getAccountButton(pageUrl: string): Promise<AppiumElement> {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.ACCOUNT_ICON_HREF,
      pageUrl,
    );
  }

  getBurgerMenu(pageUrl: string): Promise<AppiumElement> {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsWebID.BURGER_MENU_BUTTON,
      pageUrl,
    );
  }

  async tapConnectMetaMask(pageUrl: string): Promise<void> {
    await Gestures.waitAndTap(this.getConnectWalletButton(pageUrl), {
      elemDescription: 'Portfolio - Connect MetaMask button',
    });
  }

  async closePrivacyModal(pageUrl: string): Promise<void> {
    await Gestures.waitAndTap(this.getCloseIconPrivacyModal(pageUrl), {
      elemDescription: 'Portfolio - Close privacy modal',
    });
  }

  async tapAccountButton(pageUrl: string): Promise<void> {
    await Gestures.waitAndTap(this.getAccountButton(pageUrl), {
      elemDescription: 'Portfolio - Account button',
    });
  }

  async tapBurgerMenu(pageUrl: string): Promise<void> {
    await Gestures.waitAndTap(this.getBurgerMenu(pageUrl), {
      elemDescription: 'Portfolio - Burger menu',
    });
  }
}

export default new PortfolioHomePage();
