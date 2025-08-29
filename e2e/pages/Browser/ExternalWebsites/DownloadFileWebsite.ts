import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors.ts';
import Matchers from '../../../framework/Matchers.ts';

class DownloadFileWebsite {
  async tapDownloadFileButton(): Promise<void> {
    const downloadButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[@id='download_button']",
    );
    await downloadButton.tap();
  }
}

export default new DownloadFileWebsite();
