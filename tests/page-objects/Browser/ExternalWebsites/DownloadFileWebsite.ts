import Assertions from '../../../framework/Assertions';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import AppiumContextHelpers from '../../../framework/AppiumContextHelpers';
import WebView from '../../../framework/WebView';
import type { AppiumElement } from '../../../framework';
import {
  DownloadFileWebsiteSelectorsIDs,
  DownloadFileWebsiteSelectorsText,
} from '../../../selectors/Browser/DownloadFileWebsite.selectors';

class DownloadFileWebsite {
  get androidPageHeading(): Promise<AppiumElement> {
    return Matchers.getElementByAndroidUIAutomator(
      DownloadFileWebsiteSelectorsText.PAGE_HEADING,
    );
  }

  get androidDownloadButton(): Promise<AppiumElement> {
    return Matchers.getElementByAndroidUIAutomator(
      DownloadFileWebsiteSelectorsText.DOWNLOAD_BUTTON,
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
      await AppiumContextHelpers.switchToNativeContext();

      await Assertions.expectElementToBeVisible(this.androidPageHeading);

      await Gestures.waitAndTap(this.androidDownloadButton, {
        elemDescription: 'Download File website - Download button (Android)',
      });
      return;
    }

    // iOS: WebView.tapById recovers from LavaMoat scuttling on find/tap via
    // page-script click (remote-debugger `element` can fail on `navigator`).
    // Always restores NATIVE_APP so Save-sheet asserts stay in native context.
    await WebView.tapById(DownloadFileWebsiteSelectorsIDs.DOWNLOAD_BUTTON, {
      pageUrl,
      description: 'Download File website - Download button (iOS)',
    });
  }
}

export default new DownloadFileWebsite();
