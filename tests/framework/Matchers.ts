import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import type { AppiumElement } from './AppiumElement.ts';
import { resolve } from './Selector.ts';
import AppiumMatchers from './AppiumMatchers.ts';
import AppiumWebMatchers from './AppiumWebMatchers.ts';
import type { ScrollContainer } from './types.ts';
import { PlatformDetector } from './PlatformLocator.ts';

/**
 * Utility class for matching (locating) UI elements (Appium Element API).
 */
export default class Matchers {
  /**
   * Get element by ID with optional index.
   */
  static getElementByID(
    elementId: string | RegExp,
    index?: number,
  ): Promise<AppiumElement> {
    if (typeof elementId === 'string') {
      return resolve({ testID: elementId, index });
    }

    return resolve({ testIDPattern: elementId, index });
  }

  /**
   * Get element by text with optional index.
   */
  static getElementByText(
    text: string | RegExp,
    index = 0,
  ): Promise<AppiumElement> {
    if (typeof text === 'string') {
      return resolve({ text, index });
    }

    return resolve({ textPattern: text, index });
  }

  /**
   * Get element by text (contains). Useful for ordered list checks.
   */
  static getElementByTextContains(
    containsText: string,
    index = 0,
  ): Promise<AppiumElement> {
    return AppiumMatchers.getElementByText(containsText, false, { index });
  }

  /**
   * Get element that matches by id and label.
   */
  static async getElementByIDAndLabel(
    id: string,
    label: string | RegExp,
    index = 0,
  ): Promise<AppiumElement> {
    const labelText = typeof label === 'string' ? label : label.source;
    if (PlatformDetector.isAndroid()) {
      const escapedLabel = labelText.replace(/"/g, '\\"');
      return AppiumMatchers.getElementByAndroidUIAutomator(
        `.resourceId("${id}").description("${escapedLabel}")`,
        { index },
      );
    }
    const escapedId = id.replace(/"/g, '\\"');
    const escapedLabel = labelText.replace(/"/g, '\\"');
    return AppiumMatchers.getElementByIOSPredicate(
      `name == "${escapedId}" AND (label == "${escapedLabel}" OR value == "${escapedLabel}")`,
    );
  }

  /**
   * Get element by label (accessibility label on iOS, content description on Android)
   */
  static getElementByLabel(
    label: string,
    index?: number,
  ): Promise<AppiumElement> {
    return resolve({ label, index });
  }

  /**
   * Get element by descendant relationship (parent contains child).
   */
  static getElementByDescendant(
    parentElement: string,
    childElement: string,
  ): Promise<AppiumElement> {
    return AppiumMatchers.getElementByXPath(
      Matchers.buildDescendantXPath(parentElement, childElement),
    );
  }

  /**
   * Get element with ancestor relationship (child under parent).
   */
  static getElementIDWithAncestor(
    childElement: string,
    parentElement: string,
  ): Promise<AppiumElement> {
    return AppiumMatchers.getElementByXPath(
      Matchers.buildAncestorXPath(childElement, parentElement),
    );
  }

  /**
   * Design-system text fields often attach `testID` to a wrapper; match the
   * inner `EditText` under that id on Android.
   */
  static async getEditTextWithAncestorTestId(
    ancestorTestId: string,
  ): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      const escaped = ancestorTestId.replace(/"/g, '\\"');
      return AppiumMatchers.getElementByAndroidUIAutomator(
        `.className("android.widget.EditText").fromParent(new UiSelector().resourceId("${escaped}"))`,
      );
    }
    return this.getElementByID(ancestorTestId);
  }

  /**
   * Get element by web ID within a webview
   */
  static async getElementByWebID(
    _webviewID: string,
    innerID: string,
    pageUrl?: string,
  ): Promise<AppiumElement> {
    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for Appium WebView element lookup via getElementByWebID',
      );
    }
    return AppiumWebMatchers.getElementByWebID(innerID, pageUrl);
  }

  /**
   * Get element by CSS selector within a webview
   */
  static async getElementByCSS(
    _webviewID: string,
    selector: string,
    pageUrl?: string,
  ): Promise<AppiumElement> {
    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for Appium WebView element lookup via getElementByCSS',
      );
    }
    return AppiumWebMatchers.getElementByCSS(selector, pageUrl);
  }

  /**
   * Get element by XPath within a webview
   */
  static async getElementByXPath(
    _webviewID: string,
    xpath: string,
    pageUrl?: string,
  ): Promise<AppiumElement> {
    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for Appium WebView element lookup via getElementByXPath',
      );
    }
    return AppiumWebMatchers.getElementByXPath(xpath, pageUrl);
  }

  /**
   * Get a browser WebView test element by data-testid.
   */
  static getTestElement(
    dataTestId: string,
    options: { extraXPath?: string; tag?: string; pageUrl: string },
  ): Promise<AppiumElement> {
    const { tag = 'div', extraXPath = '', pageUrl } = options;
    const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;
    return this.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      xpath,
      pageUrl,
    );
  }

  /**
   * Get element by href within a webview
   */
  static async getElementByHref(
    _webviewID: string,
    url: string,
    pageUrl?: string,
  ): Promise<AppiumElement> {
    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for Appium WebView element lookup via getElementByHref',
      );
    }
    return AppiumWebMatchers.getElementByHref(url, pageUrl);
  }

  /**
   * Scroll container for Gestures.scrollToElement (testID string).
   */
  static async getIdentifier(selectorString: string): Promise<ScrollContainer> {
    return this.scrollContainer(selectorString);
  }

  /**
   * Scroll container for Gestures.scrollToElement.
   */
  static scrollContainer(selectorString: string): ScrollContainer {
    return selectorString;
  }

  /**
   * Get system dialogs (permissions, alerts) by text.
   */
  static async getSystemElementByText(text: string): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return AppiumMatchers.getElementByText(text, true);
    }
    const escaped = text.replace(/"/g, '\\"');
    return AppiumMatchers.getElementByIOSPredicate(
      `label == "${escaped}" OR name == "${escaped}"`,
    );
  }

  /**
   * Get all elements matching an XPath selector (Appium-only).
   */
  static async getAllElementsByXPath(xpath: string): Promise<AppiumElement[]> {
    return AppiumMatchers.getAllElementsByXPath(xpath);
  }

  /** Native app XPath (not WebView). */
  static getElementByNativeXPath(
    xpath: string,
    options?: Parameters<typeof AppiumMatchers.getElementByXPath>[1],
  ): Promise<AppiumElement> {
    return AppiumMatchers.getElementByXPath(xpath, options);
  }

  /**
   * Lazy native XPath — re-queries on each poll.
   */
  static getLazyElementByNativeXPath(xpath: string): Promise<AppiumElement> {
    return AppiumMatchers.getLazyElementByXPath(xpath);
  }

  static getElementByIOSPredicate(predicate: string): Promise<AppiumElement> {
    return AppiumMatchers.getElementByIOSPredicate(predicate);
  }

  static getElementByAndroidUIAutomator(
    selector: string,
    options?: Parameters<
      typeof AppiumMatchers.getElementByAndroidUIAutomator
    >[1],
  ): Promise<AppiumElement> {
    return AppiumMatchers.getElementByAndroidUIAutomator(selector, options);
  }

  /**
   * Counts native elements matching text via a single snapshot (Appium).
   */
  static countElementsByText(
    text: string,
    exactMatch = false,
  ): Promise<number> {
    return AppiumMatchers.countElementsByText(text, exactMatch);
  }

  /**
   * Native iOS name locator (Appium).
   */
  static getElementByNameiOS(
    name: string,
    lazy = false,
  ): Promise<AppiumElement> {
    return AppiumMatchers.getElementByNameiOS(name, lazy);
  }

  /**
   * Exact text match (Appium).
   */
  static getElementByExactText(text: string): Promise<AppiumElement> {
    return AppiumMatchers.getElementByText(text, true);
  }

  private static escapeXPathLiteral(value: string): string {
    if (!value.includes("'")) {
      return `'${value}'`;
    }
    if (!value.includes('"')) {
      return `"${value}"`;
    }
    return `concat('${value.replace(/'/g, "',\"'\",'")}')`;
  }

  private static buildDescendantXPath(
    parentElement: string,
    childElement: string,
  ): string {
    const parent = Matchers.escapeXPathLiteral(parentElement);
    const child = Matchers.escapeXPathLiteral(childElement);
    if (PlatformDetector.isAndroid()) {
      return `//*[@resource-id=${parent} or @content-desc=${parent}]//*[@resource-id=${child} or @content-desc=${child}]`;
    }
    return `//*[@name=${parent} or @label=${parent}]//*[@name=${child} or @label=${child}]`;
  }

  private static buildAncestorXPath(
    childElement: string,
    parentElement: string,
  ): string {
    const parent = Matchers.escapeXPathLiteral(parentElement);
    const child = Matchers.escapeXPathLiteral(childElement);
    if (PlatformDetector.isAndroid()) {
      return `//*[@resource-id=${parent} or @content-desc=${parent}]//*[@resource-id=${child} or @content-desc=${child}]`;
    }
    return `//*[@name=${parent} or @label=${parent}]//*[@name=${child} or @label=${child}]`;
  }
}
