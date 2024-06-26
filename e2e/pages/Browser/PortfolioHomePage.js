import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { PortfolioPageSelectors } from '../../selectors/Browser/PortfolioPage.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import TestHelpers from '../../helpers';

class PortfolioHomePage {
  get connectWalletButton() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectors.CONNECT_WALLET_BUTTON,
    );
  }

  get closeIconPrivacyModal() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PortfolioPageSelectors.CLOSE_PRIVACY_MODAL,
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
}

export default new PortfolioHomePage();
