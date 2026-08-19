import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import { RedirectWebsiteSelectorsXPath } from '../../../selectors/Browser/RedirectWebsite.selectors';

class RedirectWebsite {
  /**
   * On Android we can't redirect to HTTP websites because this protocol is
   * prohibited (error is net::ERR_CLEARTEXT_NOT_PERMITTED). On iOS HTTP
   * website will be open and redirect itself to HTTPS version.
   *
   * @param pageUrl - Full page URL (required for Appium WebView context switching).
   */
  async tapRedirectButton(pageUrl?: string): Promise<void> {
    const redirectButtonXpath = PlatformDetector.isAndroid()
      ? RedirectWebsiteSelectorsXPath.REDIRECT_BUTTON_HTTPS
      : RedirectWebsiteSelectorsXPath.REDIRECT_BUTTON_HTTP;

    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for RedirectWebsite.tapRedirectButton under Appium',
      );
    }

    const redirectButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      redirectButtonXpath,
      pageUrl,
    );
    await Gestures.waitAndTap(redirectButton, {
      elemDescription: 'Redirect website redirect button',
    });
  }
}

export default new RedirectWebsite();
