import ChromeCdpHelpers from '../../../framework/ChromeCdpHelpers';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import PlaywrightContextHelpers from '../../../framework/PlaywrightContextHelpers';
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

    // Chromedriver XPath / native resource-id taps do not run the page's
    // click handler under LavaMoat. Same CDP evaluate + el.click() path as
    // TestDApp / EnsWebsite.
    const result = await ChromeCdpHelpers.evaluateInWebView<string>(
      pageUrl,
      `(() => {
        const el = document.getElementById(${JSON.stringify(buttonId)});
        const target = new URLSearchParams(window.location.search).get('target');
        if (!el) return 'missing-button';
        if (!target) return 'missing-target:' + window.location.href;
        el.click();
        return 'clicked';
      })()`,
    );

    if (result !== 'clicked') {
      throw new Error(
        `RedirectWebsite.tapRedirectButton failed (${result ?? 'null'}) on ${pageUrl}`,
      );
    }

    await PlaywrightContextHelpers.switchToNativeContext();
  }
}

export default new RedirectWebsite();
