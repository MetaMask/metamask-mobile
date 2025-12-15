import { PlaywrightElement } from './PlaywrightAdapter';
import { FrameworkDetector } from './FrameworkDetector';
import { PlatformDetector } from './PlatformLocator';

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
 * Complete locator configuration for both Detox and Appium/WebdriverIO
 *
 * @example
 * Provide specific platform locators for appium
 * {
 *   detox: () => Matchers.getElementByID('MY_TEST_ID'),
 *   appium: {
 *     android: () => PlaywrightMatchers.getByXPath('//*[@resource-id="MY_TEST_ID"]'),
 *     ios: () => PlaywrightMatchers.getByAccessibilityId('MY_TEST_ID')
 *   }
 * }
 *
 * @example
 * Provide a generic locator for appium
 * {
 *   detox: () => Matchers.getElementByID('MY_TEST_ID'),
 *   appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="MY_TEST_ID"]')
 * }
 */
export interface LocatorConfig {
  detox?: () => DetoxElement;
  appium?:
    | (() => Promise<PlaywrightElement>)
    | {
        android?: () => Promise<PlaywrightElement>;
        ios?: () => Promise<PlaywrightElement>;
      };
}

/**
 * Unified element type that can be either DetoxElement or PlaywrightElement
 * Note: Both types are Promise-based
 */
export type EncapsulatedElementType = DetoxElement | Promise<PlaywrightElement>;

/**
 * Encapsulated element factory - creates appropriate element based on framework context
 */
export class EncapsulatedElement {
  /**
   * Create an encapsulated element from locator configuration
   *
   * @param config - Locator configuration for both Detox and Appium
   * @returns DetoxElement or Promise<PlaywrightElement> based on current framework
   *
   * @example
   * // Using existing Matchers helpers for Detox with generic Appium locator
   * get passwordInput(): EncapsulatedElementType {
   *   return EncapsulatedElement.create({
   *     detox: () => Matchers.getElementByID('login-password-input'),
   *     appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="login-password-input"]')
   *   });
   * }
   *
   * @example
   * // Using text locator with generic Appium
   * get unlockButton(): EncapsulatedElementType {
   *   return EncapsulatedElement.create({
   *     detox: () => Matchers.getElementByText('Unlock'),
   *     appium: () => PlaywrightMatchers.getByText('Unlock')
   *   });
   * }
   *
   * @example
   * // Using platform-specific Appium locators
   * get submitButton(): EncapsulatedElementType {
   *   return EncapsulatedElement.create({
   *     detox: () => Matchers.getElementByID('submit-button'),
   *     appium: {
   *       android: () => PlaywrightMatchers.getByXPath('//*[@resource-id="submit-button"]'),
   *       ios: () => PlaywrightMatchers.getByAccessibilityId('submit-button')
   *     }
   *   });
   * }
   */
  static create(config: LocatorConfig): EncapsulatedElementType {
    if (FrameworkDetector.isDetox()) {
      return this.createDetoxElement(config);
    }
    if (FrameworkDetector.isAppium()) {
      return this.createAppiumElement(config);
    }
    throw new Error('Unable to create encapsulated element');
  }

  /**
   * Create Detox element from configuration
   */
  private static createDetoxElement(config: LocatorConfig): DetoxElement {
    if (!config.detox) {
      throw new Error(
        'Detox configuration is required when running in Detox context',
      );
    }

    // Execute the function to get the DetoxElement
    return config.detox();
  }

  /**
   * Create Appium/WebdriverIO element from configuration
   */
  private static async createAppiumElement(
    config: LocatorConfig,
  ): Promise<PlaywrightElement> {
    if (!config.appium) {
      throw new Error(
        'Appium configuration is required when running in Appium context',
      );
    }

    // If appium is a function, use it as a generic locator
    if (typeof config.appium === 'function') {
      return config.appium();
    }

    // Otherwise, it's a platform-specific configuration
    const platform = await PlatformDetector.getPlatform();
    const platformLocator = config.appium[platform];

    if (!platformLocator) {
      throw new Error(
        `Appium locator for platform '${platform}' is not provided in the configuration`,
      );
    }

    // Execute the platform-specific function to get the Promise<PlaywrightElement>
    return platformLocator();
  }
}

/**
 * Helper function for creating encapsulated elements (shorthand)
 */
export function encapsulated(config: LocatorConfig): EncapsulatedElementType {
  return EncapsulatedElement.create(config);
}

/**
 * Type helper for WebdriverIO tests - returns the PlaywrightElement from the EncapsulatedElementType
 *
 * @example
 * const passwordInput = await asPlaywrightElement(EncapsulatedElement.create({
 *   detox: () => Matchers.getElementByID('login-password-input'),
 *   appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="login-password-input"]')
 * }));
 * await passwordInput.fill('my password');
 *
 * @returns PlaywrightElement
 */
export async function asPlaywrightElement(
  element: EncapsulatedElementType,
): Promise<PlaywrightElement> {
  return (await element) as PlaywrightElement;
}

/**
 * Type helper for Detox tests - returns the DetoxElement from the EncapsulatedElementType
 *
 * @example
 * const passwordInput = await asDetoxElement(EncapsulatedElement.create({
 *   detox: () => Matchers.getElementByID('login-password-input'),
 *   appium: () => PlaywrightMatchers.getByXPath('//*[@resource-id="login-password-input"]')
 * }));
 * await Gestures.typeText(passwordInput, 'my password');
 *
 * @returns DetoxElement
 */
export function asDetoxElement(element: EncapsulatedElementType): DetoxElement {
  return element as DetoxElement;
}
