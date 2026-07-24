import { PlatformDetector } from '../../../framework/PlatformLocator';
import PlaywrightContextHelpers from '../../../framework/PlaywrightContextHelpers';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import PlaywrightWebMatchers from '../../../framework/PlaywrightWebMatchers';
import { PlaywrightElement } from '../../../framework';
import {
  DownloadFileWebsiteSelectorsText,
  DownloadFileWebsiteSelectorsXPath,
} from '../../../selectors/Browser/DownloadFileWebsite.selectors';

class DownloadFileWebsite {
  async getAndroidPageHeading(): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getElementByAndroidUIAutomator(
      DownloadFileWebsiteSelectorsText.PAGE_HEADING,
    );
  }

  async getAndroidDownloadButton(): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getElementByAndroidUIAutomator(
      DownloadFileWebsiteSelectorsText.DOWNLOAD_BUTTON,
    );
  }

  async getWebDownloadButton(pageUrl: string): Promise<PlaywrightElement> {
    return PlaywrightWebMatchers.getElementByXPath(
      DownloadFileWebsiteSelectorsXPath.DOWNLOAD_BUTTON,
      pageUrl,
    );
  }

  /**
   * Taps the download button inside the fixture HTML page.
   * @param pageUrl - Full page URL (required for iOS Appium WebView context switching).
   */
  async tapDownloadFileButton(pageUrl: string): Promise<void> {
    if (PlatformDetector.isAndroid()) {
      // Android Chromedriver context switch fails under LavaMoat ShadowRoot
      // scuttling — tap the button via the native accessibility tree instead.
      await PlaywrightContextHelpers.switchToNativeContext();

      const pageHeading = await this.getAndroidPageHeading();
      await pageHeading.unwrap().waitForExist({ timeout: 30_000 });

      const downloadButton = await this.getAndroidDownloadButton();
      await PlaywrightGestures.waitAndTap(downloadButton, {
        timeout: 15_000,
      });
      return;
    }

    await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
      const downloadButton = await this.getWebDownloadButton(pageUrl);
      await downloadButton.unwrap().waitForExist({ timeout: 30_000 });
      await PlaywrightGestures.waitAndTap(downloadButton, {
        timeout: 15_000,
      });
    });
  }
}

export default new DownloadFileWebsite();
