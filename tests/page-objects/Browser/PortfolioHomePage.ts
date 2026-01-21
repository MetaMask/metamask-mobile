import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import {
  PortfolioPageSelectorsXpath,
  PortfolioPageSelectorsWebID,
} from '../../locators/Browser/PortfolioPage.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PortfolioHomePage {
  get connectWalletButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsWebID.CONNECT_WALLET_BUTTON,
    );
  }

  get closeIconPrivacyModal(): WebElement {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.CLOSE_PRIVACY_MODAL,
    );
  }

  get accountButton(): WebElement {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.ACCOUNT_ICON_HREF,
    );
  }

  get burgerMenu(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsWebID.BURGER_MENU_BUTTON,
    );
  }

  async tapConnectMetaMask(): Promise<void> {
    await Gestures.waitAndTap(this.connectWalletButton, {
      elemDescription: 'Portfolio - Connect MetaMask button',
    });
  }

  async closePrivacyModal(): Promise<void> {
    await Gestures.waitAndTap(this.closeIconPrivacyModal, {
      elemDescription: 'Portfolio - Close privacy modal',
    });
  }

  async tapAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.accountButton, {
      elemDescription: 'Portfolio - Account button',
    });
  }

  async tapBurgerMenu(): Promise<void> {
    await Gestures.waitAndTap(this.burgerMenu, {
      elemDescription: 'Portfolio - Burger menu',
    });
  }
}

export default new PortfolioHomePage();
