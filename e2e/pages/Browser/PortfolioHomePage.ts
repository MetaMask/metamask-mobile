import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { PortfolioPageSelectorsXpath, PortfolioPageSelectorsWebID } from '../../selectors/Browser/PortfolioPage.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

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
    await Gestures.tapWebElement(this.connectWalletButton);
  }

  async closePrivacyModal(): Promise<void> {
    await Gestures.tapWebElement(this.closeIconPrivacyModal, {delayBeforeTap: 1000});
  }

  async tapAccountButton(): Promise<void> {
    await Gestures.tapWebElement(this.accountButton);
  }

  async tapBurgerMenu(): Promise<void> {
    await Gestures.tapWebElement(this.burgerMenu);
  }
}

export default new PortfolioHomePage(); 