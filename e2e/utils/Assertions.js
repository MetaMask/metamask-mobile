import { waitFor, element, by } from 'detox';

// Global timeout variable
const TIMEOUT = 15000;

/**
 * Class representing a set of assertions for Detox testing.
 */
class Assertions {
  /**
   * Check if an element with the specified ID is visible.
   * @param {string} elementId - The ID of the element to check.
   * @param {number} Timeout in milliseconds.
   */
  static async checkIfVisible(elementId, timeout = TIMEOUT) {
    // rename this. We are checking if element is visible.

    return await waitFor(elementId).toBeVisible().withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID is not visible.
   * @param {string} elementId - The ID of the element to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfNotVisible(elementId, timeout = TIMEOUT) {
    // rename this. We are checking if element is not visible.

    return await waitFor(elementId).not.toBeVisible().withTimeout(timeout);
  }

  /**
   * Check if an element with the specified text is not visible.
   * @param {string} text - The text content to check.
   */
  static async checkIfElementWithTextIsNotVisible(text, index) {
    // rename this. We are checking if text is not visible. Not an element with text.
    const element = await text.atIndex(index || 0);

    return await expect(element).not.toBeVisible();
  }

  /**
   * Check if an element with the specified ID does not have the specified text.
   * @param {string} elementId - The ID of the element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementNotToHaveText(elementId, text, timeout = TIMEOUT) {
    // Rename me. The naming convention here is terrible.

    return await waitFor(elementId).not.toHaveText(text).withTimeout(timeout);
  }

  static async checkIfExists(elementId, timeout = TIMEOUT) {
    /* This assertion seems a bit redudant. Please replace me with checkIfVisible
     and delete all instances of me throughout the test code.
    We already have an assertion to check if an element is visible.
    No need to check if it exists.
    */

    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(timeout);
    return expect(element(by.id(elementId))).toExist();
  }

  /**
   * Check if an element with the specified ID has the specified text.
   * @param {string} elementId - The ID of the element to check.
   * @param {string} text - The expected text content.
   * @param {number} timeout - Timeout in milliseconds.
   */
  static async checkIfHasText(elementId, text, timeout = TIMEOUT) {
    // rename this. checkIfELEMENTHasText makes it clear

    return waitFor(elementId).toHaveText(text).withTimeout(timeout);
  }

  /**
   * Check if an element with the specified text at a given index is visible.
   * @param {string} text - The text content to check.
   * @param {number} [index=0] - The index of the element.
   * @param {number} timeout - Timeout in milliseconds.
   */
  static async checkIfElementWithTextIsVisible(text, index, timeout = TIMEOUT) {
    // rename this. We are checking if text is visible. Not an element with text.
    const element = await text.atIndex(index || 0);

    return await waitFor(element).toBeVisible().withTimeout(timeout);
  }

  /**
   * Check if an element with the specified text is visible.
   * @param {string} text - The text content to check.
   * @param {number} timeout - Timeout in milliseconds.
   */
  static async checkIfElementByTextIsVisible(text, timeout = TIMEOUT) {
    // rename. CheckIfTextIsVisible reads better
    const element = await text;

    return await waitFor(element).toBeVisible().withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID has the specified string.
   * @param {string} elementID - The ID of the element to check.
   * @param {string} text - The expected string.
   */
  static async checkIfElementHasString(elementID, text) {
    return expect(elementID).toString(text);
  }

  /**
   * Check if the toggle with the specified ID is in the "on" state.
   * @param {string} elementID - The ID of the toggle element.
   */
  static async checkIfToggleIsOn(elementID) {
    return expect(elementID).toHaveToggleValue(true);
  }

  /**
   * Check if the toggle with the specified ID is in the "off" state.
   * @param {string} elementID - The ID of the toggle element.
   */
  static async checkIfToggleIsOff(elementID) {
    return expect(elementID).toHaveToggleValue(false);
  }
}

export default Assertions;
