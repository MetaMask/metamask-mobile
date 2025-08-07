import { web, system } from 'detox';

/**
 * Utility class for matching (locating) UI elements
 */
export default class Matchers {
  /**
   * Get element by ID with optional index
   */
  static async getElementByID(
    elementId: string | RegExp,
    index?: number,
  ): Promise<Detox.IndexableNativeElement> {
    const el = element(by.id(elementId));
    if (index !== undefined) {
      return el.atIndex(index) as Detox.IndexableNativeElement;
    }
    return el as Detox.IndexableNativeElement;
  }

  /**
   * Get element by text with optional index
   */
  static async getElementByText(
    text: string | RegExp,
    index = 0,
  ): Promise<Detox.IndexableNativeElement> {
    return element(by.text(text)).atIndex(
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
  static async getElementByLabel(
    label: string,
    index = 0,
  ): Promise<Detox.IndexableNativeElement> {
    return element(by.label(label)).atIndex(
      index,
    ) as Detox.IndexableNativeElement;
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
    return by.id(selectorString);
  }

  /**
   * Get system dialogs in the system-level (e.g. permissions, alerts, etc.), by text
   */
  static async getSystemElementByText(
    text: string,
  ): Promise<Detox.IndexableSystemElement> {
    return system.element(by.system.label(text));
  }
}
