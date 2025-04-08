import { waitFor, web, system } from 'detox';
import {
  getFixturesServerPort,
  getGanachePort,
  getLocalTestDappPort,
  getMockServerPort,
} from './fixtures/utils';
import Utilities from './utils/Utilities';
import { resolveConfig } from 'detox/internals';

export default class TestHelpers {
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async waitAndTap(elementId, timeout, index) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.id(elementId))
      .atIndex(index || 0)
      .tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async waitAndTapText(text, timeout) {
    await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout || 8000);

    return element(by.text(text)).tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static tap(elementId) {
    return element(by.id(elementId)).tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static tapByDescendentTestID(parentElement, ChildElement) {
    return element(
      by.id(parentElement).withDescendant(by.id(ChildElement)),
    ).tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static tapByText(text, index) {
    return element(by.text(text))
      .atIndex(index || 0)
      .tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static doubleTapByText(text, index) {
    return element(by.text(text))
      .atIndex(index || 0)
      .multiTap(2);
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static tapAtPoint(elementId, point) {
    return element(by.id(elementId)).tap(point);
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static tapItemAtIndex(elementID, index) {
    return element(by.id(elementID))
      .atIndex(index || 0)
      .tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static tapItemAtIndexByLabel(elementID, index) {
    return element(by.label(elementID, index))
      .atIndex(index || 0)
      .tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async typeText(elementId, text) {
    await TestHelpers.tap(elementId);
    return element(by.id(elementId)).typeText(text);
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async typeNumbers(elementId, text, submitLabel) {
    await element(by.id(elementId)).replaceText(text.replace('\n', ''));
    return element(by.label(submitLabel)).atIndex(0).tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async typeTextAndHideKeyboard(elementId, text) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.clearField(elementId);
    }
    await TestHelpers.typeText(elementId, text + '\n');
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async clearField(elementId) {
    return element(by.id(elementId)).replaceText('');
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async tapAndLongPress(elementId) {
    await TestHelpers.tap(elementId);
    return element(by.id(elementId)).longPress(2000);
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async tapAndLongPressAtIndex(elementId, index) {
    return element(by.id(elementId))
      .atIndex(index || 0)
      .longPress(2000);
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async replaceTextInField(elementId, text) {
    return element(by.id(elementId)).replaceText(text);
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */

  static tapAlertWithButton(text, index) {
    if (device.getPlatform() === 'android') {
      return element(by.text(text))
        .atIndex(index || 0)
        .tap();
    }

    return element(by.label(text)).atIndex(0).tap();
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async waitAndTapByLabel(text, timeout, index) {
    await waitFor(element(by.label(text)))
      .toBeVisible()
      .withTimeout(timeout || 15000);

    return element(by.label(text))
      .atIndex(index || 0)
      .tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async tapWebviewElement(elementId) {
    // this method only words on android: https://wix.github.io/Detox/docs/api/webviews/
    return web.element(by.web.id(elementId)).tap();
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async swipe(elementId, direction, speed, percentage, xStart, yStart) {
    await element(by.id(elementId)).swipe(
      direction,
      speed,
      percentage,
      xStart,
      yStart,
    );
  }
  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async swipeByLabel(elementId, direction, speed, percentage) {
    await element(by.label(elementId)).swipe(direction, speed, percentage);
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async swipeByText(text, direction, speed, percentage) {
    await element(by.text(text)).atIndex(0).swipe(direction, speed, percentage);
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async scrollTo(scrollViewId, edge) {
    await element(by.id(scrollViewId)).scrollTo(edge);
  }

  /**
   * @deprecated Use Guestures Class to accomplish this.
   */
  static async scrollUpTo(elementId, distance, direction) {
    await element(by.id(elementId)).scroll(distance, direction);
  }

  static async openDeepLink(inputURL) {
    await device.launchApp({
      newInstance: true,
      url: inputURL,
      sourceApp: 'io.metamask',
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        detoxURLBlacklistRegex: Utilities.BlacklistURLs,
      },
    });
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfVisible(elementId) {
    return await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(15000);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfNotVisible(elementId) {
    return await waitFor(element(by.id(elementId)))
      .not.toBeVisible()
      .withTimeout(10000);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfElementWithTextIsNotVisible(text) {
    return await expect(element(by.text(text)).atIndex(0)).not.toBeVisible();
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfElementNotToHaveText(elementId, text) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(10000);

    return expect(element(by.id(elementId))).not.toHaveText(text);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfExists(elementId) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(10000);
    return expect(element(by.id(elementId))).toExist();
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfHasText(elementId, text) {
    await waitFor(element(by.id(elementId)))
      .toBeVisible()
      .withTimeout(10000);

    return expect(element(by.id(elementId))).toHaveText(text);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfElementWithTextIsVisible(text, index) {
    return await waitFor(element(by.text(text)).atIndex(index || 0))
      .toBeVisible()
      .withTimeout(10000);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfElementByTextIsVisible(text, timeout = 25000) {
    return await waitFor(element(by.text(text)))
      .toBeVisible()
      .withTimeout(timeout);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async checkIfElementHasString(elementID, text) {
    return expect(element(by.id(elementID))).toString(text);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static checkIfToggleIsOn(elementID) {
    return expect(element(by.id(elementID))).toHaveToggleValue(true);
  }

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static checkIfToggleIsOff(elementID) {
    return expect(element(by.id(elementID))).toHaveToggleValue(false);
  }

  static relaunchApp() {
    return this.launchApp({
      newInstance: true,
      launchArgs: {
        detoxURLBlacklistRegex: Utilities.BlacklistURLs,
      },
    });
  }

  static delay(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  } // Detox has no waits for webview elements visibility. Here is the custom one.

  /**
   * @deprecated Use Assertion Class to accomplish this.
   */
  static async waitForWebElementToBeVisibleById(elementId, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await expect(web.element(by.web.id(elementId))).toExist(); // Element found
        return;
      } catch {
        // Element not found yet: waiting for 200ms
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    throw new Error('Element with ' + elementId + ' not found');
  }
  /**
   * @deprecated Use Assertion Class to accomplish this.
   */

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

  static async reverseServerPort() {
    if (device.getPlatform() === 'android') {
      await device.reverseTcpPort(getGanachePort());
      await device.reverseTcpPort(getFixturesServerPort());
      await device.reverseTcpPort(getLocalTestDappPort());
      await device.reverseTcpPort(getMockServerPort());
    }
  }

  static async launchApp(launchOptions) {
    const config = await resolveConfig();
    const platform = device.getPlatform();
    if (config.configurationName.endsWith('debug')) {
      return this.launchAppForDebugBuild(platform, launchOptions);
    }

    return device.launchApp(launchOptions);
  }

  static async launchAppForDebugBuild(platform, launchOptions) {
    const deepLinkUrl = this.getDeepLinkUrl(
      this.getDevLauncherPackagerUrl(platform),
    );

    if (platform === 'ios') {
      await device.launchApp(launchOptions);
      return device.openURL({
        url: deepLinkUrl,
      });
    }

    return device.launchApp({
      url: deepLinkUrl,
      ...launchOptions,
    });
  }

  static getDeepLinkUrl(url) {
    return `expo-metamask://expo-development-client/?url=${encodeURIComponent(
      url,
    )}`;
  }

  static getDevLauncherPackagerUrl(platform) {
    return `http://localhost:8081/index.bundle?platform=${platform}&dev=true&minify=false&disableOnboarding=1`;
  }
}
