import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors.ts';
import Matchers from '../../../framework/Matchers.ts';

class EnsWebsite {
  async tapGeneralButton(): Promise<void> {
    const generalLink = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//a[@href='./categories/general.html']",
    );
    await generalLink.tap();
  }
}

export default new EnsWebsite();
