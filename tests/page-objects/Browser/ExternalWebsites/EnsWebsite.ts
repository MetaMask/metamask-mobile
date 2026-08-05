import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { FrameworkDetector } from '../../../framework/FrameworkDetector';
import Matchers from '../../../framework/Matchers';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions';
import PlaywrightContextHelpers from '../../../framework/PlaywrightContextHelpers';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import PlaywrightWebMatchers from '../../../framework/PlaywrightWebMatchers';
import {
  EnsWebsiteSelectorsText,
  EnsWebsiteSelectorsXPath,
} from '../../../selectors/Browser/EnsWebsite.selectors';

class EnsWebsite {
  /**
   * Taps the "General" link on the ENS fixture page.
   * @param pageUrl - Full page URL (required for Appium WebView context switching).
   */
  async tapGeneralButton(pageUrl?: string): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      if (!pageUrl) {
        throw new Error(
          'pageUrl is required for EnsWebsite.tapGeneralButton under Appium',
        );
      }

      if (PlatformDetector.isAndroid()) {
        // Android Chromedriver context switch fails under LavaMoat ShadowRoot
        // scuttling — tap via the native accessibility tree instead.
        await PlaywrightContextHelpers.switchToNativeContext();
        await PlaywrightAssertions.expectElementToBeVisible(
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            EnsWebsiteSelectorsText.PAGE_HEADING,
          ),
        );

        const generalLink = await PlaywrightMatchers.getElementByAndroidUIAutomator(
          EnsWebsiteSelectorsText.GENERAL_LINK,
        );
        // Android WebView accessibility nodes can report displayed/enabled=false
        // even when they are tappable, so avoid strict state gates here.
        await PlaywrightGestures.waitAndTap(
          generalLink,
          {
            timeout: 15_000,
            delay: 0,
            checkForDisplayed: false,
            checkForEnabled: false,
          },
        );
        return;
      }

      await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
        await PlaywrightGestures.waitAndTap(
          await PlaywrightWebMatchers.getElementByXPath(
            EnsWebsiteSelectorsXPath.GENERAL_LINK,
            pageUrl,
          ),
        );
      });
      return;
    }

    const generalLink = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      EnsWebsiteSelectorsXPath.GENERAL_LINK,
    );
    await generalLink.tap();
  }
}

export default new EnsWebsite();
