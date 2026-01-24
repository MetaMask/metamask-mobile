import AppwrightSelectors from './AppwrightSelectors.ts';
import { APP_PACKAGE_IDS } from './Constants.ts';
import { Device, AppwrightLocator } from 'appwright';

/**
 * Base class for Appwright gestures
 * Provides common gesture methods that can be extended by screen objects
 */
export default class AppwrightGestures {
  /**
   * Tap method with retry logic
   * @param elem - The element promise to tap
   * @param options - Configuration options for retry behavior
   * @param maxRetries - Maximum number of tap attempts
   * @param retryDelay - Delay between tap attempts
   */
  static async tap(
    elem: Promise<AppwrightLocator> | AppwrightLocator,
    options: {
      maxRetries?: number;
      retryDelay?: number;
    } = {},
  ): Promise<void> {
    const { maxRetries = 2, retryDelay = 1000 } = options;
    let lastError: Error | undefined;
    const elementToTap = await elem;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await elementToTap.tap();
        return; // Success, exit early
      } catch (error: unknown) {
        lastError = error as Error;

        // Check if it's a "not found" error and we have retries left
        // This is needed because of the system dialogs that pop up specifically on iOS
        if (lastError && attempt < maxRetries) {
          console.log(
            `Tap failed on attempt ${attempt + 1}: ${lastError.message}, retrying in ${retryDelay}ms...`,
          );
          await AppwrightGestures.wait(retryDelay);
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
   *
   * @param x - The x coordinate to tap
   * @param y - The y coordinate to tap
   */
  static async tapByCoordinates(
    testDevice: Device,
    { x, y }: { x: number; y: number },
    options: { delay?: number } = {},
  ): Promise<void> {
    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
    await testDevice.tap({ x, y });
  }

  /**
   * Type text into an element with retry logic
   * @param elem - The element promise to type into
   * @param text - The text to type
   * @param options - Configuration options for retry behavior
   * @param maxRetries - Maximum number of type attempts
   * @param retryDelay - Delay between type attempts
   */
  static async typeText(
    elem: Promise<AppwrightLocator> | AppwrightLocator,
    text: string,
    options: {
      maxRetries?: number;
      retryDelay?: number;
    } = {},
  ): Promise<void> {
    const { maxRetries = 1, retryDelay = 1000 } = options;
    let lastError: Error | undefined;
    const elementToType = await elem;

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
          await AppwrightGestures.wait(retryDelay);
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
  static async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Scroll element into view with platform-specific scrolling
   * @param testDevice - The device instance
   * @param elem - The element promise to scroll into view
   * @param options - Configuration options for scrolling behavior
   * @param maxScrollAttempts - Maximum number of scroll attempts
   * @param scrollTimeout - Timeout for scroll attempts
   * @param scrollParams - Parameters for scrolling behavior
   */
  static async scrollIntoView(
    testDevice: Device,
    elem: Promise<AppwrightLocator> | AppwrightLocator,
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
  ): Promise<AppwrightLocator> {
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
        const elementInstance = await elem;
        const isVisible = await elementInstance.isVisible({
          timeout: scrollTimeout,
        });

        if (isVisible) {
          return elementInstance;
        }
      } catch (error) {
        // Element not found or not visible, continue scrolling
      }

      // Perform a scroll action
      if (AppwrightSelectors.isAndroid(testDevice)) {
        // For Android, use a swipe gesture
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const webDriverClient = (testDevice as any).webDriverClient;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const webDriverClient = (testDevice as any).webDriverClient;
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

    throw new Error(
      `Element not found after ${maxScrollAttempts} scroll attempts`,
    );
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
        const result = await deviceInstance.terminateApp(packageId);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return result;
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
    if (AppwrightSelectors.isAndroid(deviceInstance)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webDriverClient = (deviceInstance as any).webDriverClient;
      await webDriverClient.hideKeyboard(); // only needed for Android
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webDriverClient = (deviceInstance as any).webDriverClient;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webDriverClient = (deviceInstance as any).webDriverClient;
    return await webDriverClient.dismissAlert();
  }
}
