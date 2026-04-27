import { CurrentDeviceDetails } from './fixture';
import { PlatformDetector } from './PlatformLocator';
import { PlaywrightElement } from './PlaywrightAdapter';
import { boxedStep, getDriver } from './PlaywrightUtilities';

export interface ScrollOptions {
  scrollParams?: { direction?: 'up' | 'down' };
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  percent?: number;
  scrollableElement?: PlaywrightElement;
  duration?: number;
}

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
   * Type text into an element
   * @param elem - The element to type text into
   * @param text - The text to type
   * @returns A promise that resolves when the type text is complete
   */
  @boxedStep
  static async typeText(elem: PlaywrightElement, text: string): Promise<void> {
    await elem.unwrap().addValue(text);
  }

  /**
   * Swipe element in a direction
   * @param options - The options for the swipe
   * @returns A promise that resolves when the swipe is complete
   * @param options.direction - The direction to swipe
   * @param options.duration - The duration of the swipe, the shorter the duration, the faster the swipe
   * @param options.scrollableElement - The element to scroll
   * @param options.percent - The percentage of the swipe
   * @param options.from - The starting point of the swipe
   * @param options.to - The ending point of the swipe
   */
  @boxedStep
  static async swipe(
    options: ScrollOptions = {
      scrollParams: { direction: 'up' },
      duration: 1000,
      percent: 0.95,
      from: { x: NaN, y: NaN },
      to: { x: NaN, y: NaN },
    },
  ): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const {
      scrollParams = { direction: 'up' },
      duration,
      percent,
      from,
      to,
    } = options || {};
    await drv.swipe({
      direction: scrollParams.direction,
      duration,
      percent,
      from,
      to,
    });
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
    options?: ScrollOptions,
  ): Promise<void> {
    const {
      scrollParams = { direction: 'up' },
      from,
      to,
      percent,
      scrollableElement,
      duration,
    } = options || {};
    await elem.unwrap().scrollIntoView({
      direction: scrollParams.direction,
      from,
      to,
      percent,
      scrollableElement: scrollableElement?.unwrap(),
      duration,
    });
  }

  /**
   * Scroll element into view and ensure it is fully visible above the bottom
   * navigation bar.
   *
   * `scrollIntoView` stops as soon as any pixel of the element enters the
   * viewport, which can leave the element clipped behind the nav bar.
   * This method performs a follow-up W3C pointer swipe when the element's
   * bottom edge lands in the bottom 15% of the screen (the nav-bar zone).
   */
  @boxedStep
  static async scrollIntoViewFullyVisible(
    elem: PlaywrightElement,
    options?: ScrollOptions,
  ): Promise<void> {
    await PlaywrightGestures.scrollIntoView(elem, options);

    const drv = getDriver();
    if (!drv) return;

    const location = await elem.unwrap().getLocation();
    const size = await elem.unwrap().getSize();
    const windowSize = await drv.getWindowSize();
    const elementBottom = location.y + size.height;
    const safeBottom = windowSize.height * 0.85;

    if (elementBottom > safeBottom) {
      const overshoot = Math.ceil(elementBottom - safeBottom) + 20;
      const midX = Math.floor(windowSize.width / 2);
      const startY = Math.floor(windowSize.height * 0.6);
      await drv
        .action('pointer', {
          parameters: { pointerType: 'touch' },
        })
        .move({ x: midX, y: startY })
        .down()
        .pause(100)
        .move({ x: midX, y: startY - overshoot })
        .up()
        .perform();
    }
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
    currentDeviceDetails?: CurrentDeviceDetails,
    packageId?: string,
  ): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    if (packageId) {
      await drv.activateApp(packageId);
      return;
    }

    if (
      currentDeviceDetails?.platform === 'android' &&
      currentDeviceDetails.packageName
    ) {
      await drv.activateApp(currentDeviceDetails.packageName);
      return;
    }

    if (
      currentDeviceDetails?.platform === 'ios' &&
      currentDeviceDetails.appId
    ) {
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
      // iOS - try pressKey strategy first, fallback to tap outside
      try {
        await drv.executeScript('mobile: hideKeyboard', [
          {
            strategy: 'pressKey',
            key: keyName,
          },
        ]);
      } catch {
        // Fallback: tap outside the keyboard area (top of screen)
        await drv.tap({ x: 100, y: 150 });
      }
    }
  }
}
