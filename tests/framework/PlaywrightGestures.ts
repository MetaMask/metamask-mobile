import { PlatformDetector } from './PlatformLocator';
import { PlaywrightElement } from './PlaywrightAdapter';
import { boxedStep, getDriver } from './Utilities';
import { createLogger } from './logger.ts';

const logger = createLogger({ name: 'PlaywrightGestures' });

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
   * Double tap an element using native touch actions.
   *
   * Using explicit touchAction avoids relying on desktop-oriented click
   * semantics and keeps both taps within a mobile-appropriate interval.
   */
  @boxedStep
  static async dblTap(elem: PlaywrightElement, intervalMs = 60): Promise<void> {
    const location = await elem.unwrap().getLocation();
    const size = await elem.unwrap().getSize();

    const x = location.x + size.width / 2;
    const y = location.y + size.height / 2;

    await elem
      .unwrap()
      .touchAction([
        { action: 'press', x, y },
        'release',
        { action: 'wait', ms: intervalMs },
        { action: 'press', x, y },
        'release',
      ]);
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
   * @param packageName - The package name of the app to terminate (Android only)
   * @param appId - The app id of the app to terminate (iOS only)
   */
  @boxedStep
  static async terminateApp(
    packageName?: string,
    appId?: string,
  ): Promise<void> {
    const driver = getDriver();
    if (!driver) throw new Error('Driver is not available');
    if ((await PlatformDetector.isAndroid()) && packageName) {
      await driver.terminateApp(packageName);
    } else if ((await PlatformDetector.isIOS()) && appId) {
      await driver.terminateApp(appId);
    } else {
      throw new Error('Package name or app id is not available');
    }
  }

  @boxedStep
  static async tap(
    elem: Promise<PlaywrightElement> | PlaywrightElement,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      expectScreenChange?: boolean;
    } = {},
  ): Promise<void> {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      expectScreenChange = false,
    } = options;
    let lastError: Error | undefined;
    const elementToTap = await elem;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await elementToTap.click();
        return; // Success, exit early
      } catch (error: unknown) {
        lastError = error as Error;
        const errorMessage = lastError.message.toLowerCase();

        // If expectScreenChange is true and element is "not visible" (not "not found"),
        // assume tap succeeded and screen changed, causing element to disappear
        if (expectScreenChange && errorMessage.includes('not visible')) {
          logger.debug(
            'Tap likely succeeded - element disappeared (screen changed)',
          );
          return;
        }

        // Check if it's a "not found" error and we have retries left
        // This is needed because of the system dialogs that pop up specifically on iOS
        if (lastError && attempt < maxRetries) {
          logger.debug(
            `Tap failed on attempt ${attempt + 1}: ${lastError.message}, retrying in ${retryDelay}ms...`,
          );
          await PlaywrightGestures.wait(retryDelay);
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
}
