import Selectors from './Selectors';

/**
 * To make a Gesture methods more robust for multiple devices and also
 * multiple screen sizes the advice is to work with percentages instead of
 * actual coordinates. The percentages will calculate the position on the
 * screen based on the SCREEN_SIZE which will be determined once if needed
 * multiple times.
 */
let SCREEN_SIZE;

/**
 * The values in the below object are percentages of the screen
 */
const SWIPE_DIRECTION = {
  down: {
    start: {
      x: 50,
      y: 15,
    },
    end: {
      x: 50,
      y: 85,
    },
  },
  left: {
    start: {
      x: 95,
      y: 50,
    },
    end: {
      x: 5,
      y: 50,
    },
  },
  right: {
    start: {
      x: 5,
      y: 50,
    },
    end: {
      x: 95,
      y: 50,
    },
  },
  up: {
    start: {
      x: 50,
      y: 85,
    },
    end: {
      x: 50,
      y: 15,
    },
  },
};

const Actions = {
  PRESS: 'press',
  LONGPRESS: 'longPress',
  TAP: 'tap',
  MOVETO: 'moveTo',
  WAIT: 'wait',
  RELEASE: 'release',
};

class Gestures {
  static async waitAndTap(element) {
    const elem = await element;
    await elem.waitForDisplayed();
    (await elem).touchAction(Actions.TAP);
  }

  static async tap(element, tapType = 'TAP') {
    // simple touch action on element
    const elem = await element;
    await elem.isDisplayed();
    switch (tapType) {
      case 'TAP':
        (await elem).touchAction(Actions.TAP);
        break;
      case 'LONGPRESS':
        (await elem).touchAction(Actions.LONGPRESS);
        break;
      case 'RELEASE':
        (await elem).touchAction(Actions.RELEASE);
        break;
      case 'WAIT':
        (await elem).touchAction(Actions.WAIT);
        break;
      case 'MOVETO':
        (await elem).touchAction(Actions.MOVETO);
        break;
      default:
        throw new Error('Tap type not found');
    }
  }

  static async tapTextByXpath(text, tapType = 'TAP') {
    const elem = await Selectors.getXpathElementByText(text);
    await elem.waitForDisplayed();
    switch (tapType) {
      case 'TAP':
        await elem.touchAction(Actions.TAP);
        break;
      case 'LONGPRESS':
        await elem.touchAction(Actions.LONGPRESS);
        break;
      case 'RELEASE':
        await elem.touchAction(Actions.RELEASE);
        break;
      default:
        throw new Error('Tap type not found');
    }
  }

  static async tapByTextContaining(text, tapType = 'TAP') {
    const elem = await Selectors.getXpathElementByTextContains(text);
    await elem.isDisplayed();
    switch (tapType) {
      case 'TAP':
        await elem.touchAction(Actions.TAP);
        break;
      case 'LONGPRESS':
        await elem.touchAction(Actions.LONGPRESS);
        break;
      case 'RELEASE':
        await elem.touchAction(Actions.RELEASE);
        break;
      default:
        throw new Error('Tap type not found');
    }
  }

  static async tapByCoordinatesPercentage(
    xAxisPercent,
    yAxisPercentage,
    tapCount = 1,
  ) {
    const { width, height } = await driver.getWindowSize();
    const widthPoint = (width * xAxisPercent) / 100;
    const heightPoint = (height * yAxisPercentage) / 100;
    await driver.touchPerform([
      {
        action: 'tap',
        options: {
          x: widthPoint,
          y: heightPoint,
          count: tapCount,
        },
      },
    ]);
  }

  static async longPress(element, waitTime) {
    const elem = await element;
    (await elem).touchAction([
      Actions.PRESS,
      { action: Actions.WAIT, ms: waitTime },
      Actions.RELEASE,
    ]);
  }

  static async typeText(element, text) {
    const elem = await element;
    await elem.waitForDisplayed();
    (await elem).touchAction(Actions.TAP);
    await elem.clearValue();
    await elem.setValue(text, +'\n');
  }

  static async setValueWithoutTap(element, text) {
    //Some instances typeText above does not work because of tap
    const elem = await element;
    await elem.waitForDisplayed();
    await elem.clearValue();
    await elem.setValue(text, +'\n');
  }

  /**
   * Check if an element is visible and if not wipe up a portion of the screen to
   * check if it visible after x amount of scrolls
   */
  static async checkIfDisplayedWithSwipeUp(element, maxScrolls, amount = 0) {
    // If the element is not displayed and we haven't scrolled the max amount of scrolls
    // then scroll and execute the method again
    const elem = await element;
    if (!(await elem.isDisplayed()) && amount <= maxScrolls) {
      await this.swipeUp(0.85);
      await this.checkIfDisplayedWithSwipeUp(element, maxScrolls, amount + 1);
    } else if (amount > maxScrolls) {
      // If the element is still not visible after the max amount of scroll let it fail
      throw new Error(
        `The element '${element}' could not be found or is not visible.`,
      );
    } // The element was found, proceed with the next action
  }
  /**
   * Swipe down based on a percentage
   */

  static async swipeDown(percentage = 1) {
    await this.swipeOnPercentage(
      this.calculateXY(SWIPE_DIRECTION.down.start, percentage),
      this.calculateXY(SWIPE_DIRECTION.down.end, percentage),
    );
  }
  /**
   * Swipe Up based on a percentage
   */

  static async swipeUp(percentage = 1) {
    await this.swipeOnPercentage(
      this.calculateXY(SWIPE_DIRECTION.up.start, percentage),
      this.calculateXY(SWIPE_DIRECTION.up.end, percentage),
    );
  }
  /**
   * Swipe left based on a percentage
   */

  static async swipeLeft(percentageX = 1, percentageY = 1) {
    await this.swipeOnPercentage(
      this.calculateXY(SWIPE_DIRECTION.left.start, percentageX),
      this.calculateXY(SWIPE_DIRECTION.left.end, percentageY),
    );
  }
  /**
   * Swipe right based on a percentage
   */

  static async swipeRight(percentage = 1) {
    await this.swipeOnPercentage(
      this.calculateXY(SWIPE_DIRECTION.right.start, percentage),
      this.calculateXY(SWIPE_DIRECTION.right.end, percentage),
    );
  }
  /**
   * Swipe from coordinates (from) to the new coordinates (to). The given coordinates are
   * percentages of the screen.
   */

  static async swipeOnPercentage(from, to) {
    // Get the screen size and store it so it can be re-used.
    // This will save a lot of webdriver calls if this methods is used multiple times.
    SCREEN_SIZE = SCREEN_SIZE || (await driver.getWindowSize()); // Get the start position on the screen for the swipe

    const pressOptions = this.getDeviceScreenCoordinates(SCREEN_SIZE, from); // Get the move to position on the screen for the swipe

    const moveToScreenCoordinates = this.getDeviceScreenCoordinates(
      SCREEN_SIZE,
      to,
    );
    await this.swipe(pressOptions, moveToScreenCoordinates);
  }
  /**
   * Swipe from coordinates (from) to the new coordinates (to). The given coordinates are in pixels.
   */

  static async improvedSwipe() {
    // TODO
    const startPercentage = 98;
    const endPercentage = 0;
    const anchorPercentage = 50;

    const { width, height } = await driver.getWindowSize();
    const anchor = (height * anchorPercentage) / 100;
    const startPoint = (width * startPercentage) / 100;
    const endPoint = (width * endPercentage) / 100;
    await driver.touchPerform([
      {
        action: 'press',
        options: {
          x: startPoint,
          y: anchor,
        },
      },
      {
        action: 'wait',
        options: {
          ms: 100,
        },
      },
      {
        action: 'moveTo',
        options: {
          x: endPoint,
          y: anchor,
        },
      },
      {
        action: 'release',
        options: {},
      },
    ]);
  }

  static async swipe(from, to) {
    // TODO
    await driver.performActions([
      {
        // a. Create the event
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          // b. Move finger into start position
          { type: 'pointerMove', duration: 0, x: from.x, y: from.y },
          // c. Finger comes down into contact with screen
          { type: 'pointerDown', button: 0 },
          // d. Pause for a little bit
          { type: 'pause', duration: 100 },
          // e. Finger moves to end position
          //    We move our finger from the center of the element to the
          //    starting position of the element.
          //    Play with the duration to make the swipe go slower / faster
          { type: 'pointerMove', duration: 1000, x: to.x, y: to.y },
          // f. Finger gets up, off the screen
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    // Add a pause, just to make sure the swipe is done
    await driver.pause(1000);
  }
  /**
   * Get the screen coordinates based on a device his screen size
   */

  static getDeviceScreenCoordinates(screenSize, coordinates) {
    return {
      x: Math.round(screenSize.width * (coordinates.x / 100)),
      y: Math.round(screenSize.height * (coordinates.y / 100)),
    };
  }
  /**
   * Calculate the x y coordinates based on a percentage
   */

  static calculateXY({ x, y }, percentage) {
    return {
      x: x * percentage,
      y: y * percentage,
    };
  }
}

export default Gestures;
