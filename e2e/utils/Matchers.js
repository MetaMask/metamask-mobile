import { web, system } from 'detox';

/**
 * Utility class for matching (locating) UI elements
 */
class Matchers {
  /**
   * Get element by ID.
   *
   * @param {string} elementId - Match elements with the specified testID
   * @param {number} [index] - Index of the element (default: 0)
   * @return {Promise<Detox.IndexableNativeElement | Detox.NativeElement>} - Resolves to the located element
   */
  static async getElementByID(elementId, index) {
    if (index) {
      return element(by.id(elementId)).atIndex(index);
    }
    return element(by.id(elementId));
  }

  /**
   * Get element by text.
   *
   * @param {string} text - Match elements with the specified text
   * @param {number} index - Index of the element (default: 0)
   * @return {Promise<Detox.NativeElement>} - Resolves to the located element
   */
  static async getElementByText(text, index = 0) {
    return element(by.text(text)).atIndex(index);
  }

  /**
   * Get element that match by id and label.
   * This strategy matches elements by combining 2 matchers together.
   * Elements returned match the provided ID and Label at the same time.
   * At this moment, this strategy is only used when trying to select a custom network.
   * TODO: remove the dependency of by.id and by.label. This only reduce further possible acceptable matchers.
   *
   * @param {string} id - Match elements with the specified text
   * @param {string | RegExp} label - Match elements with the specified text
   * @param {number} index - Index of the element (default: 0)
   * @return {Promise<Detox.NativeElement>} - Resolves to the located element
   */
  static async getElementByIDAndLabel(id, label, index = 0) {
    return element(by.id(id).and(by.label(label))).atIndex(index);
  }

  /**
   * Get element by label.
   *
   * @param {string} label - Match elements with the specified accessibility label (iOS) or content description (Android)
   * @param {number} index - Index of the element (default: 0)
   * @return {Promise<Detox.NativeElement>} - Resolves to the located element
   */
  static async getElementByLabel(label, index = 0) {
    return element(by.label(label)).atIndex(index);
  }

  /**
   * Get element by descendant.
   *
   * @param {string} parentElement - Matches elements with at least one descendant that matches the specified matcher.
   * @param {string} childElement - The ID of the child element to locate within the parent element.
   * @return {Promise<Detox.IndexableNativeElement>} - Resolves to the located element
   */
  static async getElementByDescendant(parentElement, childElement) {
    return element(by.id(parentElement).withDescendant(by.id(childElement)));
  }

  /**
   * Get element with ancestor.
   *
   * @param {string} childElement - The ID of the child element to locate within the parent element.
   * @param {string} parentElement - Matches elements with at least one descendant that matches the specified matcher.
   * @return {Promise<Detox.IndexableNativeElement>} - Resolves to the located element
   */
  static async getElementIDWithAncestor(childElement, parentElement) {
    return element(by.id(childElement).withAncestor(by.id(parentElement)));
  }

  /**
   * Get Native WebView instance by elementId
   *
   * Because Android Webview might have more that one WebView instance present on the main activity, the correct element
   * is select based on its parent element id.
   * @param {string} elementId The web ID of the browser webview
   * @returns {Detox.WebViewElement} WebView element
   */
  static getWebViewByID(elementId) {
    return device.getPlatform() === 'ios'
      ? web(by.id(elementId))
      : web(by.type('android.webkit.WebView').withAncestor(by.id(elementId)));
  }

  /**
   * Get element by web ID.
   *
   * @param {string} webviewID - The web ID of the inner element to locate within the webview
   * @param {string} innerID - The web ID of the browser webview
   * @return {Promise<Detox.IndexableWebElement | Detox.SecuredWebElementFacade>} Resolves to the located element
   */
  static async getElementByWebID(webviewID, innerID) {
    const myWebView = this.getWebViewByID(webviewID);
    return myWebView.element(by.web.id(innerID));
  }

  /**
   * Get element by CSS selector.
   * @param {string} webviewID - The web ID of the browser webview
   * @param {string} selector - CSS selector to locate the element
   * @return {Promise<Detox.WebElement>} - Resolves to the located element
   */

  static async getElementByCSS(webviewID, selector) {
    const myWebView = web(by.id(webviewID));
    return myWebView.element(by.web.cssSelector(selector)).atIndex(0);
  }

  /**
   * Get element by XPath.
   * @param {string} webviewID - The web ID of the browser webview
   * @param {string} xpath - XPath expression to locate the element
   * @return {Promise<Detox.IndexableWebElement | Detox.SecuredWebElementFacade>} - Resolves to the located element
   */
  static async getElementByXPath(webviewID, xpath) {
    const myWebView = this.getWebViewByID(webviewID);
    return myWebView.element(by.web.xpath(xpath));
  }
  /**
   * Get element by href.
   * @param {string} webviewID - The web ID of the browser webview
   * @param {string} url - URL string to locate the element
   * @return {Promise<Detox.WebElement>} - Resolves to the located element
   */
  static async getElementByHref(webviewID, url) {
    const myWebView = web(by.id(webviewID));
    return myWebView.element(by.web.href(url)).atIndex(0);
  }

  /**
 * Creates a Detox matcher for identifying an element by its ID.
 *
 * @param {string} selectorString - The selector string for identifying the element
 * @returns {Matcher} A Detox matcher that identifies elements by the specified ID.
 *
 * @description
 * This method does not create an element but instead generates only a matcher.
 * The purpose is to create a matcher that can be used for identification purposes,
 * without performing any actions on the element.
 *

 */
  static async getIdentifier(selectorString) {
    return by.id(selectorString);
  }


  /**
   * Get system dialogs in the system-level (e.g. permissions, alerts, etc.), by text.
   *
   * @param {string} text - Match elements with the specified text
   * @return {Promise<Detox.IndexableSystemElement>} - Resolves to the located element
   */
  static async getSystemElementByText(text) {
    return system.element(by.system.label(text));
  }
}

export default Matchers;
