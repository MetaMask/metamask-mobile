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

}
