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
 * Locator configuration for Appium (platform-generic or per-platform).
 */
export interface LocatorConfig {
  appium:
    | (() => Promise<AppiumElement>)
    | {
        android?: () => Promise<AppiumElement>;
        ios?: () => Promise<AppiumElement>;
      };
}

/**
 * Encapsulated element factory — resolves Appium locators.
 */
export class EncapsulatedElement {
  static create(config: LocatorConfig): Promise<AppiumElement> {
    return this.createAppiumElement(config);
  }

  private static async createAppiumElement(
    config: LocatorConfig,
  ): Promise<AppiumElement> {
    if (!config.appium) {
      throw new Error('Appium configuration is required');
    }

    if (typeof config.appium === 'function') {
      return config.appium();
    }

    const platform = PlatformDetector.getPlatform();
    const platformLocator = config.appium[platform];

    if (!platformLocator) {
      throw new Error(
        `Appium locator for platform '${platform}' is not provided in the configuration`,
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

/**
 * @deprecated Use `Promise<AppiumElement>`. Kept so unmigrated POs keep compiling.
 */
export type EncapsulatedElementType = Promise<AppiumElement>;

/**
 * @deprecated Await the element promise directly. Identity helper for unmigrated call sites.
 */
export async function asPlaywrightElement(
  elem: EncapsulatedElementType,
): Promise<AppiumElement> {
  return elem;
}
