import AppwrightSelectors from '../../wdio/helpers/AppwrightSelectors.js';

/**
 * Base class for Appwright gestures
 * Provides common gesture methods that can be extended by screen objects
 */
export default class AppwrightGestures {
  constructor(device = null) {
    this._device = device;
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  /**
   * Tap method with retry logic
   * @param {Promise} elementPromise - The element promise to tap
   * @param {number} maxRetries - Maximum number of retry attempts (default: 1)
   * @param {number} retryDelay - Delay between retries in ms (default: 1000)
   */
  async tap(elementPromise, maxRetries = 1, retryDelay = 1000) {
    let lastError;
    const elementToTap = await elementPromise;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await elementToTap.tap();
        return; // Success, exit early
      } catch (error) {
        lastError = error;

        // Check if it's a "not found" error and we have retries left
        // This is needed because of the system dialogs that pop up specifically on iOS
        if (error.message.includes('not found') && attempt < maxRetries) {
          console.log(
            `Element not found on attempt ${
              attempt + 1
            }, retrying in ${retryDelay}ms...`,
          );
          await this.wait(retryDelay);
          continue;
        }
        throw error;
      }
    }
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Type text into an element with retry logic
   * @param {Promise} elementPromise - The element promise to type into
   * @param {string} text - The text to type
   * @param {number} maxRetries - Maximum number of retry attempts (default: 1)
   * @param {number} retryDelay - Delay between retries in ms (default: 1000)
   */
  async typeText(elementPromise, text, maxRetries = 1, retryDelay = 1000) {
    let lastError;
    const elementToType = await elementPromise;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await elementToType.fill(text);
        return; // Success, exit early
      } catch (error) {
        lastError = error;

        // Check if it's a "not found" error and we have retries left
        if (error.message.includes('not found') && attempt < maxRetries) {
          console.log(
            `Element not found on type attempt ${
              attempt + 1
            }, retrying in ${retryDelay}ms...`,
          );
          await this.wait(retryDelay);
          continue;
        }
        throw error;
      }
    }
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Utility method to wait for a specified amount of time
   * @param {number} ms - Time to wait in milliseconds
   */
  async wait(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Scroll element into view with platform-specific scrolling
   * @param {Promise} elementPromise - The element promise to scroll into view
   */
  async scrollIntoView(elementPromise) {
    for (let i = 0; i < 20; i++) {
      try {
        const element = await elementPromise;
        const isVisible = await element.isVisible({ timeout: 2000 });

        if (isVisible) {
          return element;
        }
      } catch (error) {
        // Element not found or not visible, continue scrolling
      }
      const webDriverClient = this.device?.webDriverClient;
      if (!webDriverClient) {
        throw new Error('Device webDriverClient not available');
      }

      // Perform a scroll action
      if (AppwrightSelectors.isAndroid(this.device)) {
        // For Android, use a swipe gesture
        //await webDriverClient.tap({ x: 500, y: 1500 });
        await webDriverClient.executeScript('mobile: swipeGesture', [
          {
            left: 100,
            top: 500,
            width: 200,
            height: 1000,
            direction: 'up',
            percent: 0.75,
          },
        ]);
      } else {
        // For iOS, use mobile: scroll command
        await webDriverClient.executeScript('mobile: scroll', [
          {
            direction: 'down',
            percent: 0.75,
          },
        ]);
      }

      // Wait a bit for the scroll to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Element not found after 5 scroll attempts`);
  }

  /**
   * Static method to scroll element into view (compatible with AppwrightSelectors.scrollIntoView)
   * @param {Object} device - The device object
   * @param {Promise} element - The element promise to scroll into view
   */
  static async scrollIntoView(device, element) {
    for (let i = 0; i < 20; i++) {
      try {
        const isVisible = await element.isVisible({ timeout: 2000 });

        if (isVisible) {
          return element;
        }
      } catch (error) {
        // Element not found or not visible, continue scrolling
      }
      const driver = device.webDriverClient;
      // Perform a scroll action
      if (AppwrightSelectors.isAndroid(device)) {
        // For Android, use a swipe gesture
        //await driver.tap({ x: 500, y: 1500 });
        await driver.executeScript('mobile: swipeGesture', [
          {
            left: 100,
            top: 500,
            width: 200,
            height: 1000,
            direction: 'up',
            percent: 0.75,
          },
        ]);
      } else {
        // For iOS, use mobile: scroll command
        await driver.executeScript('mobile: scroll', [
          {
            direction: 'down',
            percent: 0.75,
          },
        ]);
      }

      // Wait a bit for the scroll to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Element not found after 5 scroll attempts`);
  }
}
