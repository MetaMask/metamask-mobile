import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class PortfolioHomePage {
  get connectWalletButton() {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      '//*[@id="connect-wallet-button"]/span',
    );
  }

  async tapConnectMetaMask() {
    await Gestures.tapWebElement(this.connectWalletButton);
  }
}

export default new PortfolioHomePage();
