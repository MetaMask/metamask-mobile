import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors.ts';
import Matchers from '../../../framework/Matchers.ts';

class RedirectWebsite {
  async tapRedirectButton(): Promise<void> {
    const redirectButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[@id='redirect_button']",
    );
    await redirectButton.tap(); // Click button to redirect to http://portfolio.metamask.io website
  }
}

export default new RedirectWebsite();
