import { blacklistURLs } from '../resources/blacklistURLs.json';
import { waitFor } from 'detox';

export default class Utilities {
  /**
   * Formats an array of strings into a regex pattern string for exact matching.
   * This method takes an array of strings and returns a string formatted
   * for use in a regex pattern, designed to match any one of the provided strings exactly.
   * The resulting string is suitable for inclusion in a larger regex pattern.
   *
   * @param {string[]} regexstrings - An array of strings to be formatted for exact matching in a regex pattern.
   * @returns {string} A string formatted for exact matching within a regex pattern,
   *                    encapsulating the input strings in a way that they can be matched as literals.
   * @example
   * // returns '\\("apple","banana","cherry"\\)'
   * formatForExactMatchGroup(['apple', 'banana', 'cherry']);
   */
  static formatForExactMatchGroup(regexstrings) {
    return `\\("${regexstrings.join('","')}"\\)`;
  }

  /**
   * A getter method that returns a formatted string of blacklisted URLs for exact matching in a regex pattern.
   * This method leverages `formatForExactMatchGroup` to format the `blacklistURLs` array into a regex pattern string,
   * suitable for matching any one of the blacklisted URLs exactly. The `blacklistURLs` should be defined
   * within the class or accessible in the class context.
   *
   * @returns {string} A regex pattern string formatted for exact matching of blacklisted URLs.
   * @example
   */
  static get BlacklistURLs() {
    return this.formatForExactMatchGroup(blacklistURLs);
  }

  /**
   * Waits for an element to be enabled.
   *
   * @param {Element} element - The element to wait for.
   * @param {number} timeout - The timeout in milliseconds.
   * @param {number} interval - The interval in milliseconds.
   */
  static async waitForElementToBeEnabled(element, timeout = 3500, interval = 100) {
    const startTime = Date.now();
    let isEnabled = false;
    while (Date.now() - startTime < timeout) {
      isEnabled = await (await element).getAttributes();
      if (isEnabled) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    if (!isEnabled) {
      throw new Error('Element is not enabled');
    }
  }

  /**
   * Waits for an element to be visible.
   *
   * @param {Element} element - The element to wait for.
   * @param {number} timeout - The timeout in milliseconds.
   * @param {number} interval - The interval in milliseconds.
   */
  static async waitForElementToBeVisible(element, timeout = 3500, interval = 100) {
    const startTime = Date.now();
    let isVisible = false;
    while (Date.now() - startTime < timeout) {
      try {
        expect(await element).toBeVisible();
        // if the element is visible, expect returns true, then we set isVisible to true
        isVisible = true;
      } catch (e) {
        // if the element is not visible, expect throws an error, then we set isVisible to false
        isVisible = false;
      }
      // if the element is visible, we break the loop
      if (isVisible) {
        break;
      }
      // wait for the next interval
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    // if the element is not visible, throw an error after the timeout
    if (!isVisible) {
      throw new Error('Element is not visible');
    }
  }
}
