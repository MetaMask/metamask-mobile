import { CurrentDeviceDetails } from './fixture';
import { PlatformDetector } from './PlatformLocator';
import { PlaywrightElement } from './PlaywrightAdapter';
import { boxedStep, getDriver } from './PlaywrightUtilities';

/**
 * PlaywrightGestures - Gesture helpers for WebdriverIO/Playwright
 *
 * This class provides gesture methods that wrap PlaywrightElement API.
 * Currently these are simple wrappers, but can be enhanced with retries,
 * stability checks, and logging in the future (similar to Detox Gestures).
 *
 * @example
 * const elem = await PlaywrightMatchers.getByXPath('...');
 * await PlaywrightGestures.tap(elem);
 * await PlaywrightGestures.fill(elem, 'text');
 */
export default class PlaywrightGestures {
  /**
   * Tap an element
   * This is a wrapper around the click method that waits for the element to be
   * displayed and enabled before tapping.
   * @param elem - The element to tap
   * @returns A promise that resolves when the tap is complete
   */
  @boxedStep
  static async tap(elem: PlaywrightElement): Promise<void> {
    await elem.unwrap().click();
  }

  /**
   * Wait and tap an element
   * This is a wrapper around the click method that waits for the element to be
   * displayed and enabled before tapping.
   * @param elem - The element to tap
   * @returns A promise that resolves when the tap is complete
   */
  /**
   * Waits until an element's position stops changing (i.e. animations have settled).
   * Polls the element's location and requires `stableCount` consecutive checks
   * with the same position before resolving.
   */
  static async waitForElementStable(
    elem: PlaywrightElement,
    options?: { timeout?: number; interval?: number; stableCount?: number },
  ): Promise<void> {
    const { timeout = 3000, interval = 150, stableCount = 6 } = options || {};
    const start = Date.now();
    let lastLocation: { x: number; y: number } | null = null;
    let stable = 0;

    while (Date.now() - start < timeout) {
      const loc = await elem.unwrap().getLocation();
      if (
        lastLocation &&
        loc.x === lastLocation.x &&
        loc.y === lastLocation.y
      ) {
        stable++;
        if (stable >= stableCount) return;
      } else {
        stable = 1;
        lastLocation = loc;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  @boxedStep
  static async waitAndTap(
    elem: PlaywrightElement,
    options?: {
      delay?: number;
      checkForDisplayed?: boolean;
      checkForEnabled?: boolean;
      checkForStable?: boolean;
    },
  ): Promise<void> {
    const {
      delay = 500,
      checkForDisplayed = true,
      checkForEnabled = true,
      checkForStable = false,
    } = options || {};

    if (checkForDisplayed) {
      await elem.unwrap().waitForDisplayed({ timeout: 10000 });
    }

    if (checkForEnabled) {
      await elem.unwrap().waitForEnabled({ timeout: 5000 });
    }

    if (checkForStable) {
      await this.waitForElementStable(elem);
    }

    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await elem.unwrap().click();
  }

  /**
   * Swipe element in a direction
   */
  @boxedStep
  static async swipe(
    elem: PlaywrightElement,
    direction: 'up' | 'down' | 'left' | 'right',
    speed: 'fast' | 'slow' = 'fast',
  ): Promise<void> {
    const location = await elem.unwrap().getLocation();
    const size = await elem.unwrap().getSize();

    const startX = location.x + size.width / 2;
    const startY = location.y + size.height / 2;

    let endX = startX;
    let endY = startY;

    const distance = 200; // pixels

    switch (direction) {
      case 'up':
        endY -= distance;
        break;
      case 'down':
        endY += distance;
        break;
      case 'left':
        endX -= distance;
        break;
      case 'right':
        endX += distance;
        break;
    }

    await elem
      .unwrap()
      .touchAction([
        { action: 'press', x: startX, y: startY },
        { action: 'wait', ms: speed === 'slow' ? 1000 : 100 },
        { action: 'moveTo', x: endX, y: endY },
        'release',
      ]);
  }

  /**
   * Long press an element
   */
  @boxedStep
  static async longPress(
    elem: PlaywrightElement,
    duration = 1000,
  ): Promise<void> {
    const location = await elem.unwrap().getLocation();
    const size = await elem.unwrap().getSize();

    const x = location.x + size.width / 2;
    const y = location.y + size.height / 2;

    await elem
      .unwrap()
      .touchAction([
        { action: 'press', x, y },
        { action: 'wait', ms: duration },
        'release',
      ]);
  }

  /**
   * Double tap an element using WebdriverIO click semantics.
   *
   * Avoid `touchAction` here because some WDIO/Appium combinations still route
   * that call through the legacy `touch/perform` endpoint, which can fail for
   * native mobile sessions. Two fast clicks are more reliable in this layer.
   */
  @boxedStep
  static async dblTap(elem: PlaywrightElement, intervalMs = 60): Promise<void> {
    const wrapped = elem.unwrap();

    await wrapped.click();

    if (intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    await wrapped.click();
  }

  /**
   * Scroll element into view
   */
  @boxedStep
  static async scrollIntoView(
    elem: PlaywrightElement,
    options?: { scrollParams?: { direction?: 'up' | 'down' } },
  ): Promise<void> {
    const { scrollParams = { direction: 'up' } } = options || {};
    await elem.unwrap().scrollIntoView({
      direction: scrollParams.direction,
    });
  }

  /**
   * Terminate the app
   * @param currentDeviceDetails - The current device details
   */
  @boxedStep
  static async terminateApp(
    currentDeviceDetails: CurrentDeviceDetails,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      finalTimeout?: number;
    } = {},
  ): Promise<void> {
    const { maxRetries = 3, retryDelay = 1000, finalTimeout = 2000 } = options;
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    let bundleId;
    let retries = maxRetries;

    if (
      (await PlatformDetector.isAndroid()) &&
      currentDeviceDetails.packageName
    ) {
      bundleId = currentDeviceDetails.packageName;
    } else if ((await PlatformDetector.isIOS()) && currentDeviceDetails.appId) {
      bundleId = currentDeviceDetails.appId;
    } else {
      throw new Error('Package name or app id is not available');
    }

    while (retries > 0) {
      try {
        await drv.terminateApp(bundleId);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return;
      } catch (error) {
        console.log('Error terminating app', bundleId);
        retries--;
      }
    }

    throw new Error(
      `Failed to terminate app "${bundleId}" after ${maxRetries} attempts`,
    );
  }

  /**
   * Activate the app
   * @param currentDeviceDetails - The current device details
   */
  @boxedStep
  static async activateApp(
    currentDeviceDetails: CurrentDeviceDetails,
  ): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    if (
      currentDeviceDetails.platform === 'android' &&
      currentDeviceDetails.packageName
    ) {
      await drv.activateApp(currentDeviceDetails.packageName);
      return;
    }

    if (currentDeviceDetails.platform === 'ios' && currentDeviceDetails.appId) {
      await drv.activateApp(currentDeviceDetails.appId);
      return;
    }

    throw new Error('Package name or app id is not available');
  }

  /**
   * Background the current app for a number of seconds.
   * @param seconds - Time to keep the app in the background
   */
  @boxedStep
  static async backgroundApp(seconds: number): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    await drv.execute('mobile: backgroundApp', { seconds });
  }

  /**
   * Hide keyboard for both Android and iOS
   * @param keyName - The key to press on iOS keyboard (default: 'Done'). Common values: 'Done', 'Return', 'Search', 'Go', 'Next'
   */
  static async hideKeyboard(keyName: string = 'Done'): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    if (await PlatformDetector.isAndroid()) {
      await drv.hideKeyboard();
    } else {
      // iOS - tapOutside dismisses the keyboard by tapping outside the focused
      // element, which works regardless of keyboard type (password, numeric, etc.)
      try {
        await drv.executeScript('mobile: hideKeyboard', [
          { strategy: 'pressKey', key: keyName },
        ]);
      } catch {
        // Keyboard may already be hidden
      }
    }
  }
}
