/* eslint-disable no-console */
import { waitFor } from 'detox';

/**
 * Class for handling user actions (Gestures)
 */
class Gestures {
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
   * @param {Promise<Detox.IndexableNativeElement | Detox.SystemElement>} element - The element to tap
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
      experimentalWaitForStability = false,
    } = options;
    if (!skipVisibilityCheck) {
      await waitFor(await element)
        .toBeVisible()
        .withTimeout(timeout);
      if (experimentalWaitForStability) {
        await this.waitForElementStability(element);
      }
    }
    if (delayBeforeTap > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBeforeTap)); // in some cases the element is visible but not fully interactive yet.
    }
    await (await element).tap();
  }

  /**
   * Waits for an element to become stable (not moving) by checking its position multiple times.
   *
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to check for stability
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.timeout=5000] - Maximum time to wait for stability (ms)
   * @param {number} [options.interval=200] - Time between position checks (ms)
   * @param {number} [options.stableCount=3] - Number of consecutive stable checks required
   */
  static async waitForElementStability(element, options = {}) {
    const { timeout = 5000, interval = 200, stableCount = 3 } = options;
    let lastPosition = null;
    let stableChecks = 0;
    const start = Date.now();
    let foundPosition = false;
    let attributes;
    let lastError = null;

    while (Date.now() - start < timeout) {
      try {
        const el = await element;

        await expect(el).toExist();

        attributes = await el.getAttributes();

        if (
          !attributes.frame ||
          typeof attributes.frame.x !== 'number' ||
          typeof attributes.frame.y !== 'number'
        ) {
          throw new Error('Element frame is invalid or missing position data');
        }

        const position = {
          x: attributes.frame.x,
          y: attributes.frame.y,
        };
        foundPosition = true;

        if (lastPosition) {
          if (position.x === lastPosition.x && position.y === lastPosition.y) {
            stableChecks += 1;
            if (stableChecks >= stableCount) {
              return;
            }
          } else {
            stableChecks = 1;
            lastPosition = position;
          }
        } else {
          lastPosition = position;
          stableChecks = 1;
        }

        lastError = null;
      } catch (err) {
        lastError = err;

        if (err.message.includes('No elements found')) {
          console.log(
            '[waitForElementStability] Element not found, waiting...',
          );
        } else if (err.message.includes('frame is invalid')) {
          console.log(
            '[waitForElementStability] Skipping stability check due to invalid frame',
          );
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return; // If the element is found but has no valid position, we can return early as this function is meant to track stability based on position. There is a buffer of 1500ms to allow the element to stabilize.
        } else {
          console.log(
            '[waitForElementStability] Error reading position, retrying...',
            err.message,
          );
        }
        stableChecks = 0;
        lastPosition = null;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    if (foundPosition) {
      throw new Error(
        `Element did not become stable after ${timeout}ms\nElement: ${
          attributes?.identifier ||
          attributes?.label ||
          attributes?.text ||
          'could not retrieve identifier'
        }\nLast known position: ${JSON.stringify(lastPosition)}`,
      );
    }
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
   */
  static async tapWebElement(element, timeout = 15000) {
    // For web elements, we need to use a different approach to wait
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await expect(await element).toExist();
        await (await element).tap();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Web element not found or not tappable');
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
   * @param {Promise<Detox.IndexableNativeElement>} element - The element to type into
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
