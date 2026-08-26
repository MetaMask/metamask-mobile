import { encapsulated } from './EncapsulatedElement.ts';
import type { AppiumElement } from './AppiumElement.ts';
import AppiumMatchers from './AppiumMatchers.ts';

export type Selector =
  | { testID: string; index?: number }
  | { testIDPattern: RegExp; index?: number }
  | { label: string; index?: number }
  | { text: string; index?: number }
  | { textPattern: RegExp; index?: number }
  | { androidAppiumTestID: string; iosAppiumTestID: string }
  | { androidAppiumTestID: string; iosAppiumXPath: string }
  | { testID: string; iosAppiumTestID: string; index?: number };

/**
 * Resolve a declarative Selector to the Appium Element API.
 */
export function resolve(selector: Selector): Promise<AppiumElement> {
  if ('iosAppiumXPath' in selector) {
    return encapsulated({
      appium: {
        android: () =>
          AppiumMatchers.getElementById(selector.androidAppiumTestID, {
            exact: true,
          }),
        ios: () => AppiumMatchers.getElementByXPath(selector.iosAppiumXPath),
      },
    });
  }

  if ('androidAppiumTestID' in selector) {
    return encapsulated({
      appium: {
        android: () =>
          AppiumMatchers.getElementById(selector.androidAppiumTestID, {
            exact: true,
          }),
        ios: () =>
          AppiumMatchers.getElementByAccessibilityId(selector.iosAppiumTestID),
      },
    });
  }

  if ('iosAppiumTestID' in selector) {
    return encapsulated({
      appium: {
        android: () =>
          AppiumMatchers.getElementById(selector.testID, {
            exact: true,
            index: selector.index,
          }),
        ios: () =>
          AppiumMatchers.getElementByAccessibilityId(selector.iosAppiumTestID, {
            index: selector.index,
          }),
      },
    });
  }

  if ('label' in selector) {
    return encapsulated({
      appium: {
        android: () =>
          AppiumMatchers.getElementByAndroidUIAutomator(
            `.description("${selector.label}")`,
            { index: selector.index ?? 0 },
          ),
        ios: () =>
          AppiumMatchers.getElementByCatchAll(selector.label, {
            index: selector.index ?? 0,
          }),
      },
    });
  }

  if ('text' in selector) {
    return encapsulated({
      appium: () =>
        AppiumMatchers.getElementByText(selector.text, false, {
          index: selector.index ?? 0,
        }),
    });
  }

  if ('textPattern' in selector) {
    return encapsulated({
      appium: () =>
        AppiumMatchers.getElementByText(selector.textPattern, false, {
          index: selector.index ?? 0,
        }),
    });
  }

  if ('testIDPattern' in selector) {
    return encapsulated({
      appium: () =>
        AppiumMatchers.getElementById(selector.testIDPattern, {
          index: selector.index,
        }),
    });
  }

  return encapsulated({
    appium: {
      android: () =>
        AppiumMatchers.getElementById(selector.testID, {
          exact: true,
          index: selector.index,
        }),
      ios: () =>
        AppiumMatchers.getElementByAccessibilityId(selector.testID, {
          index: selector.index,
        }),
    },
  });
}

/**
 * Type guard — true when value is a declarative Selector object.
 */
export function isSelector(value: unknown): value is Selector {
  if (value === null || typeof value !== 'object') return false;
  if (value instanceof Promise) return false;
  const v = value as Record<string, unknown>;
  return (
    'testID' in v ||
    'testIDPattern' in v ||
    'label' in v ||
    'text' in v ||
    'textPattern' in v ||
    'androidAppiumTestID' in v ||
    'iosAppiumTestID' in v ||
    'iosAppiumXPath' in v
  );
}
