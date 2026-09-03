/* eslint-disable no-restricted-syntax */
import Utilities, { BASE_DEFAULTS } from './Utilities.ts';
import {
  LongPressOptions,
  TapOptions,
  SwipeOptions,
  ScrollOptions,
  GestureOptions,
  TypeTextOptions,
  type ScrollContainer,
} from './types.ts';
import { AppiumElement } from './AppiumElement.ts';
import AppiumGestures from './AppiumGestures.ts';
import Matchers from './Matchers.ts';
import { PlatformDetector } from './PlatformLocator.ts';
import type { CurrentDeviceDetails } from './fixtures/playwright';

type TapAtIndexElement =
  | AppiumElement
  | Promise<AppiumElement>
  | AppiumElement[];

/**
 * Gestures — canonical page-object entry point for Appium interactions.
 */
export default class Gestures {
  /**
   * Page-object scroll direction is inverted relative to Appium scrollIntoView
   * swipe direction for vertical scrolling (scroll down → swipe up).
   */
  private static toScrollIntoViewDirection(
    direction?: ScrollOptions['direction'],
  ): 'up' | 'down' | 'left' | 'right' {
    if (direction === 'down') {
      return 'up';
    }
    if (direction === 'up') {
      return 'down';
    }
    return direction ?? 'up';
  }

  private static async resolveScrollableElement(
    scrollView?: ScrollContainer,
  ): Promise<AppiumElement | undefined> {
    if (typeof scrollView !== 'string') {
      return undefined;
    }
    return Matchers.getElementByID(scrollView);
  }

  private static async scrollWithinContainer(
    scrollView: AppiumElement | Promise<AppiumElement>,
    swipeDirection: 'up' | 'down' | 'left' | 'right',
    percent = 0.6,
  ): Promise<void> {
    // Coordinate drag works on both platforms. Prefer it over Android
    // `mobile: scrollGesture`, which returns false for RN ScrollViews
    // (same approach as WalletHomeScroll.scrollWalletHomeAndroid).
    const container = await scrollView;
    const location = await container.unwrap().getLocation();
    const size = await container.unwrap().getSize();
    const centerX = Math.floor(location.x + size.width / 2);
    const travel = Math.floor(
      size.height * Math.min(Math.max(percent, 0.1), 0.9),
    );

    if (swipeDirection === 'up' || swipeDirection === 'down') {
      const fromY =
        swipeDirection === 'up'
          ? location.y + Math.floor(size.height * 0.8)
          : location.y + Math.floor(size.height * 0.2);
      const toY = swipeDirection === 'up' ? fromY - travel : fromY + travel;

      await AppiumGestures.swipe({
        scrollParams: { direction: swipeDirection },
        percent,
        duration: 600,
        from: { x: centerX, y: fromY },
        to: { x: centerX, y: toY },
      });
      return;
    }

    await AppiumGestures.swipe({
      scrollParams: { direction: swipeDirection },
      percent,
      duration: 600,
    });
  }

  /**
   * Tap an element with stability checking and auto-retry
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async tap(
    elem: AppiumElement | Promise<AppiumElement>,
    options: TapOptions = {},
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.waitAndTap(el, {
      timeout: options.timeout,
      delay: options.delay,
      checkForDisplayed: options.checkForDisplayed ?? true,
      checkForEnabled: options.checkEnabled,
    });
  }

  /**
   * Wait for an element to be visible and then tap it with enhanced options
   * This is the same as tap() - but with an additional delay before the tap.
   * This is useful for cases where the element might not be immediately ready for interaction.
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async waitAndTap(
    elem: AppiumElement | Promise<AppiumElement>,
    options: TapOptions = {},
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.waitAndTap(el, {
      timeout: options.timeout,
      delay: options.delay,
      checkForDisplayed: options.checkForDisplayed ?? true,
      checkForEnabled: options.checkEnabled,
      waitForInteractive: options.waitForInteractive,
      enabledStableReads: options.enabledStableReads,
      postEnabledSettleMs: options.postEnabledSettleMs,
      checkForStable: options.checkStability,
    });
  }

  /**
   * Tap element at a specific index
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async tapAtIndex(
    elem: TapAtIndexElement,
    index: number,
    _options: TapOptions = {},
  ): Promise<void> {
    if (Array.isArray(elem)) {
      const elements = elem as AppiumElement[];
      if (index < 0 || index >= elements.length) {
        throw new Error(
          `tapAtIndex: index ${index} is out of bounds (${elements.length} elements)`,
        );
      }
      await elements[index].click();
      return;
    }

    if (index !== 0) {
      throw new Error(
        `tapAtIndex: Appium requires a AppiumElement[] array for index > 0. ` +
          `Received single element with index ${index}.`,
      );
    }
    const el = await elem;
    await el.click();
  }

  /**
   * Tap an element at specific point with stability checking
   * This method is for native elements and should not be used with web elements.
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async tapAtPoint(
    elem: AppiumElement | Promise<AppiumElement>,
    point: { x: number; y: number },
    _options: TapOptions = {},
  ): Promise<void> {
    const el = await elem;
    await el.tapOnCoordinates(point);
  }

  /**
   * Performs a double tap gesture on a native mobile element.
   * This method is specifically designed for mobile automation testing and should not be used with web elements.
   * @returns A Promise that resolves when the double tap gesture is completed
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async dblTap(
    elem: AppiumElement | Promise<AppiumElement>,
    _options: TapOptions = {},
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.dblTap(el);
  }

  /**
   * Long press with stability checking
   * @returns A Promise that resolves when the long press is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async longPress(
    elem: AppiumElement | Promise<AppiumElement>,
    options: LongPressOptions = {},
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.longPress(el, options.duration);
  }

  /**
   * Type text with automatic field clearing and retry
   * @returns A Promise that resolves when the text is successfully typed
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async typeText(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
    options: TypeTextOptions = {},
  ): Promise<void> {
    const el = await elem;
    await el.fill(text);

    if (options.hideKeyboard ?? true) {
      await AppiumGestures.hideKeyboard();
    }
  }

  /**
   * Type text into a web element within a webview.
   * @param {AppiumElement | Promise<AppiumElement>} element
   * @param {string} text - The text to type.
   */
  static async typeInWebElement(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
  ): Promise<void> {
    const input = await elem;
    await input.clear();
    await input.fill(text);
    return;
  }

  /**
   * Replace text in field with retry
   * @returns A Promise that resolves when the text is successfully replaced
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async replaceText(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
    options: GestureOptions = {},
  ): Promise<void> {
    const timeout = options.timeout ?? 15_000;
    const el = await elem;
    // Wait for a fresh displayed node before clearValue — otherwise Appium
    // fails with "Can't call clearValue ... because element wasn't found"
    // when navigation to the input screen is still settling.
    await el.waitForDisplayed({
      timeout,
      timeoutMsg: options.elemDescription
        ? `${options.elemDescription} was not displayed within ${timeout}ms`
        : `Element was not displayed within ${timeout}ms before replaceText`,
    });
    await el.clear();
    await el.fill(text);
  }

  /**
   * Swipe with element readiness checking
   * @returns A Promise that resolves when the swipe is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async swipe(
    elem: AppiumElement | Promise<AppiumElement>,
    direction: 'up' | 'down' | 'left' | 'right',
    options: SwipeOptions = {},
  ): Promise<void> {
    const percent = options.percentage ?? 0.75;

    if (direction === 'left' || direction === 'right') {
      await AppiumGestures.swipe({
        scrollParams: { direction },
        percent,
      });
      return;
    }

    await this.scrollWithinContainer(elem, direction, percent);
  }

  /**
   * Scroll to element with dynamic retry and platform-specific adjustments
   * @returns A Promise that resolves when the scroll is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async scrollToElement(
    targetElement: AppiumElement | Promise<AppiumElement>,
    scrollableContainer?: ScrollContainer,
    options: ScrollOptions = {},
  ): Promise<void> {
    const el = await targetElement;
    const scrollableElement =
      await Gestures.resolveScrollableElement(scrollableContainer);

    // Cap scrolls so a missing target fails in tens of seconds instead of
    // burning a 3-minute Playwright timeout (each miss is ~5s of findElement).
    const maxScrolls = options.timeout
      ? Math.max(3, Math.min(12, Math.ceil(options.timeout / 5000)))
      : 10;

    await AppiumGestures.scrollIntoView(el, {
      scrollParams: {
        direction: Gestures.toScrollIntoViewDirection(options.direction),
      },
      scrollableElement,
      maxScrolls,
    });
  }

  /**
   * Scrolls a web element into the viewport with retry logic.
   * @returns A Promise that resolves when the element has been successfully scrolled into view
   * @throws Will throw an error if the scroll operation fails after all retry attempts
   */
  static async scrollToWebViewPort(
    elem: AppiumElement | Promise<AppiumElement>,
  ): Promise<void> {
    const el = await elem;
    await Utilities.executeWithRetry(
      async () => {
        await el.scrollToView();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'scrollToWebViewPort()',
      },
    );
  }

  // Legacy methods for backwards compatibility

  /**
   * Legacy method: Tap and long press
   * @deprecated Use longPress() instead for better error handling and retry mechanisms
   */
  static async tapAndLongPress(
    elem: AppiumElement | Promise<AppiumElement>,
    timeout = 2000,
  ): Promise<void> {
    return this.longPress(elem, { duration: timeout });
  }

  /**
   * Legacy method: Tap web element
   * @deprecated Use tap() with web elements instead for better error handling and retry mechanisms
   */
  static async tapWebElement(
    elem: AppiumElement | Promise<AppiumElement>,
    timeout = 15000,
  ): Promise<void> {
    return this.tap(elem, { timeout });
  }

  /**
   * Legacy method: Double tap an element
   * @deprecated Use dblTap() instead for better error handling and retry mechanisms - we should replace the function name when we have migrated all usages
   */
  static async doubleTap(
    elem: AppiumElement | Promise<AppiumElement>,
  ): Promise<void> {
    return this.dblTap(elem);
  }

  /**
   * Legacy method: Clear the text field
   * @deprecated Use typeText() with clearFirst option or the replaceText() from Gestures.ts instead for better error handling and retry mechanisms
   */
  static async clearField(
    elem: AppiumElement | Promise<AppiumElement>,
    options: GestureOptions = {},
  ): Promise<void> {
    return this.replaceText(elem, '', options);
  }

  /**
   * Legacy method: Type text and hide keyboard
   * @deprecated Use typeText() with hideKeyboard option instead for better error handling and retry mechanisms
   */
  static async typeTextAndHideKeyboard(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
  ): Promise<void> {
    return this.typeText(elem, text, {
      clearFirst: true,
      hideKeyboard: true,
    });
  }

  /**
   * Legacy method: Type text without hiding keyboard
   * @deprecated Use typeText() with hideKeyboard: false option instead for better error handling and retry mechanisms
   */
  static async typeTextWithoutKeyboard(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
  ): Promise<void> {
    return this.typeText(elem, text, {
      clearFirst: false,
      hideKeyboard: false,
    });
  }

  /**
   * Legacy method: Replace text in field
   * @deprecated Use replaceText() instead for better error handling and retry mechanisms
   */
  static async replaceTextInField(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
    timeout = 10000,
  ): Promise<void> {
    return this.replaceText(elem, text, { timeout });
  }

  /**
   * Tap a single iOS soft-keyboard key (Appium iOS only).
   * For return/submit keys (Done, Next, Go, Search), use tapKeyboardReturnKey.
   */
  static async tapIosKeyboardKey(keyName: string): Promise<void> {
    if (!PlatformDetector.isIOSAppium()) {
      throw new Error('Gestures.tapIosKeyboardKey is Appium iOS only');
    }
    await AppiumGestures.tapIosKeyboardKey(keyName);
  }

  /**
   * Tap the soft-keyboard return/submit key (Appium).
   * iOS tries `Done:` / keyboard-scoped locators before bare `~Done` — required
   * to fire onSubmitEditing when returnKeyType is done/next/go/search.
   */
  static async tapKeyboardReturnKey(keyName: string): Promise<void> {
    await AppiumGestures.tapKeyboardReturnKey(keyName);
  }

  /**
   * Type via the focused iOS soft keyboard by tapping keys (Appium iOS only).
   */
  static async typeViaIosKeyboard(
    text: string,
    options?: { numberPad?: boolean },
  ): Promise<void> {
    if (!PlatformDetector.isIOSAppium()) {
      throw new Error('Gestures.typeViaIosKeyboard is Appium iOS only');
    }
    await AppiumGestures.typeViaIosKeyboard(text, options);
  }

  /**
   * Appium: click, clear, type via per-character addValue (optional Return).
   * Use for iOS multiline TextInputs where Gestures.typeText (fill) is unreliable.
   */
  static async typeTextByCharacters(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
    options?: { submitWithReturn?: boolean },
  ): Promise<void> {
    const field = await elem;
    await AppiumGestures.typeTextByCharacters(field, text, options);
  }

  /**
   * Appium: append text via addValue without clearing the field.
   * Use after replaceText when Return must submit separately (e.g. iOS URL bar).
   */
  static async appendText(
    elem: AppiumElement | Promise<AppiumElement>,
    text: string,
  ): Promise<void> {
    const field = await elem;
    await field.type(text);
  }

  /**
   * Hide the soft keyboard (Appium).
   * Uses Android `hideKeyboard` when shown, and iOS `mobile: hideKeyboard`
   * with `tapOutside` (plain `driver.hideKeyboard()` is unreliable on XCUITest).
   */
  static async hideKeyboard(): Promise<void> {
    await AppiumGestures.hideKeyboard();
  }

  /**
   * Activate an app by device details or package/bundle id.
   */
  static async activateApp(
    currentDeviceDetails?: CurrentDeviceDetails,
    packageId?: string,
  ): Promise<void> {
    await AppiumGestures.activateApp(currentDeviceDetails, packageId);
  }

  /**
   * Terminate the app identified by device details.
   */
  static async terminateApp(
    currentDeviceDetails: CurrentDeviceDetails,
    options?: Parameters<typeof AppiumGestures.terminateApp>[1],
  ): Promise<void> {
    await AppiumGestures.terminateApp(currentDeviceDetails, options);
  }

  /**
   * Submit the focused Android URL field via KEYCODE_ENTER.
   */
  static async submitAndroidUrlBar(): Promise<void> {
    await AppiumGestures.submitAndroidUrlBar();
  }

  /**
   * Screen-level swipe (no target element). Prefer Gestures.swipe when a
   * locator exists.
   */
  static async swipeScreen(
    options: Parameters<typeof AppiumGestures.swipe>[0],
  ): Promise<void> {
    await AppiumGestures.swipe(options);
  }

  /**
   * Dismiss soft keyboard after token search (tapOutside + iOS pills-strip tap).
   * Prefer this over typeText({ hideKeyboard: true }) for TextFieldSearch.
   */
  static async dismissKeyboardAfterTokenSearch(): Promise<void> {
    await AppiumGestures.dismissKeyboardAfterTokenSearch();
  }

  /**
   * Appium: scroll an element into view (WDIO native scrollIntoView).
   * Prefer when you already have a AppiumElement (e.g. from
   * Matchers.getAllElementsByXPath). For AppiumElement | Promise<AppiumElement> targets with
   * a known scroll container, prefer scrollToElement.
   */
  static async scrollIntoView(
    elem: AppiumElement | Promise<AppiumElement>,
    options?: {
      direction?: 'up' | 'down' | 'left' | 'right';
      maxScrolls?: number;
      scrollableElement?: AppiumElement;
      percent?: number;
      from?: { x: number; y: number };
      to?: { x: number; y: number };
    },
  ): Promise<void> {
    const target = (await Promise.resolve(elem)) as AppiumElement;
    await AppiumGestures.scrollIntoView(target, {
      scrollParams: { direction: options?.direction ?? 'up' },
      maxScrolls: options?.maxScrolls,
      scrollableElement: options?.scrollableElement,
      percent: options?.percent,
      from: options?.from,
      to: options?.to,
    });
  }

  /**
   * Appium: scroll into view, then nudge clear of the bottom nav bar when
   * the target would otherwise sit in the bottom 15% of the screen.
   */
  static async scrollIntoViewFullyVisible(
    elem: AppiumElement | Promise<AppiumElement>,
    options?: {
      direction?: 'up' | 'down' | 'left' | 'right';
      maxScrolls?: number;
      scrollableElement?: AppiumElement;
      percent?: number;
      from?: { x: number; y: number };
      to?: { x: number; y: number };
    },
  ): Promise<void> {
    const target = (await Promise.resolve(elem)) as AppiumElement;
    await AppiumGestures.scrollIntoViewFullyVisible(target, {
      scrollParams: { direction: options?.direction ?? 'up' },
      maxScrolls: options?.maxScrolls,
      scrollableElement: options?.scrollableElement,
      percent: options?.percent,
      from: options?.from,
      to: options?.to,
    });
  }
}
