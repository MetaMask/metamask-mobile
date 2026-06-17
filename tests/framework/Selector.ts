import {
  encapsulated,
  type EncapsulatedElementType,
} from './EncapsulatedElement.ts';
import PlaywrightMatchers from './PlaywrightMatchers.ts';

export type Selector =
  | { testID: string; index?: number }
  | { testIDPattern: RegExp; index?: number }
  | { label: string; index?: number }
  | { text: string; index?: number }
  | { textPattern: RegExp; index?: number }
  | { detoxTestID: string; appiumTestID: string }
  | {
      detoxTestID: string;
      androidAppiumTestID: string;
      iosAppiumTestID: string;
    }
  | {
      detoxTestID: string;
      androidAppiumTestID: string;
      iosAppiumXPath: string;
    }
  | { testID: string; iosAppiumTestID: string; index?: number };

/**
 * Moves `encapsulated()` to a single location so page-objects can use declarative Selectors without importing encapsulated() or LocatorConfig.
 * This can also be used in the original Matchers, Assertions, and Gestures methods that currently return DetoxElements to make them cross-framework compatible without page-object changes.
 */
export function resolve(selector: Selector): EncapsulatedElementType {
  if ('iosAppiumXPath' in selector) {
    return encapsulated({
      detox: () =>
        element(by.id(selector.detoxTestID)) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(selector.androidAppiumTestID, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(selector.iosAppiumXPath),
      },
    });
  }

  if ('androidAppiumTestID' in selector) {
    return encapsulated({
      detox: () =>
        element(by.id(selector.detoxTestID)) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(selector.androidAppiumTestID, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            selector.iosAppiumTestID,
          ),
      },
    });
  }

  if ('detoxTestID' in selector) {
    return encapsulated({
      detox: () =>
        element(by.id(selector.detoxTestID)) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(selector.appiumTestID, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(selector.appiumTestID),
      },
    });
  }

  if ('iosAppiumTestID' in selector) {
    const detoxEl = () => {
      const el = element(by.id(selector.testID));
      return (selector.index !== undefined
        ? el.atIndex(selector.index)
        : el) as unknown as DetoxElement;
    };
    return encapsulated({
      detox: detoxEl,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(selector.testID, {
            exact: true,
            index: selector.index,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            selector.iosAppiumTestID,
            { index: selector.index },
          ),
      },
    });
  }

  if ('label' in selector) {
    return encapsulated({
      detox: () =>
        element(by.label(selector.label)).atIndex(
          selector.index ?? 0,
        ) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            `.description("${selector.label}")`,
            { index: selector.index ?? 0 },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(selector.label, {
            index: selector.index ?? 0,
          }),
      },
    });
  }

  if ('text' in selector) {
    return encapsulated({
      detox: () =>
        element(by.text(selector.text)).atIndex(
          selector.index ?? 0,
        ) as unknown as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementByText(selector.text, false, {
          index: selector.index ?? 0,
        }),
    });
  }

  if ('textPattern' in selector) {
    return encapsulated({
      detox: () =>
        element(by.text(selector.textPattern)).atIndex(
          selector.index ?? 0,
        ) as unknown as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementByText(selector.textPattern, false, {
          index: selector.index ?? 0,
        }),
    });
  }

  if ('testIDPattern' in selector) {
    const detoxEl = () => {
      const el = element(by.id(selector.testIDPattern));
      return (selector.index !== undefined
        ? el.atIndex(selector.index)
        : el) as unknown as DetoxElement;
    };
    return encapsulated({
      detox: detoxEl,
      appium: () =>
        PlaywrightMatchers.getElementById(selector.testIDPattern, {
          index: selector.index,
        }),
    });
  }

  // { testID } — the most common case
  const detoxEl = () => {
    const el = element(by.id(selector.testID));
    return (selector.index !== undefined
      ? el.atIndex(selector.index)
      : el) as unknown as DetoxElement;
  };
  return encapsulated({
    detox: detoxEl,
    appium: {
      android: () =>
        PlaywrightMatchers.getElementById(selector.testID, {
          exact: true,
          index: selector.index,
        }),
      ios: () =>
        PlaywrightMatchers.getElementByAccessibilityId(selector.testID, {
          index: selector.index,
        }),
    },
  });
}

/**
 * Type guard — returns true when value is a declarative Selector object
 * rather than an EncapsulatedElementType (DetoxElement or Promise<PlaywrightElement>).
 *
 * Used by UnifiedGestures to accept either Selector or EncapsulatedElementType.
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
    'detoxTestID' in v ||
    'androidAppiumTestID' in v ||
    'iosAppiumTestID' in v ||
    'iosAppiumXPath' in v
  );
}
