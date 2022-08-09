/**
 * main page object containing all methods, selectors and functionality
 * that is shared across all page objects
 */

export default class Gestures {
  /**
   * Opens a sub page of the page
   * @param path path of the sub page (e.g. /path/to/page.html)
   */

  static async waitAndTap() {}

  static tap(elementId) {
    // simple touch action on element
    return driver.$(`~${elementId}`).touchAction('tap');
  }

  static async typeText(elementId, text) {
    await TestHelpers.tap(elementId);
    return element(by.id(elementId)).typeText(text);
  }
}
