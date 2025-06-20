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


    /**
     * Waits for an element to become stable (not moving) by checking its position multiple times.
     *
     * @param {Promise<Detox.IndexableNativeElement>} element - The element to check for stability
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.timeout=5000] - Maximum time to wait for stability (ms)
     * @param {number} [options.interval=200] - Time between position checks (ms)
     * @param {number} [options.stableCount=3] - Number of consecutive stable checks required
     */
    static async waitForElementToStopMoving(element, options = {}) {
      const { timeout = 5000, interval = 200, stableCount = 3 } = options;
      let lastPosition = null;
      let stableChecks = 0;
      const fallBackTimeout = 2000;
      const start = Date.now();
  
      const getPosition = async (element) => {
        try {
          const attributes = await element.getAttributes();
          if (
            attributes.frame &&
            typeof attributes.frame.x === 'number' &&
            typeof attributes.frame.y === 'number'
          ) {
            return { x: attributes.frame.x, y: attributes.frame.y };
          }
            return null;
  
        } catch {
          return null;
        }
      };
  
      while (Date.now() - start < timeout) {
        const el = await element;
  
        const position = await getPosition(el);
  
        if (!position) {
          await new Promise((resolve) => setTimeout(resolve, fallBackTimeout));
          return; // Return early if position is not available
        }
  
        if (
          lastPosition &&
          position.x === lastPosition.x &&
          position.y === lastPosition.y
        ) {
          stableChecks += 1;
          if (stableChecks >= stableCount) return;
        } else {
          lastPosition = position;
          stableChecks = 1;
        }
  
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
  
      throw new Error('Element did not become stable in time');
    }

}
