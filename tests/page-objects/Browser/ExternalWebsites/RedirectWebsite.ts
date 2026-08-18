import { PlatformDetector } from '../../../framework/PlatformLocator';
import WebView from '../../../framework/WebView';
import { RedirectWebsiteSelectorsIDs } from '../../../selectors/Browser/RedirectWebsite.selectors';

class RedirectWebsite {
  /**
   * On Android we can't redirect to HTTP websites because this protocol is
   * prohibited (error is net::ERR_CLEARTEXT_NOT_PERMITTED). On iOS HTTP
   * website will be open and redirect itself to HTTPS version.
   *
   * @param pageUrl - Full page URL (required for Appium WebView context switching).
   */
  async tapRedirectButton(pageUrl?: string): Promise<void> {
    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for RedirectWebsite.tapRedirectButton under Appium',
      );
    }

    const buttonId = PlatformDetector.isAndroid()
      ? RedirectWebsiteSelectorsIDs.REDIRECT_BUTTON_HTTPS
      : RedirectWebsiteSelectorsIDs.REDIRECT_BUTTON_HTTP;

    // Android Chromedriver XPath hits LavaMoat ShadowRoot scuttling. Use the
    // shared WebView helper (CDP / native UiAutomator on Android, WebView
    // context on iOS) the same way EnsWebsite / TestSnaps tap in-page controls.
    await WebView.tapById(buttonId, {
      pageUrl,
      description: 'Redirect website redirect button',
    });
  }
}

export default new RedirectWebsite();
