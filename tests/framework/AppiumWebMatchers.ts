import AppiumContextHelpers from './AppiumContextHelpers.ts';
import { wrapElement, type AppiumElement } from './AppiumElement.ts';
import { getDriver, withTimeout } from './AppiumUtilities.ts';
import { createAppiumLogger } from './appiumLogger.ts';

const logger = createAppiumLogger('AppiumWebMatchers');

/** Caps hung Chromedriver HTTP calls (CI default client timeout is ~12 min). */
const WEBVIEW_ELEMENT_LOOKUP_TIMEOUT_MS = 30_000;
const WEBVIEW_ELEMENT_WAIT_EXIST_MS = 15_000;

/**
 * Appium WebView element locators. Switches into the browser WebView context
 * for the given page URL before querying DOM selectors.
 */
export default class AppiumWebMatchers {
  private static async ensureWebViewContext(pageUrl: string): Promise<void> {
    // Pass the absolute URL through — buildDappUrlPattern / urlsReferToSameDapp
    // need a parseable URL for localhost ↔ 10.0.2.2 ↔ 127.0.0.1 aliases.
    logger.debug(`Ensuring WebView context for: ${pageUrl}`);
    await AppiumContextHelpers.switchToWebViewContext(pageUrl);
  }

  static async getElementByWebID(
    innerID: string,
    pageUrl: string,
  ): Promise<AppiumElement> {
    await this.ensureWebViewContext(pageUrl);
    return this.findElementByWebID(innerID);
  }

  /**
   * Run `action` in the page's WEBVIEW context, then always restore NATIVE_APP.
   * Native assertions after WebView interaction rely on this restore — do not
   * compensate inside Assertions.
   */
  static async withWebViewAction(
    pageUrl: string,
    action: () => Promise<void>,
  ): Promise<void> {
    await this.ensureWebViewContext(pageUrl);
    try {
      await action();
    } finally {
      await AppiumContextHelpers.switchToNativeContext();
    }
  }

  private static async findElementByWebID(
    innerID: string,
  ): Promise<AppiumElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const escapedId = innerID.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const selector = `[id="${escapedId}"]`;
    const rawElem = await drv.$(selector);

    await withTimeout(
      rawElem.waitForExist({ timeout: WEBVIEW_ELEMENT_WAIT_EXIST_MS }),
      WEBVIEW_ELEMENT_LOOKUP_TIMEOUT_MS,
      `WebView element lookup (${selector})`,
    );

    return wrapElement(rawElem);
  }

  static async getElementByXPath(
    xpath: string,
    pageUrl: string,
  ): Promise<AppiumElement> {
    await this.ensureWebViewContext(pageUrl);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const elem = await drv.$(xpath);
    return wrapElement(elem);
  }

  /**
   * CSS selector inside a WebView (switches context for `pageUrl` first).
   */
  static async getElementByCSS(
    selector: string,
    pageUrl: string,
  ): Promise<AppiumElement> {
    await this.ensureWebViewContext(pageUrl);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const elem = await drv.$(selector);
    await withTimeout(
      elem.waitForExist({ timeout: WEBVIEW_ELEMENT_WAIT_EXIST_MS }),
      WEBVIEW_ELEMENT_LOOKUP_TIMEOUT_MS,
      `WebView CSS lookup (${selector})`,
    );
    return wrapElement(elem);
  }

  /**
   * Anchor/`href` lookup inside a WebView.
   */
  static async getElementByHref(
    url: string,
    pageUrl: string,
  ): Promise<AppiumElement> {
    const escaped = url.replace(/"/g, '\\"');
    return this.getElementByXPath(`//*[@href="${escaped}"]`, pageUrl);
  }
}
