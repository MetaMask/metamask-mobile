import { AppiumElement } from './AppiumElement.ts';
import { PlatformDetector } from './PlatformLocator.ts';

/**
 * Locator strategies supported by the encapsulation layer
 */
export enum LocatorStrategy {
  ID = 'id',
  XPATH = 'xpath',
  TEXT = 'text',
  ACCESSIBILITY_ID = 'accessibilityId',
  ANDROID_UIAUTOMATOR = 'androidUIAutomator',
  IOS_PREDICATE = 'iOSPredicate',
  IOS_CLASS_CHAIN = 'iOSClassChain',
}

/**
 * Platform-specific locator configuration for Appium/WebdriverIO
 */
export interface PlatformLocator {
  strategy: LocatorStrategy;
  locator: string;
}

/**
 * Locator configuration: a single locator function, or per-platform locators.
 */
export type LocatorConfig =
  | (() => Promise<AppiumElement>)
  | {
      android?: () => Promise<AppiumElement>;
      ios?: () => Promise<AppiumElement>;
    };

/**
 * Encapsulated element factory — resolves Appium locators.
 */
export class EncapsulatedElement {
  static create(config: LocatorConfig): Promise<AppiumElement> {
    if (typeof config === 'function') {
      return config();
    }

    const platform = PlatformDetector.getPlatform();
    const platformLocator = config[platform];

    if (!platformLocator) {
      return Promise.reject(
        new Error(
          `Locator for platform '${platform}' is not provided in the configuration`,
        ),
      );
    }

    return platformLocator();
  }
}

/**
 * Helper for creating encapsulated elements (shorthand)
 */
export function encapsulated(config: LocatorConfig): Promise<AppiumElement> {
  return EncapsulatedElement.create(config);
}
