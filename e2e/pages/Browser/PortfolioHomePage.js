import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { PortfolioPageSelectorsXpath, PortfolioPageSelectorsWebID } from '../../selectors/Browser/PortfolioPage.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import TestHelpers from '../../helpers';

class PortfolioHomePage {
  get connectWalletButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsWebID.CONNECT_WALLET_BUTTON,
    );
  }

  get closeIconPrivacyModal() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.CLOSE_PRIVACY_MODAL,
    );
  }

  get accountButton() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.ACCOUNT_ICON_HREF,
    );
  }

  get burgerMenu() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsWebID.BURGER_MENU_BUTTON,
    );
  }

  async tapConnectMetaMask() {
    await Gestures.tapWebElement(this.connectWalletButton);
  }

  async closePrivacyModal() {
    await TestHelpers.delay(1000);
    await Gestures.tapWebElement(this.closeIconPrivacyModal);
  }

  async tapAccountButton() {
    await Gestures.tapWebElement(this.accountButton);
  }

  async tapBurgerMenu() {
    await Gestures.tapWebElement(this.burgerMenu);
  }
}

export default new PortfolioHomePage();
