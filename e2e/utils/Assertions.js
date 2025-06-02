import { waitFor, element, by } from 'detox';
import Matchers from './Matchers';

// Global timeout variable
const TIMEOUT = 15000;

/**
 * Class representing a set of assertions for Detox testing.
 */
class Assertions {
  /**
   * Check if an element with the specified ID is visible.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>} element - The element to check.
   * @param timeout
   */
  static async checkIfVisible(element, timeout = TIMEOUT) {
    return await waitFor(await element)
      .toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified web selector exists.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>} element - The element to check.
   */
  static async webViewElementExists(element) {
    // rename this. We are checking if element is visible.
    return await expect(await element).toExist();
  }


  /**
   * Check if an element with the specified ID is not visible.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement>} element - The element to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfNotVisible(element, timeout = TIMEOUT) {
    // rename this. We are checking if element is not visible.

    return await waitFor(await element)
      .not.toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID does have the specified text.
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementToHaveText(element, text, timeout = TIMEOUT) {
    // Rename me. The naming convention here is terrible.

    return await waitFor(await element)
      .toHaveText(text)
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID does have the specified label.
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check.
   * @param {string} label - The label content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementHasLabel(element, label, timeout = TIMEOUT) {
    return await waitFor(await element)
      .toHaveLabel(label)
      .withTimeout(timeout);
  }


  /**
   * Check if text is visible.
   * @param {string} text - The text to check if displayed.
   * @param {number} [index=0] - Index of the element if multiple elements match.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfTextIsDisplayed(text, timeout = TIMEOUT) {
    const element = Matchers.getElementByText(text);
    return this.checkIfVisible(element, timeout);
  }

  /**
   * Check if text is not visible.
   * @param {string} text - The text to check if not displayed.
   * @param {number} [index=0] - Index of the element if multiple elements match.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfTextIsNotDisplayed(text, timeout = TIMEOUT) {
    const element = Matchers.getElementByText(text);
    return this.checkIfNotVisible(element, timeout);
  }

  /**
   * Check if an element with the specified ID does not have the specified text.
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementNotToHaveText(element, text, timeout = TIMEOUT) {
    // Rename me. The naming convention here is terrible.

    return await waitFor(await element)
      .not.toHaveText(text)
      .withTimeout(timeout);
  }

  /**
   * Check if an element with the specified ID does not have the specified label.
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check.
   * @param {string} label - The label content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfElementDoesNotHaveLabel(
    element,
    label,
    timeout = TIMEOUT,
  ) {
    // Rename me. The naming convention here is terrible.

    return await waitFor(await element)
      .not.toHaveLabel(label)
      .withTimeout(timeout);
  }

  /**
   * Check if the toggle with the specified ID is in the "on" state.
   * @param {Promise<Detox.IndexableNativeElement>} element - The ID of the toggle element.
   */
  static async checkIfToggleIsOn(element) {
    return expect(await element).toHaveToggleValue(true);
  }

  /**
   * Check if the toggle with the specified ID is in the "off" state.
   * @param {Promise<Detox.IndexableNativeElement>} element - The toggle element.
   */
  static async checkIfToggleIsOff(element) {
    return expect(await element).toHaveToggleValue(false);
  }

  /**
   * Check if two text values match exactly.
   * @param {string} actualText - The actual text value to check.
   * @param {string} expectedText - The expected text value to match against.
   */
  static async checkIfTextMatches(actualText, expectedText) {
    try {
      if (!actualText || !expectedText) {
        throw new Error('Both actual and expected text must be provided');
      }

      return expect(actualText).toBe(expectedText);
    } catch (error) {
      if (actualText !== expectedText) {
        throw new Error(
          `Text matching failed.\nExpected: "${expectedText}"\nActual: "${actualText}"`,
        );
      }
    }
  }

  /**
   * Check if two objects match exactly.
   * Note: This assertion does not test UI elements. It is intended for testing values such as events from the mock server or other non-UI data.
   * @param {Object} actualObject - The actual object to check.
   * @param {Object} expectedObject - The expected object to match against.
   */
  static async checkIfObjectsMatch(actualObject, expectedObject) {
    try {
      if (!actualObject || !expectedObject) {
        throw new Error('Both actual and expected objects must be provided');
      }

      return expect(actualObject).toEqual(expectedObject);
    } catch (error) {
      if (JSON.stringify(actualObject) !== JSON.stringify(expectedObject)) {
        throw new Error(
          `Object matching failed.\nExpected: ${JSON.stringify(
            expectedObject,
            null,
            2,
          )}\nActual: ${JSON.stringify(actualObject, null, 2)}`,
        );
      }
    }
  }

  /**
   * Check if an array has the expected length.
   * Note: This assertion does not test UI elements. It is intended for testing values such as events from the mock server or other non-UI data.
   * @param {Array} array - The array to check.
   * @param {number} expectedLength - The expected length of the array.
   */
  static async checkIfArrayHasLength(array, expectedLength) {
    try {
      if (!Array.isArray(array)) {
        throw new Error('The provided value is not an array');
      }

      if (typeof expectedLength !== 'number') {
        throw new Error('Expected length must be a number');
      }

      return expect(array.length).toBe(expectedLength);
    } catch (error) {
      if (array.length !== expectedLength) {
        throw new Error(
          `Array length assertion failed.\nExpected length: ${expectedLength}\nActual length: ${array.length}`,
        );
      }
    }
  }

  /**
   * Check if a value is present (not null, not undefined, not an empty string).
   * Note: This assertion does not test UI elements. It is intended for testing values such as events from the mock server or other non-UI data.
   * @param {*} value - The value to check.
   */
  static async checkIfValueIsPresent(value) {
    if (value === null || value === undefined || value === '') {
      throw new Error(
        'Value is not present (null, undefined, or empty string)',
      );
    }
  }

  /**
   * Checks if the actual object contains all key/value pairs from the partial object.
   * Throws an error if the assertion fails, listing all issues found.
   * @param {Object} actual - The object to check against
   * @param {Object} partial - The partial object with expected key/value pairs
   * @param {boolean} deep - Whether to perform deep comparison for nested objects (default: true)
   */
  static checkIfObjectContains(actual, partial, deep = true) {
    const errors = [];

    function check(actualObj, partialObj, path = '') {
      if (typeof actualObj !== 'object' || typeof partialObj !== 'object' || actualObj === null || partialObj === null) {
        if (actualObj !== partialObj) {
          errors.push(`Value mismatch at "${path || 'root'}": expected ${JSON.stringify(partialObj)}, got ${JSON.stringify(actualObj)}`);
        }
        return;
      }

      for (const key in partialObj) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!Object.prototype.hasOwnProperty.call(actualObj, key)) {
          errors.push(`Missing key at "${currentPath}" in actual object`);
          continue;
        }

        if (deep && typeof partialObj[key] === 'object' && partialObj[key] !== null) {
          check(actualObj[key], partialObj[key], currentPath);
        } else if (actualObj[key] !== partialObj[key]) {
          errors.push(
            `Value mismatch at "${currentPath}": expected ${JSON.stringify(partialObj[key])}, got ${JSON.stringify(actualObj[key])}`
          );
        }
      }
    }

    check(actual, partial);

    if (errors.length > 0) {
      throw new Error('Object contains assertion failed:\n' + errors.join('\n'));
    }
  }

  /**
   * Check if element is enabled
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check
   * @return {Promise<boolean>} - Resolves to true if the element is enabled, false otherwise
   */
  static async checkIfEnabled(element) {
    return (await (await element).getAttributes()).enabled;
  }

  /**
   * Check if element is disabled
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check
   * @return {Promise<boolean>} - Resolves to true if the element is disabled, false otherwise
   */
  static async checkIfDisabled(element) {
    return (await (await element).getAttributes()).enabled;
  }

  /**
   * Check if label contains text
   * @param {string} text - The text to check if the label contains
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   */
  static async checkIfLabelContainsText(text, timeout = TIMEOUT) {
    const labelMatcher = element(by.label(new RegExp(text)));
    return await waitFor(labelMatcher)
      .toExist()
      .withTimeout(timeout);
  }
}

export default Assertions;
