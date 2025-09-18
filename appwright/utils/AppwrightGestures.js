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
   * @param {Object} element - The element to tap
   * @param {number} maxRetries - Maximum number of retry attempts (default: 1)
   * @param {number} retryDelay - Delay between retries in ms (default: 1000)
   */
  async tap(element, maxRetries = 1, retryDelay = 1000) {
    let lastError;
    const elementToTap = await element;

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
    throw lastError;
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
   * @param {Object} element - The element to scroll into view
   */
  async scrollIntoView(element) {
    for (let i = 0; i < 20; i++) {
      try {
        const isVisible = await element.isVisible({ timeout: 2000 });

        if (isVisible) {
          return element;
        }
      } catch (error) {
        // Element not found or not visible, continue scrolling
      }
      const driver = this.device.webDriverClient;
      // Perform a scroll action
      if (AppwrightSelectors.isAndroid(this.device)) {
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
