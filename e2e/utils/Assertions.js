import { waitFor } from 'detox';
import Matchers from './Matchers';

// Global timeout variable
const TIMEOUT = 15000;

/**
 * Class representing a set of assertions for Detox testing.
 */
class Assertions {
  /**
   * Check if an element with the specified ID is visible.
   * @param {Promise<Detox.IndexableNativeElement>} elementId - The ID of the element to check.
   * @param timeout
   */
  static async checkIfVisible(elementId, timeout = TIMEOUT) {
    // rename this. We are checking if element is visible.

    return await waitFor(await elementId)
      .toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID is not visible.
   * @param {Promise<Detox.IndexableNativeElement>} elementId - The ID of the element to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfNotVisible(elementId, timeout = TIMEOUT) {
    // rename this. We are checking if element is not visible.

    return await waitFor(await elementId)
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID does not have the specified text.
   * @param {Promise<Detox.IndexableNativeElement>} elementId - The ID of the element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementToHaveText(elementId, text, timeout = TIMEOUT) {
    // Rename me. The naming convention here is terrible.

    return await waitFor(await elementId)
      .toHaveText(text)
      .withTimeout(timeout);
  }

  /**
   * Check if text is visible.
   * @param {string} text - The text to check if displayed.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfTextIsDisplayed(text, timeout = TIMEOUT) {
    const element = Matchers.getElementByText(text);
    return this.checkIfVisible(element, timeout);
  }

  /**
   * Check if text is not visible.
   * @param {string} text - The text to check if not displayed.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfTextIsNotDisplayed(text, timeout = TIMEOUT) {
    const element = Matchers.getElementByText(text);
    return this.checkIfNotVisible(element, timeout);
  }

  /**
   * Check if an element with the specified ID does not have the specified text.
   * @param {Promise<Detox.IndexableNativeElement>} elementId - The ID of the element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementNotToHaveText(elementId, text, timeout = TIMEOUT) {
    // Rename me. The naming convention here is terrible.

    return await waitFor(await elementId)
      .not.toHaveText(text)
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID has the specified text.
   * @param {Promise<Detox.IndexableNativeElement>} elementId - The ID of the element to check.
   * @param {string} text - The expected text content.
   * @param {number} timeout - Timeout in milliseconds.
   */
  static async checkIfHasText(elementId, text, timeout = TIMEOUT) {
    // rename this. checkIfELEMENTHasText makes it clear

    return waitFor(await elementId)
      .toHaveText(text)
      .withTimeout(timeout);
  }

  /**
   * Check if the toggle with the specified ID is in the "on" state.
   * @param {Promise<Detox.IndexableNativeElement>} elementID - The ID of the toggle element.
   */
  static async checkIfToggleIsOn(elementID) {
    return expect(await elementID).toHaveToggleValue(true);
  }

  /**
   * Check if the toggle with the specified ID is in the "off" state.
   * @param {Promise<Detox.IndexableNativeElement>} elementID - The ID of the toggle element.
   */
  static async checkIfToggleIsOff(elementID) {
    return expect(await elementID).toHaveToggleValue(false);
  }
}

export default Assertions;
