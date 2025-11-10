import { createLogger } from '../../e2e/framework/logger';
import { ChainablePromiseArray, ChainablePromiseElement } from 'webdriverio';
import Utilities from '../../e2e/framework/Utilities';

const logger = createLogger({ name: 'WDIOGestures' });

/**
 * Appium Gestures class with element stability and auto-retry
 */
export default class WDIOGestures {
  static async tapWithChecks(
    elem: Promise<ChainablePromiseElement>,
    options: {
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
      elemDescription?: string;
      delay?: number;
      waitForElementToDisappear?: boolean;
    },
  ): Promise<void> {
    const {
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
    } = options;

    logger.debug('tapWithChecks', {
      checkStability,
      checkVisibility,
      checkEnabled,
      elemDescription,
    });

    if (checkVisibility) {
      const fn = async () => await (await elem).waitForDisplayed();
      await Utilities.executeWithRetry(fn, {
        timeout: 10000,
        interval: 500,
        description: 'Element is not visible: ' + elemDescription,
      });
    }

    if (checkEnabled) {
      const fn = async () => await (await elem).waitForEnabled();
      await Utilities.executeWithRetry(fn, {
        timeout: 10000,
        interval: 500,
        description: 'Element is not enabled: ' + elemDescription,
      });
    }

    if (checkStability) {
      const fn = async () => await (await elem).waitForStable();
      await Utilities.executeWithRetry(fn, {
        timeout: 10000,
        interval: 500,
        description: 'Element is not stable: ' + elemDescription,
      });
    }

    const fn = async () => await (await elem).tap();
    await Utilities.executeWithRetry(fn, {
      timeout: 10000,
      interval: 500,
      description: 'Element is not tapped: ' + elemDescription,
    });
  }

  static async waitAndTap(
    elem: Promise<ChainablePromiseElement>,
    options: {
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
      elemDescription?: string;
      delay?: number;
      waitForElementToDisappear?: boolean;
    },
  ): Promise<void> {
    const { delay = 500 } = options;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return await this.tapWithChecks(elem, options);
  }

  static async tapAtIndex(
    elem: ChainablePromiseArray,
    index: number,
    options: {
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
      elemDescription?: string;
      delay?: number;
      waitForElementToDisappear?: boolean;
    },
  ): Promise<void> {
    await this.waitAndTap(Promise.resolve(elem[index]), options);
  }
}
