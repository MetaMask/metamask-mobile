import { waitFor } from 'detox';

/**
 * Class for handling user actions (Gestures)
 */
class Gestures {
  /**
   * Tap an element and long press.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to tap
   * @param {number} index - Index of the element (default: 0)
   * @param {number} timeout - Timeout for waiting (default: 2000ms)
   */
  static async tapAndLongPress(elementID, index = 0, timeout = 2000) {
    const element = await elementID;

    await element.atIndex(index).longPress(timeout);
  }

  /**
   * Tap an element at a specific point.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to tap
   * @param {Object} point - Coordinates { x, y } where the element will be tapped
   */
  static async tapAtPoint(elementID, point) {
    const element = await elementID;
    await element.tap(point);
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to tap
   * @param {number} index - Index of the element (default: 0)

   */
  static async tap(elementID, index = 0) {
    const element = await elementID;
    await element.atIndex(index).tap();
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to tap
   * @param {number} index - Index of the element (default: 0)
   * @param {number} timeout - Timeout for waiting (default: 8000ms)
   */
  static async waitAndTap(elementID, index = 0, timeout = 8000) {
    const element = await elementID;
    await waitFor(element).toBeVisible().withTimeout(timeout);
    await element.atIndex(index).tap();
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {Promise<Detox.IndexableWebElement>} elementID - ID of the element to tap
   */
  static async tapWebElement(elementID) {
    const element = await elementID;
    await element.tap();
  }

  /**
   * Double tap an element by text.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - Text of the element to double tap
   * @param {number} index - Index of the element (default: 0)
   */
  static async doubleTap(elementID, index = 0) {
    const element = await elementID;

    await element.atIndex(index).multiTap(2);
  }

  /**
   * Clear the text field of an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to clear
   */
  static async clearField(elementID) {
    const element = await elementID;

    await element.replaceText('');
  }

  /**
   * Type text into an element and hide the keyboard.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to type into
   * @param {string} text - Text to be typed into the element
   */
  static async typeTextAndHideKeyboard(elementID, text) {
    const element = await elementID;
    if (device.getPlatform() === 'android') {
      await this.clearField(element);
    }
    await element.typeText(text + '\n');
  }

  /**
   * Replace the text in the field of an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to replace the text in
   * @param {string} text - Text to replace the existing text in the element
   */
  static async replaceTextInField(elementID, text) {
    const element = await elementID;

    await element.replaceText(text);
  }

  /**
   * Swipe on an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to swipe on
   * @param {Detox.Direction} direction - Direction of the swipe - left | right | top | bottom | up | down
   * @param {Detox.Speed} [speed] - Speed of the swipe (fast, slow)
   * @param {number} [percentage] - Percentage of the swipe (0 to 1)
   * @param {number} [xStart] - X-coordinate to start the swipe
   * @param {number} [yStart] - Y-coordinate to start the swipe
   */
  static async swipe(elementID, direction, speed, percentage, xStart, yStart) {
    const element = await elementID;

    await element.swipe(direction, speed, percentage, xStart, yStart);
  }

  /**
   * Swipe on an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} elementID - ID of the element to swipe on
   * @param {Detox.Direction} direction - Direction of the swipe - left | right | top | bottom | up | down
   * @param {Detox.Speed} [speed] - Speed of the swipe (fast, slow)
   * @param {number} [percentage] - Percentage of the swipe (0 to 1)
   * @param {number} [xStart] - X-coordinate to start the swipe
   * @param {number} [yStart] - Y-coordinate to start the swipe
   * @param {number} index - Index of the element (default 0)
   */
  static async swipeAtIndex(
    elementID,
    direction,
    speed,
    percentage,
    xStart,
    yStart,
    index = 0,
  ) {
    const element = await elementID;

    await element
      .atIndex(index)
      .swipe(direction, speed, percentage, xStart, yStart);
  }

  /**
   * Dynamically Scrolls to an element identified by ID.
   *
   * @param {Promise<Detox.IndexableNativeElement>} destinationElementID - ID of the element to scroll up to
   * @param {number} scrollIdentifier - The identifier (by.id) NOT elementID (element(by.id)). Keep this distinction in mind. If you pass in an elementID this method would not work as intended
   * @param {Detox.Direction} direction - Direction of the scroll (up, down, left, right). The default is down.
   * @param {number} [scrollAmount=350] - The amount to scroll (default is 350). Optional parameter.   */
  static async scrollToElement(
    destinationElementID,
    scrollIdentifier,
    direction = 'down',
    scrollAmount = 350,
  ) {
    const destinationElement = await destinationElementID;
    const scrollableElement = await scrollIdentifier;

    await waitFor(destinationElement)
      .toBeVisible()
      .whileElement(scrollableElement)
      .scroll(scrollAmount, direction);
  }
}

export default Gestures;
