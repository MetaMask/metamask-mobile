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
  @boxedStep
  static async waitAndTap(
    elem: PlaywrightElement,
    options?: {
      delay?: number;
      checkForDisplayed?: boolean;
      checkForEnabled?: boolean;
    },
  ): Promise<void> {
    const {
      delay = 500,
      checkForDisplayed = true,
      checkForEnabled = true,
    } = options || {};

    if (checkForDisplayed) {
      await elem.unwrap().waitForDisplayed({ timeout: 10000 });
    }

    if (checkForEnabled) {
      await elem.unwrap().waitForEnabled({ timeout: 5000 });
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
  static async scrollIntoView(elem: PlaywrightElement): Promise<void> {
    await elem.unwrap().scrollIntoView();
  }

  /**
   * Terminate the app
   * @param currentDeviceDetails - The current device details
   */
  @boxedStep
  static async terminateApp(
    currentDeviceDetails: CurrentDeviceDetails,
  ): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    if (
      (await PlatformDetector.isAndroid()) &&
      currentDeviceDetails.packageName
    ) {
      await drv.terminateApp(currentDeviceDetails.packageName);
    } else if ((await PlatformDetector.isIOS()) && currentDeviceDetails.appId) {
      await drv.terminateApp(currentDeviceDetails.appId);
    } else {
      throw new Error('Package name or app id is not available');
    }
  }

  /**
   * Activate the app.
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

    await drv.background(seconds);
  }
}
