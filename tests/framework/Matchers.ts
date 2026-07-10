import { web, system } from 'detox';
import { type EncapsulatedElementType } from './EncapsulatedElement.ts';
import { FrameworkDetector } from './FrameworkDetector.ts';
import { resolve } from './Selector.ts';
import PlaywrightMatchers from './PlaywrightMatchers.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import type { ScrollContainer } from './types.ts';

/**
 * Utility class for matching (locating) UI elements
 */
export default class Matchers {
  /**
   * Get element by ID with optional index.
   */
  static getElementByID(
    elementId: string | RegExp,
    index?: number,
  ): EncapsulatedElementType {
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
  ): EncapsulatedElementType {
    if (typeof text === 'string') {
      return resolve({ text, index });
    }

    return resolve({ textPattern: text, index });
  }

  /**
   * Get element by text (case-insensitive contains). Useful for ordered list checks.
   */
  static async getElementByTextContains(
    containsText: string,
    index = 0,
  ): Promise<Detox.IndexableNativeElement> {
    const escaped = containsText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    return element(by.text(pattern)).atIndex(
      index,
    ) as Detox.IndexableNativeElement;
  }

  /**
   * Get element that matches by id and label
   * This strategy matches elements by combining 2 matchers together.
   * Elements returned match the provided ID and Label at the same time.
   */
  static async getElementByIDAndLabel(
    id: string,
    label: string | RegExp,
    index = 0,
  ): Promise<Detox.IndexableNativeElement> {
    return element(by.id(id).and(by.label(label))).atIndex(
      index,
    ) as Detox.IndexableNativeElement;
  }

  /**
   * Get element by label (accessibility label on iOS, content description on Android)
   */
  static getElementByLabel(
    label: string,
    index?: number,
  ): EncapsulatedElementType {
    return resolve({ label, index });
  }

  /**
   * Get element by descendant relationship
   */
  static async getElementByDescendant(
    parentElement: string,
    childElement: string,
  ): Promise<Detox.IndexableNativeElement> {
    return element(by.id(parentElement).withDescendant(by.id(childElement)));
  }

  /**
   * Get element with ancestor relationship
   */
  static async getElementIDWithAncestor(
    childElement: string,
    parentElement: string,
  ): Promise<Detox.IndexableNativeElement> {
    return element(by.id(childElement).withAncestor(by.id(parentElement)));
  }

  /**
   * Detox `replaceText` / `typeText` on Android require an `android.widget.EditText`.
   * Design-system text fields often attach `testID` to a wrapper (`Pressable` /
   * `ViewGroup`); match the inner `EditText` under that id (see also LoginView password).
   */
  static async getEditTextWithAncestorTestId(
    ancestorTestId: string,
  ): Promise<Detox.IndexableNativeElement> {
    if (device.getPlatform() === 'android') {
      return element(
        by.type('android.widget.EditText').withAncestor(by.id(ancestorTestId)),
      ) as Detox.IndexableNativeElement;
    }
    return (await this.getElementByID(
      ancestorTestId,
    )) as Detox.IndexableNativeElement;
  }

  /**
   * Get Native WebView instance by elementId
   * Because Android Webview might have more that one WebView instance present on the main activity,
   * the correct element is selected based on its parent element id.
   */
  static getWebViewByID(elementId: string): Detox.WebViewElement {
    if (process.env.CI) {
      return device.getPlatform() === 'ios'
        ? web(by.id(elementId))
        : web(by.type('android.webkit.WebView').withAncestor(by.id(elementId)));
    }
    return web(by.id(elementId));
  }

  /**
   * Get element by web ID within a webview
   */
  static async getElementByWebID(
    webviewID: string,
    innerID: string,
  ): WebElement {
    const myWebView = this.getWebViewByID(webviewID);
    return myWebView.element(by.web.id(innerID));
  }

  /**
   * Get element by CSS selector within a webview
   */
  static async getElementByCSS(
    webviewID: string,
    selector: string,
  ): Promise<Detox.IndexableWebElement> {
    const myWebView = this.getWebViewByID(webviewID);
    return myWebView
      .element(by.web.cssSelector(selector))
      .atIndex(0) as unknown as Detox.IndexableWebElement;
  }

  /**
   * Get element by XPath within a webview
   */
  static async getElementByXPath(
    webviewID: string,
    xpath: string,
  ): Promise<DetoxElement | WebElement> {
    const myWebView = this.getWebViewByID(webviewID);
    return myWebView.element(by.web.xpath(xpath));
  }

  /**
   * Get element by href within a webview
   */
  static async getElementByHref(
    webviewID: string,
    url: string,
  ): Promise<Detox.IndexableWebElement> {
    const myWebView = this.getWebViewByID(webviewID);
    return myWebView
      .element(by.web.href(url))
      .atIndex(0) as unknown as Detox.IndexableWebElement;
  }

  /**
   * Creates a Detox matcher for identifying an element by its ID
   * This method does not create an element but instead generates only a matcher.
   * The purpose is to create a matcher that can be used for identification purposes,
   * without performing any actions on the element.
   */
  static async getIdentifier(
    selectorString: string,
  ): Promise<Detox.NativeMatcher> {
    if (FrameworkDetector.isAppium()) {
      throw new Error(
        'Matchers.getIdentifier is Detox-only. Use scrollContainer(testId) for cross-framework scroll.',
      );
    }
    return by.id(selectorString);
  }

  /**
   * Scroll container for Gestures.scrollToElement.
   * Detox: native matcher by testID. Appium: testID string (resolved in UnifiedGestures).
   */
  static scrollContainer(selectorString: string): ScrollContainer {
    if (FrameworkDetector.isAppium()) {
      return selectorString;
    }
    return this.getIdentifier(selectorString);
  }

  /**
   * Get system dialogs in the system-level (e.g. permissions, alerts, etc.), by text
   */
  static async getSystemElementByText(
    text: string,
  ): Promise<Detox.IndexableSystemElement> {
    return system.element(by.system.label(text));
  }

  /**
   * Get all elements matching an XPath selector (Appium-only).
   * Returns an empty array when no element matches — use this when the count
   * itself is meaningful (e.g. asserting a duplicate label appears N times).
   * Detox has no direct equivalent; matched elements there are addressed via
   * `.atIndex(N)` on a Detox matcher instead.
   */
  static async getAllElementsByXPath(
    xpath: string,
  ): Promise<PlaywrightElement[]> {
    if (!FrameworkDetector.isAppium()) {
      throw new Error(
        'Matchers.getAllElementsByXPath is Appium-only. On Detox, use the matcher returned by getElementByID/getElementByIDAndLabel and address indices via .atIndex(N).',
      );
    }
    return PlaywrightMatchers.getAllElementsByXPath(xpath);
  }
}
