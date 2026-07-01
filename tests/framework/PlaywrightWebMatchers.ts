import PlaywrightContextHelpers from './PlaywrightContextHelpers.ts';
import { wrapElement, type PlaywrightElement } from './PlaywrightAdapter.ts';
import { getDriver } from './PlaywrightUtilities.ts';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightWebMatchers');

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
    logger.debug(`Ensuring WebView context for: ${fragment}`);
    await PlaywrightContextHelpers.switchToWebViewContext(fragment);
  }

  static async getElementByWebID(
    innerID: string,
    pageUrl: string,
  ): Promise<PlaywrightElement> {
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
    const elem = await drv.$(`[id="${escapedId}"]`);
    return wrapElement(elem);
  }

  static async getElementByXPath(
    xpath: string,
    pageUrl: string,
  ): Promise<PlaywrightElement> {
    await this.ensureWebViewContext(pageUrl);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const elem = await drv.$(xpath);
    return wrapElement(elem);
  }
}
