// Mock the logger module BEFORE importing EncapsulatedElement
jest.mock('./logger.ts', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  Logger: jest.fn(),
  LogLevel: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
  },
}));

import {
  EncapsulatedElement,
  LocatorStrategy,
  encapsulated,
  asPlaywrightElement,
  asDetoxElement,
  type LocatorConfig,
} from './EncapsulatedElement.ts';
import { PlatformDetector } from './PlatformLocator.ts';
import { resolve, isSelector } from './Selector.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import { resetDeviceInfo, setDeviceInfo } from './DeviceInfoCache.ts';

// Type augmentation for test globals
declare const global: typeof globalThis & {
  device?: { getPlatform: () => string };
  driver?: { capabilities: Promise<{ platformName?: string }> };
  browser?: { capabilities: Promise<{ platformName?: string }> };
};

describe('EncapsulatedElement', () => {
  // Store original globals
  const originalDevice = global.device;
  const originalDriver = global.driver;
  const originalBrowser = global.browser;

  // Mock factory helpers
  const createMockDetoxElement = (): DetoxElement =>
    ({
      tap: jest.fn(),
      typeText: jest.fn(),
      clearText: jest.fn(),
    }) as unknown as DetoxElement;

  const createMockPlaywrightElement = (): PlaywrightElement =>
    ({
      click: jest.fn(),
      fill: jest.fn(),
      clear: jest.fn(),
    }) as unknown as PlaywrightElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset globals to ensure clean state for each test
    delete (global as Record<string, unknown>).device;
    delete (global as Record<string, unknown>).driver;
    delete (global as Record<string, unknown>).browser;
  });

  afterEach(() => {
    // Restore original globals
    (global as Record<string, unknown>).device = originalDevice;
    (global as Record<string, unknown>).driver = originalDriver;
    (global as Record<string, unknown>).browser = originalBrowser;
  });

  describe('LocatorStrategy', () => {
    it('contains all expected locator strategies', () => {
      expect(LocatorStrategy.ID).toBe('id');
      expect(LocatorStrategy.XPATH).toBe('xpath');
      expect(LocatorStrategy.TEXT).toBe('text');
      expect(LocatorStrategy.ACCESSIBILITY_ID).toBe('accessibilityId');
      expect(LocatorStrategy.ANDROID_UIAUTOMATOR).toBe('androidUIAutomator');
      expect(LocatorStrategy.IOS_PREDICATE).toBe('iOSPredicate');
      expect(LocatorStrategy.IOS_CLASS_CHAIN).toBe('iOSClassChain');
    });
  });

  describe('PlatformDetector', () => {
    beforeEach(() => {
      resetDeviceInfo();
    });

    describe('getPlatform', () => {
      it('returns platform from the device info cache', () => {
        setDeviceInfo('android', { width: 400, height: 800 });

        const result = PlatformDetector.getPlatform();

        expect(result).toBe('android');
      });

      it('returns "android" when Appium device info cache was set to android', () => {
        setDeviceInfo('android', { width: 400, height: 800 });

        const result = PlatformDetector.getPlatform();

        expect(result).toBe('android');
      });

      it('returns "ios" when Appium device info cache was set to ios', () => {
        setDeviceInfo('ios', { width: 390, height: 844 });

        const result = PlatformDetector.getPlatform();

        expect(result).toBe('ios');
      });

      it('throws when Appium device info cache was reset and not repopulated', () => {
        expect(() => PlatformDetector.getPlatform()).toThrow(
          /Device info cache is not initialized/,
        );
      });
    });

    describe('isAndroid', () => {
      it('returns true when platform is android', () => {
        setDeviceInfo('android', { width: 400, height: 800 });

        const result = PlatformDetector.isAndroid();

        expect(result).toBe(true);
      });

      it('returns false when platform is ios', () => {
        setDeviceInfo('ios', { width: 390, height: 844 });

        const result = PlatformDetector.isAndroid();

        expect(result).toBe(false);
      });
    });

    describe('isIOS', () => {
      it('returns true when platform is ios', () => {
        setDeviceInfo('ios', { width: 390, height: 844 });

        const result = PlatformDetector.isIOS();

        expect(result).toBe(true);
      });

      it('returns false when platform is android', () => {
        setDeviceInfo('android', { width: 400, height: 800 });

        const result = PlatformDetector.isIOS();

        expect(result).toBe(false);
      });
    });
  });

  describe('EncapsulatedElement.create', () => {
    describe('Appium context', () => {
      beforeEach(() => {
        resetDeviceInfo();
        setDeviceInfo('android', { width: 400, height: 800 });
      });

      it('returns Appium element when in Appium context with generic locator', async () => {
        const mockPlaywrightElement = createMockPlaywrightElement();
        const config: LocatorConfig = {
          appium: () => Promise.resolve(mockPlaywrightElement),
        };

        const result = await EncapsulatedElement.create(config);

        expect(result).toBe(mockPlaywrightElement);
      });

      it('throws error when Appium config is missing in Appium context', async () => {
        const config: LocatorConfig = {
          detox: () => createMockDetoxElement(),
        };

        await expect(EncapsulatedElement.create(config)).rejects.toThrow(
          'Appium configuration is required when running in Appium context',
        );
      });

      it('uses generic appium locator when provided as function', async () => {
        const mockPlaywrightElement = createMockPlaywrightElement();
        const appiumFn = jest.fn().mockResolvedValue(mockPlaywrightElement);
        const config: LocatorConfig = {
          appium: appiumFn,
        };

        await EncapsulatedElement.create(config);

        expect(appiumFn).toHaveBeenCalledTimes(1);
      });

      it('uses platform-specific appium locator for android', async () => {
        const mockPlaywrightElement = createMockPlaywrightElement();
        const androidFn = jest.fn().mockResolvedValue(mockPlaywrightElement);
        const iosFn = jest.fn();
        const config: LocatorConfig = {
          appium: {
            android: androidFn,
            ios: iosFn,
          },
        };

        await EncapsulatedElement.create(config);

        expect(androidFn).toHaveBeenCalledTimes(1);
        expect(iosFn).not.toHaveBeenCalled();
      });

      it('uses platform-specific appium locator for ios', async () => {
        setDeviceInfo('ios', { width: 390, height: 844 });
        const mockPlaywrightElement = createMockPlaywrightElement();
        const androidFn = jest.fn();
        const iosFn = jest.fn().mockResolvedValue(mockPlaywrightElement);
        const config: LocatorConfig = {
          appium: {
            android: androidFn,
            ios: iosFn,
          },
        };

        await EncapsulatedElement.create(config);

        expect(iosFn).toHaveBeenCalledTimes(1);
        expect(androidFn).not.toHaveBeenCalled();
      });

      it('throws error when platform-specific locator is missing for android', async () => {
        const config: LocatorConfig = {
          appium: {
            ios: () => Promise.resolve(createMockPlaywrightElement()),
          },
        };

        await expect(EncapsulatedElement.create(config)).rejects.toThrow(
          "Appium locator for platform 'android' is not provided in the configuration",
        );
      });

      it('throws error when platform-specific locator is missing for ios', async () => {
        setDeviceInfo('ios', { width: 390, height: 844 });
        const config: LocatorConfig = {
          appium: {
            android: () => Promise.resolve(createMockPlaywrightElement()),
          },
        };

        await expect(EncapsulatedElement.create(config)).rejects.toThrow(
          "Appium locator for platform 'ios' is not provided in the configuration",
        );
      });
    });
  });

  describe('encapsulated helper function', () => {
    it('creates element using EncapsulatedElement.create for Appium', async () => {
      const mockPlaywrightElement = createMockPlaywrightElement();
      const config: LocatorConfig = {
        appium: () => Promise.resolve(mockPlaywrightElement),
      };

      const result = await encapsulated(config);

      expect(result).toBe(mockPlaywrightElement);
    });
  });

  describe('asPlaywrightElement helper function', () => {
    it('returns PlaywrightElement from promise-based EncapsulatedElementType', async () => {
      const mockPlaywrightElement = createMockPlaywrightElement();
      const promiseElement = Promise.resolve(mockPlaywrightElement);

      const result = await asPlaywrightElement(promiseElement);

      expect(result).toBe(mockPlaywrightElement);
    });

    it('awaits and returns element from EncapsulatedElement in Appium context', async () => {
      const mockPlaywrightElement = createMockPlaywrightElement();
      const config: LocatorConfig = {
        appium: () => Promise.resolve(mockPlaywrightElement),
      };
      const element = EncapsulatedElement.create(config);

      const result = await asPlaywrightElement(element);

      expect(result).toBe(mockPlaywrightElement);
    });
  });

  describe('asDetoxElement helper function', () => {
    it('returns DetoxElement from EncapsulatedElementType', () => {
      const mockDetoxElement = createMockDetoxElement();

      const result = asDetoxElement(mockDetoxElement);

      expect(result).toBe(mockDetoxElement);
    });
  });

  describe('isSelector', () => {
    it('returns true for { testID }', () => {
      expect(isSelector({ testID: 'foo' })).toBe(true);
    });

    it('returns true for { testID, index }', () => {
      expect(isSelector({ testID: 'foo', index: 1 })).toBe(true);
    });

    it('returns true for { label }', () => {
      expect(isSelector({ label: 'Submit' })).toBe(true);
    });

    it('returns true for { text }', () => {
      expect(isSelector({ text: 'Cancel' })).toBe(true);
    });

    it('returns true for { detoxTestID, appiumTestID }', () => {
      expect(
        isSelector({ detoxTestID: 'trade', appiumTestID: 'actions' }),
      ).toBe(true);
    });

    it('returns true for { detoxTestID, androidAppiumTestID, iosAppiumTestID }', () => {
      expect(
        isSelector({
          detoxTestID: 'trade',
          androidAppiumTestID: 'actions-android',
          iosAppiumTestID: 'actions-ios',
        }),
      ).toBe(true);
    });

    it('returns true for { testID, iosAppiumTestID }', () => {
      expect(
        isSelector({
          testID: 'wallet-container',
          iosAppiumTestID: 'eye-slash-icon',
        }),
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSelector(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isSelector('some-id')).toBe(false);
    });

    it('returns false for a Promise', () => {
      expect(isSelector(Promise.resolve())).toBe(false);
    });

    it('returns false for a DetoxElement-like object', () => {
      const mockDetoxElement = createMockDetoxElement();
      expect(isSelector(mockDetoxElement)).toBe(false);
    });

    it('returns false for an empty object', () => {
      expect(isSelector({})).toBe(false);
    });
  });

  describe('resolve', () => {
    const createSpyOnEncapsulatedCreate = () =>
      jest.spyOn(EncapsulatedElement, 'create');

    describe('{ testID } — Detox context', () => {
      it('calls EncapsulatedElement.create with detox config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({ testID: 'my-button' });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        spy.mockRestore();
      });
    });

    describe('{ testID } — Appium Android context', () => {
      it('calls EncapsulatedElement.create with android appium config', () => {
        setDeviceInfo('android', { width: 1080, height: 1920 });
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockResolvedValue(createMockPlaywrightElement());

        resolve({ testID: 'my-button' });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof (config.appium as Record<string, unknown>)?.android).toBe(
          'function',
        );
        spy.mockRestore();
        resetDeviceInfo();
      });
    });

    describe('{ testID } — Appium iOS context', () => {
      it('calls EncapsulatedElement.create with ios appium config', () => {
        setDeviceInfo('ios', { width: 390, height: 844 });
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockResolvedValue(createMockPlaywrightElement());

        resolve({ testID: 'my-button' });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof (config.appium as Record<string, unknown>)?.ios).toBe(
          'function',
        );
        spy.mockRestore();
        resetDeviceInfo();
      });
    });

    describe('{ label }', () => {
      it('calls EncapsulatedElement.create with label config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({ label: 'Password Input' });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        spy.mockRestore();
      });
    });

    describe('{ text }', () => {
      it('calls EncapsulatedElement.create with text config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({ text: 'Cancel' });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        spy.mockRestore();
      });
    });

    describe('{ detoxTestID, appiumTestID }', () => {
      it('calls EncapsulatedElement.create with framework-split config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({ detoxTestID: 'trade', appiumTestID: 'actions' });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        spy.mockRestore();
      });
    });

    describe('{ detoxTestID, androidAppiumTestID, iosAppiumTestID }', () => {
      it('calls EncapsulatedElement.create with three-way split config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({
          detoxTestID: 'trade',
          androidAppiumTestID: 'actions-android',
          iosAppiumTestID: 'actions-ios',
        });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        expect(
          typeof (config.appium as { android: unknown; ios: unknown }).android,
        ).toBe('function');
        expect(
          typeof (config.appium as { android: unknown; ios: unknown }).ios,
        ).toBe('function');
        spy.mockRestore();
      });
    });

    describe('{ detoxTestID, androidAppiumTestID, iosAppiumXPath }', () => {
      it('calls EncapsulatedElement.create with ios xpath config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({
          detoxTestID: 'seed-phrase-input',
          androidAppiumTestID: 'seed-phrase-input',
          iosAppiumXPath: '//XCUIElementTypeOther[@name="textfield"]',
        });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        expect(
          typeof (config.appium as { android: unknown; ios: unknown }).android,
        ).toBe('function');
        expect(
          typeof (config.appium as { android: unknown; ios: unknown }).ios,
        ).toBe('function');
        spy.mockRestore();
      });
    });

    describe('{ testID, iosAppiumTestID }', () => {
      it('calls EncapsulatedElement.create with ios-override config', () => {
        const spy = createSpyOnEncapsulatedCreate();
        spy.mockReturnValue(createMockDetoxElement());

        resolve({
          testID: 'wallet-container',
          iosAppiumTestID: 'eye-slash-icon',
        });

        expect(spy).toHaveBeenCalledTimes(1);
        const config = spy.mock.calls[0][0] as LocatorConfig;
        expect(typeof config.detox).toBe('function');
        spy.mockRestore();
      });
    });
  });
});
