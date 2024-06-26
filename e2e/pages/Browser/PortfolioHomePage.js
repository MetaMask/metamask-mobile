import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { PortfolioPageSelectorsXpath } from '../../selectors/Browser/PortfolioPage.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import TestHelpers from '../../helpers';

class PortfolioHomePage {
  get connectWalletButton() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectorsXpath.CONNECT_WALLET_BUTTON,
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

  async tapConnectMetaMask() {
    await TestHelpers.delay(1000);
    await Gestures.tapWebElement(this.connectWalletButton);
  }

  async closePrivacyModal() {
    await TestHelpers.delay(1000);
    await Gestures.tapWebElement(this.closeIconPrivacyModal);
  }

  async tapAccountButton() {
    await Gestures.tapWebElement(this.accountButton);
  }
}

export default new PortfolioHomePage();
