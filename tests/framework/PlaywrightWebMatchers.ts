import PlaywrightContextHelpers from './PlaywrightContextHelpers.ts';
import { wrapElement, type PlaywrightElement } from './PlaywrightAdapter.ts';
import { getDriver, withTimeout } from './PlaywrightUtilities.ts';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightWebMatchers');

/** Caps hung Chromedriver HTTP calls (CI default client timeout is ~12 min). */
const WEBVIEW_ELEMENT_LOOKUP_TIMEOUT_MS = 30_000;
const WEBVIEW_ELEMENT_WAIT_EXIST_MS = 15_000;

/**
 * Appium WebView element locators. Switches into the browser WebView context
 * for the given page URL before querying DOM selectors.
 */
export default class PlaywrightWebMatchers {
  private static getWebViewUrlFragment(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  private static async ensureWebViewContext(pageUrl: string): Promise<void> {
    const fragment = this.getWebViewUrlFragment(pageUrl);
    logger.info(`ensureWebViewContext: ${fragment}`);
    await PlaywrightContextHelpers.switchToWebViewContext(fragment);
  }

  static async getElementByWebID(
    innerID: string,
    pageUrl: string,
  ): Promise<PlaywrightElement> {
    logger.info(`getElementByWebID: #${innerID} (${pageUrl})`);
    await this.ensureWebViewContext(pageUrl);
    return this.findElementByWebID(innerID);
  }

  static async withWebViewAction(
    pageUrl: string,
    action: () => Promise<void>,
  ): Promise<void> {
    await this.ensureWebViewContext(pageUrl);
    try {
      await action();
    } finally {
      await PlaywrightContextHelpers.switchToNativeContext();
    }
  }

  private static async findElementByWebID(
    innerID: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const escapedId = innerID.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const selector = `[id="${escapedId}"]`;
    logger.info(`findElementByWebID: waiting for ${selector}`);
    const rawElem = await drv.$(selector);

    await withTimeout(
      rawElem.waitForExist({ timeout: WEBVIEW_ELEMENT_WAIT_EXIST_MS }),
      WEBVIEW_ELEMENT_LOOKUP_TIMEOUT_MS,
      `WebView element lookup (${selector})`,
    );

    logger.info(`findElementByWebID: found ${selector}`);
    return wrapElement(rawElem);
  }

  static async getElementByXPath(
    xpath: string,
    pageUrl: string,
  ): Promise<PlaywrightElement> {
    logger.info(`getElementByXPath: ${xpath} (${pageUrl})`);
    await this.ensureWebViewContext(pageUrl);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const elem = await drv.$(xpath);
    return wrapElement(elem);
  }
}
