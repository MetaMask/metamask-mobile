import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Matchers from '../../../framework/Matchers';

class RedirectWebsite {
  /**
   * On Android we can't redirect to HTTP websites because this protocol is prohibited (error is net::ERR_CLEARTEXT_NOT_PERMITTED).
   * On iOS HTTP website will be open and redirect itself to HTTPS version.
   */
  async tapRedirectButton(): Promise<void> {
    const redirectButtonXpath =
      device.getPlatform() === 'android'
        ? "//button[@id='redirect_button_https']"
        : "//button[@id='redirect_button_http']";
    const redirectButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      redirectButtonXpath,
    );
    await redirectButton.tap(); // Click button to redirect to portfolio.metamask.io website
  }

  /**
   * Navigate to a target URL via JavaScript injection in the WebView.
   * Use this instead of tapRedirectButton when Detox WebView tap causes
   * ReactContext crashes during cross-origin navigations.
   */
  async navigateToTargetUrl(targetUrl: string): Promise<void> {
    const body = web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).element(
      by.web.cssSelector('body'),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (body as any).runScript(
      `(el) => { window.location.href = '${targetUrl}'; }`,
    );
  }
}

export default new RedirectWebsite();
