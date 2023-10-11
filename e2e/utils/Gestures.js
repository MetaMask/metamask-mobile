import Matchers from './Matchers';
import { waitFor } from 'detox';

/**
 * Class for handling user actions (Gestures), extends Matchers
 */
class Gestures extends Matchers {
  /**
   * Tap an element by ID.
   *
   * @param {string} elementID - ID of the element to tap
   * @param {number} index - Index of the element (default: 0)
   */
  async tapByID(elementID, index = 0) {
    const element = await this.getElementByID(elementID);
    await element.atIndex(index).tap();
  }

  /**
   * Tap an element by text.
   *
   * @param {string} text - Text of the element to tap
   * @param {number} index - Index of the element (default: 0)
   */
  async tapByText(text, index = 0) {
    const element = await this.getElementByText(text);
    await element.atIndex(index).tap();
  }

  /**
   * Tap an element by label.
   *
   * @param {string} label - Label of the element to tap
   * @param {number} index - Index of the element (default: 0)
   */
  async tapByLabel(label, index = 0) {
    const element = await this.getElementByLabel(label);
    await element.atIndex(index).tap();
  }

  /**
   * Tap a webview element by ID.
   *
   * @param {string} elementID - ID of the webview element to tap
   */
  async tapWebviewElement(elementID) {
    // This method only works on Android: https://wix.github.io/Detox/docs/api/webviews/
    const element = await this.getElementByWebID(elementID);
    await element.tap();
  }

  /**
   * Tap an element by descendant test ID.
   *
   * @param {string} parentElement - ID of the parent element
   * @param {string} childElement - ID of the child element to locate within the parent
   */
  async tapByDescendentTestID(parentElement, childElement) {
    const element = await this.getElementByDescendent(
      parentElement,
      childElement,
    );
    await element.tap();
  }

  /**
   * Tap an element and long press.
   *
   * @param {string} elementID - ID of the element to tap
   * @param {number} index - Index of the element (default: 0)
   * @param {number} timeout - Timeout for waiting (default: 2000ms)
   */
  async tapAndLongPress(elementID, index = 0, timeout = 2000) {
    const element = await this.getElementByID(elementID);
    await element.atIndex(index).tap();
    await element.longPress(timeout);
  }

  /**
   * Tap an element at a specific point.
   *
   * @param {string} elementID - ID of the element to tap
   * @param {Object} point - Coordinates { x, y } where the element will be tapped
   */
  async tapAtPoint(elementID, point) {
    const element = await this.getElementByID(elementID);
    await element.tap(point);
  }

  /*
   * Leaving here for now since we need to find and replace this in the page objects.
   * The tapByID would replace this method since it takes the index as an argument
   */
  async tapItemAtIndex(elementID, index) {
    return element(by.id(elementID, index))
      .atIndex(index || 0)
      .tap();
  }

  /*
   * Leaving here for now since we need to find and replace this in the page objects.
   * The tapByLabel would replace this method since it takes the index as an argument
   */
  async tapItemAtIndexByLabel(elementID, index) {
    return element(by.label(elementID, index))
      .atIndex(index || 0)
      .tap();
  }

  /**
   * Wait for an element to be visible and then tap it.
   *
   * @param {string} elementID - ID of the element to tap
   * @param {number} index - Index of the element (default: 0)
   * @param {number} timeout - Timeout for waiting (default: 8000ms)
   */
  async waitAndTap(elementID, index = 0, timeout = 8000) {
    const element = await this.getElementByID(elementID);
    await waitFor(element).toBeVisible().withTimeout(timeout);
    await element.tap(index);
  }

  /**
   * Wait for an element by label to be visible and then tap it.
   *
   * @param {string} label - Label of the element to tap
   * @param {number} timeout - Timeout for waiting (default: 8000ms)
   * @param {number} index - Index of the element (default: 0)
   */
  async waitAndTapByLabel(label, timeout = 8000, index = 0) {
    const element = await this.getElementByLabel(label);
    await waitFor(element).toBeVisible().withTimeout(timeout);
    await element.tap(index);
  }

  /**
   * Wait for an element by text to be visible and then tap it.
   *
   * @param {string} text - Text of the element to tap
   * @param {number} [timeout=8000] - Timeout for waiting (default: 8000ms)
   */
  async waitAndTapText(text, timeout = 8000) {
    const element = await this.getElementByText(text);
    await waitFor(element)
      .toBeVisible()
      .withTimeout(timeout || 8000);
    await element.tap();
  }

  /**
   * Double tap an element by text.
   *
   * @param {string} text - Text of the element to double tap
   * @param {number} index - Index of the element (default: 0)
   */
  async doubleTapByText(text, index = 0) {
    const element = await this.getElementByText(text);
    await element.atIndex(index).multiTap(2);
  }

  /**
   * Type text into an element identified by ID.
   *
   * @param {string} elementID - ID of the element to type into
   * @param {string} text - Text to be typed into the element
   */
  async typeText(elementID, text) {
    const element = await this.getElementByID(elementID);
    await this.tapByID(elementID);
    await element.typeText(text);
  }

  /**
   * Clear the text field of an element identified by ID.
   *
   * @param {string} elementID - ID of the element to clear
   */
  async clearField(elementID) {
    const element = await this.getElementByID(elementID);
    await element.replaceText('');
  }

  /**
   * Type text into an element and hide the keyboard.
   *
   * @param {string} elementID - ID of the element to type into
   * @param {string} text - Text to be typed into the element
   */
  async typeTextAndHideKeyboard(elementID, text) {
    if (device.getPlatform() === 'android') {
      await this.clearField(elementID);
    }
    await this.typeText(elementID, text + '\n');
  }

  /**
   * Replace the text in the field of an element identified by ID.
   *
   * @param {string} elementID - ID of the element to replace the text in
   * @param {string} text - Text to replace the existing text in the element
   */
  async replaceTextInField(elementID, text) {
    const element = await this.getElementByID(elementID);
    await element.replaceText(text);
  }

  /**
   * Tap an alert button with a specific text.
   *
   * @param {string} text - Text of the alert button to tap
   * @param {number} index - Index of the alert button (default: 0)
   */
  async tapAlertWithButton(text, index = 0) {
    const element = await this.getElementByLabel(text);
    await element.atIndex(index).tap();
  }

  /**
   * Swipe on an element identified by ID.
   *
   * @param {string} elementID - ID of the element to swipe on
   * @param {string} direction - Direction of the swipe (up, down, left, right)
   * @param {string} speed - Speed of the swipe (fast, slow)
   * @param {number} percentage - Percentage of the swipe (0 to 1)
   * @param {number} xStart - X-coordinate to start the swipe
   * @param {number} yStart - Y-coordinate to start the swipe
   */
  async swipe(elementID, direction, speed, percentage, xStart, yStart) {
    const element = await this.getElementByID(elementID);
    await element.swipe(direction, speed, percentage, xStart, yStart);
  }

  /**
   * Swipe on an element by label.
   *
   * @param {string} label - Label of the element to swipe on
   * @param {string} direction - Direction of the swipe (up, down, left, right)
   * @param {string} speed - Speed of the swipe (fast, slow)
   * @param {number} percentage - Percentage of the swipe (0 to 1)
   */
  async swipeByLabel(label, direction, speed, percentage) {
    const element = await this.getElementByLabel(label);
    await element.swipe(direction, speed, percentage);
  }

  /**
   * Swipe on an element by text.
   *
   * @param {string} text - Text of the element to swipe on
   * @param {string} direction - Direction of the swipe (up, down, left, right)
   * @param {string} speed - Speed of the swipe (fast, slow)
   * @param {number} percentage - Percentage of the swipe (0 to 1)
   */
  async swipeByText(text, direction, speed, percentage) {
    const element = await this.getElementByText(text);
    await element.swipe(direction, speed, percentage);
  }

  /**
   * Scroll up to an element identified by ID.
   *
   * @param {string} elementID - ID of the element to scroll up to
   * @param {number} distance - Distance to scroll
   * @param {string} direction - Direction of the scroll (up, down, left, right)
   */
  async scrollUpTo(elementID, distance, direction) {
    const element = await this.getElementByID(elementID);
    await element.scroll(distance, direction);
  }
}

export default Gestures;
