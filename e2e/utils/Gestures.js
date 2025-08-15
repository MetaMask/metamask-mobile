/* eslint-disable no-console */
import { waitFor, expect } from 'detox';
import Utilities from './Utilities';

/**
 * Class for handling user actions (Gestures)
 */
class Gestures {
  /**
   * Helper function to add delay before performing an action.
   * Useful when elements are visible but not fully interactive yet.
   *
   * @param {number} delayMs - Delay in milliseconds
   * @returns {Promise<void>}
   */
  static async delayBeforeAction(delayMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  /**
   * Tap an element and long press.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to tap
   * @param {number} timeout - Timeout for waiting (default: 2000ms)
   */
  static async tapAndLongPress(element, timeout = 2000) {
    await (await element).longPress(timeout);
  }

  /**
   * Tap an element at a specific point.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to tap
   * @param {Object} point - Coordinates { x, y } where the element will be tapped
   */
  static async tapAtPoint(element, point) {
    await (await element).tap(point);
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to tap

   */
  static async tap(element) {
    await (await element).tap();
  }

  /**
   * Tap an element with text partial text matching before tapping it
   *
   * @param {string} textPattern - Regular expression pattern to match the text
   */
  static async tapTextBeginingWith(textPattern) {
    await element(by.text(new RegExp(`^/${textPattern} .*$/`))).tap();
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableNativeElement | Detox.SystemElement>} elementToTap - The element to tap
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.timeout=15000] - Timeout for waiting in milliseconds
   * @param {number} [options.delayBeforeTap=0] - Additional delay in milliseconds before tapping after element is visible
   * @param {boolean} [options.skipVisibilityCheck=false] - When true, skips the initial visibility check before tapping. Useful for elements that may be technically present but not passing Detox's visibility threshold.
   * @param {boolean} [options.experimentalWaitForStability=false] - EXPERIMENTAL: When true, waits for element stability before tapping.
   */
  static async waitAndTap(element, options = {}) {
    const {
      timeout = 15000,
      delayBeforeTap = 0,
      skipVisibilityCheck = false,
    } = options;
    const elementToTap = await element;
    if (!skipVisibilityCheck) {
      await (device.getPlatform() === 'ios'
        ? waitFor(elementToTap).toExist()
        : waitFor(elementToTap).toBeVisible()
      ).withTimeout(timeout);
    }
    await this.delayBeforeAction(delayBeforeTap); // in some cases the element is visible but not fully interactive yet.
    await Utilities.waitForElementToBeEnabled(elementToTap);
    await (await elementToTap).tap();
  }

  /**
   * Wait for an element at a specific index to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to tap
   * @param {number} index - Index of the element to tap
   * @param {number} timeout - Timeout for waiting (default: 15000ms)
   */
  static async tapAtIndex(element, index, timeout = 15000) {
    const itemElementAtIndex = (await element).atIndex(index);
    await waitFor(itemElementAtIndex).toBeVisible().withTimeout(timeout);
    await itemElementAtIndex.tap();
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableWebElement>} element - The element to tap
   * @param {Object} options - Options for the tap operation
   * @param {number} [options.timeout=15000] - Timeout for waiting (default: 15000ms)
   * @param {number} [options.delayBeforeTap=0] - Delay before tapping in milliseconds (default: 0ms)
   */
  static async tapWebElement(element, options = {}) {
    const { timeout = 15000, delayBeforeTap = 0 } = options;

    // For web elements, we need to use a different approach to wait
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await expect(await element).toExist();

        // Add delay before tap if specified
        await this.delayBeforeAction(delayBeforeTap);

        await (await element).tap();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Web element not found or not tappable');
  }

  /**
   * Type text into a web element within a webview using JavaScript injection.
   * @param {Promise<Detox.IndexableWebElement>} element - The web element to type into.
   * @param {string} text - The text to type.
   */
  static async typeInWebElement(element, text) {
    try {
      await (
        await element
      ).runScript(
        (el, value) => {
          el.focus();
          el.value = value;
          el._valueTracker && el._valueTracker.setValue('');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        [text],
      );
    } catch {
      await (await element).typeText(text);
    }
  }

  /**
   * Double tap an element by text.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to double tap
   */
  static async doubleTap(element) {
    await (await element).multiTap(2);
  }

  /**
   * Clear the text field of an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to clear
   * @param {number} timeout - Timeout for waiting (default: 8000ms)

  */
  static async clearField(element, timeout = 2500) {
    await waitFor(await element)
      .toBeVisible()
      .withTimeout(timeout);

    await (await element).replaceText('');
  }

  /**
   * Type text into an element and hide the keyboard.
   *
   * @param {Promise<Detox.IndexableNativeElement | Detox.NativeElement | Detox.IndexableSystemElement>} element - The element to type into
   * @param {string} text - Text to be typed into the element
   */
  static async typeTextAndHideKeyboard(element, text) {
    await this.clearField(element);

    await (await element).typeText(text + '\n');
  }

  /**
   * Type text into an element without hiding the keyboard.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to type into
   * @param {string} text - Text to be typed into the element
   */
  static async typeTextWithoutKeyboard(element, text) {
    await (await element).typeText(text);
  }

  /**
   * Replace the text in the field of an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to replace the text in
   * @param {string} text - Text to replace the existing text in the element
   */
  static async replaceTextInField(element, text, timeout = 10000) {
    await waitFor(await element)
      .toBeVisible()
      .withTimeout(timeout);

    await (await element).replaceText(text);
  }

  /**
   * Swipe on an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to swipe on
   * @param {Detox.Direction} direction - Direction of the swipe - left | right | top | bottom | up | down
   * @param {Detox.Speed} [speed] - Speed of the swipe (fast, slow)
   * @param {number} [percentage] - Percentage of the swipe (0 to 1)
   * @param {number} [xStart] - X-coordinate to start the swipe
   * @param {number} [yStart] - Y-coordinate to start the swipe
   */
  static async swipe(element, direction, speed, percentage, xStart, yStart) {
    await (await element).swipe(direction, speed, percentage, xStart, yStart);
  }

  /**
   * Swipe on an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to swipe on
   * @param {Detox.Direction} direction - Direction of the swipe - left | right | top | bottom | up | down
   * @param {Detox.Speed} [speed] - Speed of the swipe (fast, slow)
   * @param {number} [percentage] - Percentage of the swipe (0 to 1)
   * @param {number} [xStart] - X-coordinate to start the swipe
   * @param {number} [yStart] - Y-coordinate to start the swipe
   * @param {number} index - Index of the element (default 0)
   */
  static async swipeAtIndex(
    element,
    direction,
    speed,
    percentage,
    xStart,
    yStart,
    index = 0,
  ) {
    await (await element)
      .atIndex(index)
      .swipe(direction, speed, percentage, xStart, yStart);
  }

  /**
   * Scrolls the web element until its top is at the top of the viewport.
   * @param {Promise<Element>} element - The element to scroll to the viewport.
   */
  static async scrollToWebViewPort(element) {
    await (await element).scrollToView();
  }

  /**
   * Dynamically Scrolls to an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} destinationElement - The element to scroll up to
   * @param {Promise<Detox.NativeMatcher>} scrollIdentifier - The identifier (by.id) NOT element (element(by.id)). Keep this distinction in mind. If you pass in an elementID this method would not work as intended
   * @param {Detox.Direction} direction - Direction of the scroll (up, down, left, right). The default is down.
   * @param {number} [scrollAmount=350] - The amount to scroll (default is 350). Optional parameter.   */
  static async scrollToElement(
    destinationElement,
    scrollIdentifier,
    direction = 'down',
    scrollAmount = 350,
  ) {
    await waitFor(await destinationElement)
      .toBeVisible()
      .whileElement(await scrollIdentifier)
      .scroll(scrollAmount, direction);
  }
}

export default Gestures;
