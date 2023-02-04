export default class TestHelpers {
  static async waitAndTap(elementId, timeout) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.id(elementId)).tap();
  }

  static tap(elementId) {
    return element(by.id(elementId)).tap();
  }

  static tapByText(text, index) {
    return element(by.text(text))
      .atIndex(index || 0)
      .tap();
  }
  static doubleTapByText(text, index) {
    return element(by.text(text))
      .atIndex(index || 0)
      .multiTap(2);
  }

  static tapAtPoint(elementId, point) {
    return element(by.id(elementId)).tapAtPoint(point);
  }

  static tapItemAtIndex(elementID, index) {
    return element(by.id(elementID))
      .atIndex(index || 0)
      .tap();
  }

  static async typeText(elementId, text) {
    await TestHelpers.tap(elementId);
    return element(by.id(elementId)).typeText(text);
  }

  static async typeNumbers(elementId, text, submitLabel) {
    await element(by.id(elementId)).replaceText(text.replace('\n', ''));
    return element(by.label(submitLabel)).atIndex(0).tap();
  }

  static async typeTextAndHideKeyboard(elementId, text) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.clearField(elementId);
    }
    await TestHelpers.typeText(elementId, text + '\n');
  }

  static async clearField(elementId) {
    return element(by.id(elementId)).replaceText('');
  }

  static async tapAndLongPress(elementId) {
    await TestHelpers.tap(elementId);
    return element(by.id(elementId)).longPress(2000);
  }

  static async tapAndLongPressAtIndex(elementId, index) {
    return element(by.id(elementId, index))
      .atIndex(index || 0)
      .longPress(2000);
  }

  static async replaceTextInField(elementId, text) {
    return element(by.id(elementId)).replaceText(text);
  }

  static tapAlertWithButton(text, index) {
    if (device.getPlatform() === 'android') {
      return element(by.text(text))
        .atIndex(index || 0)
        .tap();
    }

    return element(by.label(text)).atIndex(0).tap();
  }

  static async swipe(elementId, direction, speed, percentage) {
    await element(by.id(elementId)).swipe(direction, speed, percentage);
  }

  static async swipeByText(text, direction, speed, percentage) {
    await element(by.text(text)).swipe(direction, speed, percentage);
  }

  static async scrollTo(scrollviewId, edge) {
    await element(by.id(scrollviewId)).scrollTo(edge);
  }

  static async scrollUpTo(elementId, distance, direction) {
    await element(by.id(elementId)).scroll(distance, direction);
  }

  static async openDeepLink(inputURL) {
    await device.launchApp({
      newInstance: true,
      url: inputURL,
      sourceApp: 'io.metamask',
    });
  }

  static checkIfVisible(elementId) {
    return waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(15000);
  }

  static checkIfNotVisible(elementId) {
    return waitFor(element(by.id(elementId)))
      .toBeNotVisible()
      .withTimeout(10000);
  }

  static checkIfElementWithTextIsNotVisible(text) {
    return expect(element(by.text(text)).atIndex(0)).toBeNotVisible();
  }

  static checkIfExists(elementId) {
    return expect(element(by.id(elementId))).toExist();
  }

  static checkIfHasText(elementId, text) {
    return expect(element(by.id(elementId))).toHaveText(text);
  }

  static checkIfElementWithTextIsVisible(text, index) {
    return expect(element(by.text(text)).atIndex(index || 0)).toBeVisible();
  }

  static checkIfElementByTextIsVisible(text) {
    return waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(25000);
  }

  static checkIfElementHasString(elementID, text) {
    return expect(element(by.id(elementID))).toString(text);
  }

  static checkIfToggleIsOn(elementID) {
    return expect(element(by.id(elementID))).toHaveToggleValue(true);
  }
  static checkIfToggleIsOff(elementID) {
    return expect(element(by.id(elementID))).toHaveToggleValue(false);
  }

  static relaunchApp() {
    return device.launchApp({ newInstance: true });
  }

  static delay(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }
}
