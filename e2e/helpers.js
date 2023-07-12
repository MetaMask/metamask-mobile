import { waitFor, web } from 'detox';
export default class TestHelpers {
  static async waitAndTap(elementId, timeout, index) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.id(elementId))
      .atIndex(index || 0)
      .tap();
  }

  static async waitAndTapText(text, timeout) {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.text(text)).tap();
  }

  static tap(elementId) {
    return element(by.id(elementId)).tap();
  }
  static tapByDescendentTestID(parentElement, ChildElement) {
    return element(
      by.id(parentElement).withDescendant(by.id(ChildElement)),
    ).tap();
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
    return element(by.id(elementId)).tap(point);
  }

  static tapItemAtIndex(elementID, index) {
    return element(by.id(elementID))
      .atIndex(index || 0)
      .tap();
  }

  static tapItemAtIndexByLabel(elementID, index) {
    return element(by.label(elementID, index))
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
    return element(by.id(elementId))
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
  static async waitAndTapByLabel(text, timeout, index) {
    await waitFor(element(by.label(text)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.label(text))
      .atIndex(index || 0)
      .tap();
  }

  static async tapWebviewElement(elementId) {
    // this method only words on android: https://wix.github.io/Detox/docs/api/webviews/
    return web.element(by.web.id(elementId)).tap();
  }

  static async swipe(elementId, direction, speed, percentage, xStart, yStart) {
    await element(by.id(elementId)).swipe(
      direction,
      speed,
      percentage,
      xStart,
      yStart,
    );
  }
  static async swipeByLabel(elementId, direction, speed, percentage) {
    await element(by.label(elementId)).swipe(direction, speed, percentage);
  }

  static async swipeByText(text, direction, speed, percentage) {
    await element(by.text(text)).atIndex(0).swipe(direction, speed, percentage);
  }

  static async scrollTo(scrollViewId, edge) {
    await element(by.id(scrollViewId)).scrollTo(edge);
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

  static async checkIfVisible(elementId) {
    return await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(15000);
  }

  static async checkIfNotVisible(elementId) {
    return await waitFor(element(by.id(elementId)))
      .not.toBeVisible()
      .withTimeout(10000);
  }

  static async checkIfElementWithTextIsNotVisible(text) {
    return await expect(element(by.text(text)).atIndex(0)).not.toBeVisible();
  }

  static async checkIfExists(elementId) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(10000);
    return expect(element(by.id(elementId))).toExist();
  }

  static async checkIfHasText(elementId, text) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(10000);

    return expect(element(by.id(elementId))).toHaveText(text);
  }

  static async checkIfElementWithTextIsVisible(text, index) {
    return await waitFor(element(by.text(text)).atIndex(index || 0))
      .toBeVisible()
      .withTimeout(10000);
  }

  static async checkIfElementByTextIsVisible(text) {
    return await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(25000);
  }

  static async checkIfElementHasString(elementID, text) {
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

  static async retry(maxAttempts, testLogic) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await testLogic();
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        } else {
          // eslint-disable-next-line no-console
          console.log('Test attempt failed', {
            attempt,
            error,
          });
        }
      }
    }
  }
}
