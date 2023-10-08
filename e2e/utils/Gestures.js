import Matchers from './Matchers';

/**
 * Class for handling test actions (Gestures), extends Matchers
 */
class Gestures extends Matchers {
  /**
   * Tap an element by ID.
   *
   * @param {string} elementID - ID of the element to tap
   * @return {Promise} - Resolves after tapping the element
   */
  async tapByID(elementID, index = 0) {
    const element = await this.getElementByID(elementID).atIndex(index);
    return element.tap();
  }

  /**
   * Tap an element by text.
   *
   * @param {string} text - Text of the element to tap
   * @return {Promise} - Resolves after tapping the element
   */
  async tapByText(text, index = 0) {
    const element = await this.getElementByText(text).atIndex(index);
    return element.tap();
  }

  /**
   * Tap an element by label.
   *
   * @param {string} label - Label of the element to tap
   * @return {Promise} - Resolves after tapping the element
   */
  async tapByLabel(label, index = 0) {
    const element = await this.getElementByLabel(label).atIndex(index);

    return element.tap();
  }

  async tapWebviewElement(elementID) {
    // this method only words on android: https://wix.github.io/Detox/docs/api/webviews/
    const element = await this.getElementByWebID(elementID);
    return element.tap();
  }

  async tapByDescendentTestID(parentElement, ChildElement) {
    const element = await this.getElementByDescendent(
      parentElement,
      ChildElement,
    );

    return element.tap();
  }

  async tapAndLongPress(elementID, index = 0) {
    const element = await this.getElementByID(elementID).atIndex(index);
    await element.tap();
    return element.longPress(2000);
  }
  async tapAtPoint(elementID, point) {
    const element = await this.getElementByID(elementID);

    return element.tap(point);
  }

  async tapItemAtIndex(elementID, index = 0) {
    const element = await this.getElementByID(elementID).atIndex(index);

    return element(by.id(elementID))
      .atIndex(index || 0)
      .tap();
  }

  async tapItemAtIndexByLabel(elementID, index) {
    return element(by.label(elementID, index))
      .atIndex(index || 0)
      .tap();
  }

  async waitAndTap(elementID, index = 0, timeout = 8000) {
    await waitFor(this.getElementByID(elementID))
      .toBeVisible()
      .withTimeout(timeout);
    return this.tapByID(elementID, index);
  }

  async waitAndTapByLabel(text, timeout, index) {
    await waitFor(element(by.label(text)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.label(text))
      .atIndex(index || 0)
      .tap();
  }

  async waitAndTapText(text, timeout) {
    await waitFor(this.getElementByText(text))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return this.tapByText();
  }

  async doubleTapByText(text, index) {
    return element(by.text(text))
      .atIndex(index || 0)
      .multiTap(2);
  }

  async typeText(elementID, text) {
    await TestHelpers.tap(elementID);
    return element(by.id(elementID)).typeText(text);
  }

  async typeTextAndHideKeyboard(elementID, text) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.clearField(elementID);
    }
    await TestHelpers.typeText(elementID, text + '\n');
  }

  async clearField(elementID) {
    return element(by.id(elementID)).replaceText('');
  }

  async replaceTextInField(elementID, text) {
    return element(by.id(elementID)).replaceText(text);
  }

  async tapAlertWithButton(text, index) {
    if (device.getPlatform() === 'android') {
      return element(by.text(text))
        .atIndex(index || 0)
        .tap();
    }

    return element(by.label(text)).atIndex(0).tap();
  }

  async swipe(elementID, direction, speed, percentage, xStart, yStart) {
    await element(by.id(elementID)).swipe(
      direction,
      speed,
      percentage,
      xStart,
      yStart,
    );
  }
  async swipeByLabel(elementID, direction, speed, percentage) {
    await element(by.label(elementID)).swipe(direction, speed, percentage);
  }

  async swipeByText(text, direction, speed, percentage) {
    await element(by.text(text)).atIndex(0).swipe(direction, speed, percentage);
  }

  async scrollTo(scrollViewId, edge) {
    await element(by.id(scrollViewId)).scrollTo(edge);
  }

  async scrollUpTo(elementID, distance, direction) {
    await element(by.id(elementID)).scroll(distance, direction);
  }
}
export default Gestures;
