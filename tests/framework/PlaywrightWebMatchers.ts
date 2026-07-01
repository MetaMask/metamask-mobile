import PlaywrightContextHelpers from './PlaywrightContextHelpers.ts';
import { wrapElement, type PlaywrightElement } from './PlaywrightAdapter.ts';
import {
  getActiveBrowserUrl,
  getWebViewUrlFragment,
} from './ActiveBrowserUrl.ts';
import { getDriver } from './PlaywrightUtilities.ts';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightWebMatchers');

/**
 * Appium WebView element locators. Switches into the browser WebView context
 * using the active browser URL before querying DOM selectors.
 */
export default class PlaywrightWebMatchers {
  private static async ensureWebViewContext(pageUrl?: string): Promise<void> {
    const url = pageUrl ?? getActiveBrowserUrl();
    const fragment = getWebViewUrlFragment(url);
    logger.debug(`Ensuring WebView context for: ${fragment}`);
    await PlaywrightContextHelpers.switchToWebViewContext(fragment);
  }

  static async getElementByWebID(
    innerID: string,
    pageUrl?: string,
  ): Promise<PlaywrightElement> {
    await this.ensureWebViewContext(pageUrl);
    return this.findElementByWebID(innerID);
  }

  static async withWebViewAction<T>(
    action: () => Promise<T>,
    pageUrl?: string,
  ): Promise<T> {
    await this.ensureWebViewContext(pageUrl);
    try {
      return await action();
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
    pageUrl?: string,
  ): Promise<PlaywrightElement> {
    await this.ensureWebViewContext(pageUrl);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const elem = await drv.$(xpath);
    return wrapElement(elem);
  }
}
