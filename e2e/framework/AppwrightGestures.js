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
   * Terminate the MetaMask app
   * @param {Object} device - The device object
   */
  static async terminateApp(device) {
    let retries = 3;
    const packageId = AppwrightSelectors.isIOS(device)
      ? 'io.metamask.MetaMask'
      : 'io.metamask';
    while (retries > 0) {
      try {
        await device.terminateApp(packageId);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        retries--;
      } catch (error) {
        console.log('Error terminating app', packageId);
        console.log('Error terminating app, retrying...', error);
        retries--;

        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            await device.terminateApp(packageId);
          } catch (retryError) {
            console.log('Retry also failed:', retryError.message);
          }
        }
      }
    }
    // Timeout to ensure the app is terminated
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Activate the MetaMask app
   * @param {Object} device - The device object
   */
  static async activateApp(device) {
    const packageId = AppwrightSelectors.isIOS(device)
      ? 'io.metamask.MetaMask'
      : 'io.metamask';
    let retries = 3;

    while (retries > 0) {
      try {
        const result = await device.activateApp(packageId);
        console.log(`Successfully activated app: ${packageId}`);
        // Wait a moment for the app to initialize completely
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return result;
      } catch (error) {
        console.log(
          `Error activating app ${packageId}, attempt ${4 - retries}`,
        );
        console.log('Error details:', error.message);
        retries--;

        if (retries > 0) {
          console.log(`Retrying activation... ${retries} attempts left`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.log('All activation attempts failed');
          throw error; // Re-throw the last error
        }
      }
    }
  }

  /**
   * Hide keyboard (Android only)
   * @param {Object} device - The device object
   */
  static async hideKeyboard(device) {
    if (AppwrightSelectors.isAndroid(device))
      await device.webDriverClient.hideKeyboard(); // only needed for Android
  }

  /**
   * Background the app for specified time
   * @param {Object} device - The device object
   * @param {number} time - Time in seconds to background the app
   */
  static async backgroundApp(device, time) {
    const driver = device.webDriverClient;
    await driver.background(time);
  }

  /**
   * Dismiss alert with platform-specific timeout
   * @param {Object} device - The device object
   */
  static async dismissAlert(device) {
    // Simple wrapper that uses appropriate timeout for platform
    const isIOS = AppwrightSelectors.isIOS(device);
    const timeout = isIOS ? 8000 : 2000; // 8 seconds for iOS, 2 for Android
    await device.waitForTimeout(timeout);
    return await device.webDriverClient.dismissAlert();
  }
}
