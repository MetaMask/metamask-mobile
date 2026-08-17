import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../framework/Assertions';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import PlaywrightContextHelpers from '../../../framework/PlaywrightContextHelpers';
import type { EncapsulatedElementType } from '../../../framework';
import {
  DownloadFileWebsiteSelectorsText,
  DownloadFileWebsiteSelectorsXPath,
} from '../../../selectors/Browser/DownloadFileWebsite.selectors';

class DownloadFileWebsite {
  get androidPageHeading(): EncapsulatedElementType {
    return Matchers.getElementByAndroidUIAutomator(
      DownloadFileWebsiteSelectorsText.PAGE_HEADING,
    );
  }

  get androidDownloadButton(): EncapsulatedElementType {
    return Matchers.getElementByAndroidUIAutomator(
      DownloadFileWebsiteSelectorsText.DOWNLOAD_BUTTON,
    );
  }

  getWebDownloadButton(pageUrl: string): EncapsulatedElementType {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
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

      await Assertions.expectElementToBeVisible(this.androidPageHeading);

      await Gestures.waitAndTap(this.androidDownloadButton, {
        elemDescription: 'Download File website - Download button (Android)',
      });
      return;
    }

    await Gestures.waitAndTap(this.getWebDownloadButton(pageUrl), {
      elemDescription: 'Download File website - Download button (iOS)',
    });
  }
}

export default new DownloadFileWebsite();
