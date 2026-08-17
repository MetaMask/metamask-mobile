import { PlatformDetector } from '../../../framework/PlatformLocator';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions';
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

      await PlaywrightAssertions.expectElementToBeVisible(
        this.getAndroidPageHeading(),
      );

      await PlaywrightGestures.waitAndTap(
        await this.getAndroidDownloadButton(),
      );
      return;
    }

    await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
      await PlaywrightGestures.waitAndTap(
        await this.getWebDownloadButton(pageUrl),
      );
    });
  }
}

export default new DownloadFileWebsite();
