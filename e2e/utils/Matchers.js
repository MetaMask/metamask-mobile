import { web } from 'detox';

/**
 * Utility class for matching (locating) UI elements
 */
class Matchers {
  /**
   * Get element by ID.
   *
   * @param {string} elementId - Match elements with the specified testID
   * @return {Promise<Detox.IndexableNativeElement>} - Resolves to the located element
   */
  static async getElementByID(elementId) {
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
   * Get element by label.
   *
   * @param {string} label - Match elements with the specified accessibility label (iOS) or content description (Android)
   * @return {Promise<Detox.IndexableNativeElement>} - Resolves to the located element
   */
  static async getElementByLabel(label) {
    return element(by.label(label));
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
   * Get element by web ID.
   *
   * @param {string} webID - The web ID of the element to locate
   * @return {Promise<Detox.IndexableWebElement>} Resolves to the located element
   */
  static async getElementByWebID(webID) {
    return web.element(by.web.id(webID));
  }

  /**
   * Get element by CSS selector.
   *
   * @param {string} selector - CSS selector to locate the element
   * @return {Promise<Detox.IndexableWebElement>} - Resolves to the located element
   */
  static async getElementByCSSSelector(selector) {
    return web.element(by.web.cssSelector(selector));
  }

  /**
   * Get element by XPath.
   *
   * @param {string} xpath - XPath expression to locate the element
   * @return {Promise<Detox.IndexableWebElement>} - Resolves to the located element
   */
  static async getElementByXPath(xpath) {
    return web.element(by.web.xpath(xpath));
  }
}

export default Matchers;
