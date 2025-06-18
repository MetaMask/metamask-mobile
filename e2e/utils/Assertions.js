import { waitFor, element, by, expect } from 'detox';
import Matchers from './Matchers';

// Global timeout variable
const TIMEOUT = 15000;
const DEFAULT_RETRY_COUNT = 3;
const BASE_RETRY_DELAY = 1000;

/**
 * Class representing a set of assertions for Detox testing.
 */
class Assertions {
  /**
   * Internal retry mechanism with exponential backoff
   * @param {Function} assertionFn - The assertion function to retry
   * @param {Array} args - Arguments to pass to the assertion function
   * @param {number} retries - Number of retry attempts
   * @param {string} operationName - Name of the operation for logging
   */
  static async _retryAssertion(assertionFn, args, retries = DEFAULT_RETRY_COUNT, operationName = 'assertion') {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // eslint-disable-next-line no-console
        console.log(`[${operationName}] Attempt ${attempt + 1}/${retries + 1}`);
        return await assertionFn.apply(this, args);
      } catch (error) {
        lastError = error;

        if (attempt === retries) {
          console.error(`[${operationName}] Failed after ${retries + 1} attempts. Final error:`, lastError.message);
          throw lastError;
        }

        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`[${operationName}] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if an element with the specified ID is visible.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>} targetElement - The element to check.
   * @param {number} timeout - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfVisible(targetElement, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el, to) => await waitFor(await el).toBeVisible().withTimeout(to);

    return await this._retryAssertion(assertionFn, [targetElement, timeout], retries, 'checkIfVisible');
  }

  /**
   * Check if an element with the specified web selector exists.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>} targetElement - The element to check.
   */
  static async webViewElementExists(targetElement) {
    // rename this. We are checking if element is visible.
    return await expect(await targetElement).toExist();
  }

  /**
   * Check if an element with the specified ID is not visible.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>} targetElement - The element to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfNotVisible(targetElement, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el, to) => await waitFor(await el).not.toBeVisible().withTimeout(to);

    return await this._retryAssertion(assertionFn, [targetElement, timeout], retries, 'checkIfNotVisible');
  }

  /**
   * Check if an element with the specified ID does have the specified text.
   * @param {Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>} targetElement - The element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfElementToHaveText(targetElement, text, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    // Rename me. The naming convention here is terrible.
    const assertionFn = async (el, txt, to) => await waitFor(await el).toHaveText(txt).withTimeout(to);

    return await this._retryAssertion(assertionFn, [targetElement, text, timeout], retries, 'checkIfElementToHaveText');
  }

  /**
   * Check if an element with the specified ID does have the specified label.
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The element to check.
   * @param {string} label - The label content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfElementHasLabel(targetElement, label, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el, lbl, to) => await waitFor(await el).toHaveLabel(lbl).withTimeout(to);

    return await this._retryAssertion(assertionFn, [targetElement, label, timeout], retries, 'checkIfElementHasLabel');
  }

  /**
   * Check if text is visible.
   * @param {string} text - The text to check if displayed.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfTextIsDisplayed(text, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (txt, to) => {
      const targetElement = Matchers.getElementByText(txt);
      return await this.checkIfVisible(targetElement, to, 0); // No nested retries
    };

    return await this._retryAssertion(assertionFn, [text, timeout], retries, 'checkIfTextIsDisplayed');
  }

  /**
   * Check if text is not visible.
   * @param {string} text - The text to check if not displayed.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfTextIsNotDisplayed(text, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (txt, to) => {
      const targetElement = Matchers.getElementByText(txt);
      return await this.checkIfNotVisible(targetElement, to, 0); // No nested retries
    };

    return await this._retryAssertion(assertionFn, [text, timeout], retries, 'checkIfTextIsNotDisplayed');
  }

  /**
   * Check if an element with the specified ID does not have the specified text.
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The element to check.
   * @param {string} text - The text content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfElementNotToHaveText(targetElement, text, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    // Rename me. The naming convention here is terrible.
    const assertionFn = async (el, txt, to) => await waitFor(await el).not.toHaveText(txt).withTimeout(to);

    return await this._retryAssertion(assertionFn, [targetElement, text, timeout], retries, 'checkIfElementNotToHaveText');
  }

  /**
   * Check if an element with the specified ID does not have the specified label.
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The element to check.
   * @param {string} label - The label content to check.
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfElementDoesNotHaveLabel(targetElement, label, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    // Rename me. The naming convention here is terrible.
    const assertionFn = async (el, lbl, to) => await waitFor(await el).not.toHaveLabel(lbl).withTimeout(to);

    return await this._retryAssertion(assertionFn, [targetElement, label, timeout], retries, 'checkIfElementDoesNotHaveLabel');
  }

  /**
   * Check if the toggle with the specified ID is in the "on" state.
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The toggle element.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfToggleIsOn(targetElement, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el) => expect(await el).toHaveToggleValue(true);

    return await this._retryAssertion(assertionFn, [targetElement], retries, 'checkIfToggleIsOn');
  }

  /**
   * Check if the toggle with the specified ID is in the "off" state.
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The toggle element.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfToggleIsOff(targetElement, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el) => expect(await el).toHaveToggleValue(false);

    return await this._retryAssertion(assertionFn, [targetElement], retries, 'checkIfToggleIsOff');
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
  static async checkIfObjectContains(actual, partial, deep = true) {
    return new Promise((resolve, reject) => {
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
        reject(new Error('Object contains assertion failed:\n' + errors.join('\n')));
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if element is enabled
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The element to check
   * @param {number} retries - Number of retry attempts.
   * @return {Promise<boolean>} - Resolves to true if the element is enabled, false otherwise
   */
  static async checkIfEnabled(targetElement, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el) => (await (await el).getAttributes()).enabled;

    return await this._retryAssertion(assertionFn, [targetElement], retries, 'checkIfEnabled');
  }

  /**
   * Check if element is disabled
   * @param {Promise<Detox.IndexableNativeElement>} targetElement - The element to check
   * @param {number} retries - Number of retry attempts.
   * @return {Promise<boolean>} - Resolves to true if the element is disabled, false otherwise
   */
  static async checkIfDisabled(targetElement, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (el) => !(await (await el).getAttributes()).enabled;

    return await this._retryAssertion(assertionFn, [targetElement], retries, 'checkIfDisabled');
  }

  /**
   * Check if label contains text
   * @param {string} text - The text to check if the label contains
   * @param {number} [timeout=TIMEOUT] - Timeout in milliseconds.
   * @param {number} retries - Number of retry attempts.
   */
  static async checkIfLabelContainsText(text, timeout = TIMEOUT, retries = DEFAULT_RETRY_COUNT) {
    const assertionFn = async (txt, to) => {
      const labelMatcher = element(by.label(new RegExp(txt)));
      return await waitFor(labelMatcher).toExist().withTimeout(to);
    };

    return await this._retryAssertion(assertionFn, [text, timeout], retries, 'checkIfLabelContainsText');
  }
}

export default Assertions;
