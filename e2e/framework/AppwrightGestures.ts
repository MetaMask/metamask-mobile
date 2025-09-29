import AppwrightSelectors from '../../wdio/helpers/AppwrightSelectors.js';
import { APP_PACKAGE_IDS } from './Constants';
/* This file is not in used at the moment because files in the wdio folder are expecting to be in js and not ts
so we are keeping it here for reference but not using it in the project.
Once we have migrated the page objects to ts, we will remove the js version of this file.
*/

interface Device {
  webDriverClient: {
    executeScript: (script: string, args: unknown[]) => Promise<void>;
    hideKeyboard: () => Promise<void>;
    background: (time: number) => Promise<void>;
    dismissAlert: () => Promise<void>;
  };
  terminateApp: (packageId: string) => Promise<void>;
  activateApp: (packageId: string) => Promise<unknown>;
  waitForTimeout: (timeout: number) => Promise<void>;
}

interface Element {
  tap(): Promise<void>;
  fill(text: string): Promise<void>;
  isVisible(options?: { timeout?: number }): Promise<boolean>;
}

/**
 * Base class for Appwright gestures
 * Provides common gesture methods that can be extended by screen objects
 */
export default class AppwrightGestures {
  private _device: Device | null;

  constructor(deviceInstance: Device | null = null) {
    this._device = deviceInstance;
  }

  get device(): Device | null {
    return this._device;
  }

  set device(deviceInstance: Device | null) {
    this._device = deviceInstance;
  }

  /**
   * Tap method with retry logic
   * @param elementPromise - The element promise to tap
   * @param options - Configuration options for retry behavior
   * @param maxRetries - Maximum number of tap attempts
   * @param retryDelay - Delay between tap attempts
   */
  async tap(
    elementPromise: Promise<Element>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
    } = {},
  ): Promise<void> {
    const { maxRetries = 1, retryDelay = 1000 } = options;
    let lastError: Error | undefined;
    const elementToTap = await elementPromise;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await elementToTap.tap();
        return; // Success, exit early
      } catch (error: unknown) {
        lastError = error as Error;

        // Check if it's a "not found" error and we have retries left
        // This is needed because of the system dialogs that pop up specifically on iOS
        if (lastError.message.includes('not found') && attempt < maxRetries) {
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
   * @param elementPromise - The element promise to type into
   * @param text - The text to type
   * @param options - Configuration options for retry behavior
   * @param maxRetries - Maximum number of type attempts
   * @param retryDelay - Delay between type attempts
   */
  async typeText(
    elementPromise: Promise<Element>,
    text: string,
    options: {
      maxRetries?: number;
      retryDelay?: number;
    } = {},
  ): Promise<void> {
    const { maxRetries = 1, retryDelay = 1000 } = options;
    let lastError: Error | undefined;
    const elementToType = await elementPromise;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await elementToType.fill(text);
        return; // Success, exit early
      } catch (error: unknown) {
        lastError = error as Error;

        // Check if it's a "not found" error and we have retries left
        if (lastError.message.includes('not found') && attempt < maxRetries) {
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
   * @param ms - Time to wait in milliseconds
   */
  async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Scroll element into view with platform-specific scrolling
   * @param elementPromise - The element promise to scroll into view
   * @param options - Configuration options for scrolling behavior
   * @param maxScrollAttempts - Maximum number of scroll attempts
   * @param scrollTimeout - Timeout for scroll attempts
   * @param scrollParams - Parameters for scrolling behavior
   */
  async scrollIntoView(
    elementPromise: Promise<Element>,
    options: {
      maxScrollAttempts?: number;
      scrollTimeout?: number;
      scrollParams?: {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        direction?: 'up' | 'down';
        percent?: number;
      };
    } = {},
  ): Promise<Element> {
    const {
      maxScrollAttempts = 20,
      scrollTimeout = 2000,
      scrollParams = {},
    } = options;

    const {
      left = 100,
      top = 500,
      width = 200,
      height = 1000,
      direction = 'up',
      percent = 0.75,
    } = scrollParams;

    for (let i = 0; i < maxScrollAttempts; i++) {
      try {
        const elementInstance = await elementPromise;
        const isVisible = await elementInstance.isVisible({
          timeout: scrollTimeout,
        });

        if (isVisible) {
          return elementInstance;
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
            left,
            top,
            width,
            height,
            direction,
            percent,
          },
        ]);
      } else {
        // For iOS, use mobile: scroll command
        await webDriverClient.executeScript('mobile: scroll', [
          {
            direction,
            percent,
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
   * @param deviceInstance - The device object
   * @param options - Configuration options for termination behavior
   */
  static async terminateApp(
    deviceInstance: Device,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      finalTimeout?: number;
    } = {},
  ): Promise<void> {
    const { maxRetries = 3, retryDelay = 1000, finalTimeout = 2000 } = options;
    let retries = maxRetries;
    const packageId = AppwrightSelectors.isIOS(deviceInstance)
      ? APP_PACKAGE_IDS.IOS
      : APP_PACKAGE_IDS.ANDROID;

    while (retries > 0) {
      try {
        await deviceInstance.terminateApp(packageId);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retries--;
      } catch (error) {
        console.log('Error terminating app', packageId);
        retries--;
      }
    }

    // Timeout to ensure the app is terminated
    await new Promise((resolve) => setTimeout(resolve, finalTimeout));
  }

  /**
   * Activate the MetaMask app
   * @param deviceInstance - The device object
   * @param options - Configuration options for activation behavior
   * @param maxRetries - Maximum number of activation attempts
   * @param initDelay - Delay after activation to wait for app to initialize
   */
  static async activateApp(
    deviceInstance: Device,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      initDelay?: number;
    } = {},
  ): Promise<unknown> {
    const { maxRetries = 3, initDelay = 1000 } = options;
    const packageId = AppwrightSelectors.isIOS(deviceInstance)
      ? APP_PACKAGE_IDS.IOS
      : APP_PACKAGE_IDS.ANDROID;
    let retries = maxRetries;

    let lastError: Error | undefined;

    while (retries > 0) {
      try {
        const result = await deviceInstance.activateApp(packageId);
        console.log(`Successfully activated app: ${packageId}`);
        // Wait a moment for the app to initialize completely
        await new Promise((resolve) => setTimeout(resolve, initDelay));
        return result;
      } catch (error) {
        lastError = error as Error;
        console.log(
          `Error activating app ${packageId}, attempt ${4 - retries}`,
        );
        retries--;
      }
    }

    console.log('All activation attempts failed');
    throw lastError;
  }

  /**
   * Hide keyboard (Android only)
   * @param deviceInstance - The device object
   */
  static async hideKeyboard(deviceInstance: Device): Promise<void> {
    if (AppwrightSelectors.isAndroid(deviceInstance))
      await deviceInstance.webDriverClient.hideKeyboard(); // only needed for Android
  }

  /**
   * Background the app for specified time
   * @param deviceInstance - The device object
   * @param time - Time in seconds to background the app
   */
  static async backgroundApp(
    deviceInstance: Device,
    time: number,
  ): Promise<void> {
    const webDriverClient = deviceInstance.webDriverClient;
    await webDriverClient.background(time);
  }

  /**
   * Dismiss alert with platform-specific timeout
   * @param deviceInstance - The device object
   */
  static async dismissAlert(deviceInstance: Device): Promise<void> {
    // Simple wrapper that uses appropriate timeout for platform
    const isIOS = AppwrightSelectors.isIOS(deviceInstance);
    const timeout = isIOS ? 8000 : 2000; // 8 seconds for iOS, 2 for Android
    await deviceInstance.waitForTimeout(timeout);
    return await deviceInstance.webDriverClient.dismissAlert();
  }
}
