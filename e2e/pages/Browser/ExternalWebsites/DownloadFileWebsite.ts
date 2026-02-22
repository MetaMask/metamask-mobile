import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Matchers from '../../../../tests/framework/Matchers.ts';

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
