import AppwrightSelectors from '../../wdio/helpers/AppwrightSelectors.js';
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
   * @param maxRetries - Maximum number of retry attempts (default: 1)
   * @param retryDelay - Delay between retries in ms (default: 1000)
   */
  async tap(
    elementPromise: Promise<Element>,
    maxRetries: number = 1,
    retryDelay: number = 1000,
  ): Promise<void> {
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
   * @param maxRetries - Maximum number of retry attempts (default: 1)
   * @param retryDelay - Delay between retries in ms (default: 1000)
   */
  async typeText(
    elementPromise: Promise<Element>,
    text: string,
    maxRetries: number = 1,
    retryDelay: number = 1000,
  ): Promise<void> {
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
   */
  async scrollIntoView(elementPromise: Promise<Element>): Promise<Element> {
    for (let i = 0; i < 20; i++) {
      try {
        const elementInstance = await elementPromise;
        const isVisible = await elementInstance.isVisible({ timeout: 2000 });

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
   * @param deviceInstance - The device object
   */
  static async terminateApp(deviceInstance: Device): Promise<void> {
    let retries = 3;
    const packageId = AppwrightSelectors.isIOS(deviceInstance)
      ? 'io.metamask.MetaMask'
      : 'io.metamask';
    while (retries > 0) {
      try {
        await deviceInstance.terminateApp(packageId);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        retries--;
      } catch (error) {
        console.log('Error terminating app', packageId);
        console.log('Error terminating app, retrying...', error);
        retries--;

        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            await deviceInstance.terminateApp(packageId);
          } catch (retryError) {
            console.log('Retry also failed:', (retryError as Error).message);
          }
        }
      }
    }
    // Timeout to ensure the app is terminated
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Activate the MetaMask app
   * @param deviceInstance - The device object
   */
  static async activateApp(deviceInstance: Device): Promise<unknown> {
    const packageId = AppwrightSelectors.isIOS(deviceInstance)
      ? 'io.metamask.MetaMask'
      : 'io.metamask';
    let retries = 3;

    while (retries > 0) {
      try {
        const result = await deviceInstance.activateApp(packageId);
        console.log(`Successfully activated app: ${packageId}`);
        // Wait a moment for the app to initialize completely
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return result;
      } catch (error) {
        console.log(
          `Error activating app ${packageId}, attempt ${4 - retries}`,
        );
        console.log('Error details:', (error as Error).message);
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
