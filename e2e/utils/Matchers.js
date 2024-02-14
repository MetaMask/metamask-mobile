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
}

export default Matchers;
