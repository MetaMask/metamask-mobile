import { getWindowSize } from './DeviceInfoCache.ts';
import { CurrentDeviceDetails } from './fixtures/playwright';
import { PlatformDetector } from './PlatformLocator';
import { PlaywrightElement } from './PlaywrightAdapter';
import { boxedStep, getDriver } from './PlaywrightUtilities';
import {
  createPlaywrightLogger,
  debugElementAction,
} from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightGestures');

export interface ScrollOptions {
  scrollParams?: { direction?: 'up' | 'down' | 'left' | 'right' };
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  percent?: number;
  scrollableElement?: PlaywrightElement;
  duration?: number;
  /** WDIO native scrollIntoView limit; default is 10. */
  maxScrolls?: number;
}

/**
 * PlaywrightGestures - Gesture helpers for WebdriverIO/Playwright
 *
 * This class provides gesture methods that wrap PlaywrightElement API.
 * Currently these are simple wrappers with debug logging (similar to Detox Gestures).
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
    await debugElementAction(logger, 'Tapping element', elem);
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

  private static async isAndroidSession(): Promise<boolean> {
    const drv = getDriver();
    const platform = String(
      (await drv.capabilities)?.platformName ?? '',
    ).toLowerCase();
    return platform.includes('android');
  }

  /**
   * Android often reports isEnabled=true while the RN control is still disabled.
   * Uses isEnabled plus native clickable/enabled attributes only — isClickable()
   * is a Web/DOM API and is not implemented on Appium Android (always fails).
   */
  private static async isElementInteractive(
    elem: PlaywrightElement,
  ): Promise<boolean> {
    if (!(await elem.isEnabled())) {
      return false;
    }

    if (!(await this.isAndroidSession())) {
      return true;
    }

    try {
      const [clickableAttr, enabledAttr] = await Promise.all([
        elem.getAttribute('clickable'),
        elem.getAttribute('enabled'),
      ]);
      return clickableAttr !== 'false' && enabledAttr !== 'false';
    } catch {
      return true;
    }
  }

  /**
   * Polls until the element stays interactive for consecutive reads.
   */
  static async waitUntilInteractive(
    elem: PlaywrightElement,
    timeout: number,
    options?: { requiredStableReads?: number; interval?: number },
  ): Promise<void> {
    const interval = options?.interval ?? 250;
    const requiredStableReads = options?.requiredStableReads ?? 6;
    const start = Date.now();
    let consecutiveInteractive = 0;

    while (Date.now() - start < timeout - interval) {
      if (await this.isElementInteractive(elem)) {
        consecutiveInteractive += 1;
        if (consecutiveInteractive >= requiredStableReads) {
          return;
        }
      } else {
        consecutiveInteractive = 0;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      `Element was not interactive for ${requiredStableReads} consecutive checks within ${timeout}ms`,
    );
  }

  @boxedStep
  static async waitAndTap(
    elem: PlaywrightElement,
    options?: {
      delay?: number;
      timeout?: number;
      checkForDisplayed?: boolean;
      checkForEnabled?: boolean;
      /** Stricter Android enabled polling (login unlock, etc.) */
      waitForInteractive?: boolean;
      checkForStable?: boolean;
      enabledStableReads?: number;
      postEnabledSettleMs?: number;
    },
  ): Promise<void> {
    const {
      timeout = 10000,
      delay = 500,
      checkForDisplayed = true,
      checkForEnabled = true,
      waitForInteractive = false,
      checkForStable = false,
      enabledStableReads = 3,
      postEnabledSettleMs,
    } = options || {};

    if (checkForDisplayed) {
      await elem.unwrap().waitForDisplayed({ timeout });
    }

    if (checkForEnabled) {
      if (waitForInteractive) {
        await this.waitUntilInteractive(elem, timeout, {
          requiredStableReads: enabledStableReads,
        });
        const settleMs = postEnabledSettleMs ?? 0;
        if (settleMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, settleMs));
        }
      } else {
        await elem.waitForEnabled({ timeout });
      }
    }

    if (checkForStable) {
      await this.waitForElementStable(elem);
    }

    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await debugElementAction(logger, 'Wait and tap element', elem);
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
    await debugElementAction(logger, 'Typing into element', elem);
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
    logger.debug(`Swiping ${scrollParams.direction ?? 'up'}`);
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

    await debugElementAction(logger, 'Long pressing element', elem);
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

    await debugElementAction(logger, 'Double tapping element', elem);
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
      maxScrolls = 30,
    } = options || {};
    await debugElementAction(logger, 'Scrolling element into view', elem);
    await elem.unwrap().scrollIntoView({
      direction: scrollParams.direction,
      from,
      to,
      percent,
      scrollableElement: scrollableElement?.unwrap(),
      duration,
      maxScrolls,
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
    const windowSize = getWindowSize();
    const elementBottom = location.y + size.height;
    const safeBottom = windowSize.height * 0.85;

    if (elementBottom > safeBottom) {
      await debugElementAction(
        logger,
        'Adjusting scroll to clear bottom nav for element',
        elem,
      );
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
      currentDeviceDetails.platform === 'android' &&
      currentDeviceDetails.packageName
    ) {
      bundleId = currentDeviceDetails.packageName;
    } else if (
      currentDeviceDetails.platform === 'ios' &&
      currentDeviceDetails.appId
    ) {
      bundleId = currentDeviceDetails.appId;
    } else {
      throw new Error('Package name or app id is not available');
    }

    logger.debug(`Terminating app: ${bundleId}`);
    while (retries > 0) {
      try {
        await drv.terminateApp(bundleId);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return;
      } catch (error) {
        logger.warn(`Error terminating app ${bundleId}:`, error);
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
      logger.debug(`Activating app: ${packageId}`);
      await drv.activateApp(packageId);
      return;
    }

    if (
      currentDeviceDetails?.platform === 'android' &&
      currentDeviceDetails.packageName
    ) {
      logger.debug(`Activating app: ${currentDeviceDetails.packageName}`);
      await drv.activateApp(currentDeviceDetails.packageName);
      return;
    }

    if (
      currentDeviceDetails?.platform === 'ios' &&
      currentDeviceDetails.appId
    ) {
      logger.debug(`Activating app: ${currentDeviceDetails.appId}`);
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

    logger.debug(`Backgrounding app for ${seconds}s`);
    await drv.execute('mobile: backgroundApp', { seconds });
  }

  /**
   * Hide keyboard for both Android and iOS
   * @param keyName - The key to press on iOS keyboard (default: 'Done'). Common values: 'Done', 'Return', 'Search', 'Go', 'Next'
   */
  static async hideKeyboard(): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    logger.debug('Hiding keyboard');
    if (PlatformDetector.isAndroid()) {
      await drv.hideKeyboard();
    } else {
      // iOS — use 'tapOutside' to dismiss the keyboard without pressing a
      // return key. 'pressKey: Done' would trigger onSubmitEditing on inputs
      // that have returnKeyType='done', causing unintended form submissions
      // before the test has a chance to interact with other elements.
      try {
        await drv.executeScript('mobile: hideKeyboard', [
          { strategy: 'tapOutside' },
        ]);
      } catch {
        // Keyboard may already be hidden
      }
    }
  }

  /**
   * Press a return key on the soft keyboard (e.g. 'Next', 'Done', 'Go').
   * Use when tapOutside cannot dismiss the keyboard (keyboardDismissMode="none")
   * or when onSubmitEditing must fire to advance the flow.
   */
  @boxedStep
  static async tapKeyboardReturnKey(keyName: string): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    logger.debug(`Tapping keyboard return key: ${keyName}`);

    if (PlatformDetector.isAndroid()) {
      await this.submitAndroidUrlBar(keyName);
      return;
    }

    // iOS — tap the keyboard return key directly (separate window from app UI).
    // e.g. Next: name="Next:" label="next" inside XCUIElementTypeKeyboard
    const normalized = keyName.toLowerCase();
    const titleCase = normalized.charAt(0).toUpperCase() + normalized.slice(1);

    // iOS keyboard keys commonly use "Next:" / label "next" — try those first.
    const locators = [
      `~${titleCase}:`,
      `-ios predicate string:type == 'XCUIElementTypeButton' AND name == '${titleCase}:'`,
      `//XCUIElementTypeKeyboard//XCUIElementTypeButton[@name='${titleCase}:']`,
      `//XCUIElementTypeKeyboard//XCUIElementTypeButton[@label='${normalized}']`,
      `~${titleCase}`,
      `~${normalized}`,
      `-ios predicate string:type == 'XCUIElementTypeButton' AND label == '${normalized}'`,
      `//XCUIElementTypeKeyboard//XCUIElementTypeButton[@name='${titleCase}']`,
      `//XCUIElementTypeKeyboard//XCUIElementTypeButton[@name='${normalized}']`,
    ];

    for (const locator of locators) {
      const button = await drv.$(locator);
      try {
        await button.waitForDisplayed({ timeout: 5000 });
        await button.click();
        return;
      } catch {
        // try next locator variant
      }
    }

    throw new Error(`Could not find iOS keyboard key "${keyName}"`);
  }

  /**
   * Submit the Android URL bar (web-search keyboard). Tries editor actions and
   * Enter — hideKeyboard alone does not fire onSubmitEditing and skips navigation.
   */
  @boxedStep
  static async submitAndroidUrlBar(preferredKey = 'Go'): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const normalized = preferredKey.toLowerCase();
    const actions: (() => Promise<unknown>)[] = [
      () =>
        drv.execute('mobile: performEditorAction', {
          action: normalized,
        }),
      () =>
        drv.execute('mobile: performEditorAction', {
          action: 'search',
        }),
      () => drv.pressKeyCode(66),
    ];

    if (normalized !== 'go') {
      actions.unshift(() =>
        drv.execute('mobile: performEditorAction', { action: 'go' }),
      );
    }

    let lastError: unknown;
    for (const action of actions) {
      try {
        await action();
        return;
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `Could not submit Android URL bar: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }
}
