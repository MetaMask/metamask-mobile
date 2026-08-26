/**
 * @jest-environment node
 */

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
  type LocatorConfig,
} from './EncapsulatedElement.ts';
import { isSelector } from './Selector.ts';
import type { AppiumElement } from './AppiumElement.ts';
import { resetDeviceInfo, setDeviceInfo } from './DeviceInfoCache.ts';

describe('EncapsulatedElement', () => {
  const createMockAppiumElement = (): AppiumElement =>
    ({
      click: jest.fn(),
      fill: jest.fn(),
      clear: jest.fn(),
    }) as unknown as AppiumElement;

  const windowSize = { width: 390, height: 844 };

  beforeEach(() => {
    jest.clearAllMocks();
    resetDeviceInfo();
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

  describe('EncapsulatedElement.create', () => {
    it('uses a locator function', async () => {
      const mockElement = createMockAppiumElement();
      const config: LocatorConfig = () => Promise.resolve(mockElement);

      await expect(EncapsulatedElement.create(config)).resolves.toBe(
        mockElement,
      );
    });

    it('uses android-specific locator when platform is android', async () => {
      setDeviceInfo('android', windowSize);
      const androidElement = createMockAppiumElement();
      const iosElement = createMockAppiumElement();
      const config: LocatorConfig = {
        android: () => Promise.resolve(androidElement),
        ios: () => Promise.resolve(iosElement),
      };

      await expect(EncapsulatedElement.create(config)).resolves.toBe(
        androidElement,
      );
    });

    it('uses ios-specific locator when platform is ios', async () => {
      setDeviceInfo('ios', windowSize);
      const androidElement = createMockAppiumElement();
      const iosElement = createMockAppiumElement();
      const config: LocatorConfig = {
        android: () => Promise.resolve(androidElement),
        ios: () => Promise.resolve(iosElement),
      };

      await expect(EncapsulatedElement.create(config)).resolves.toBe(
        iosElement,
      );
    });

    it('throws when platform locator is missing', async () => {
      setDeviceInfo('ios', windowSize);
      const config: LocatorConfig = {
        android: () => Promise.resolve(createMockAppiumElement()),
      };

      await expect(EncapsulatedElement.create(config)).rejects.toThrow(
        /Locator for platform 'ios'/,
      );
    });
  });

  describe('encapsulated helper', () => {
    it('delegates to EncapsulatedElement.create', async () => {
      const mockElement = createMockAppiumElement();
      await expect(
        encapsulated(() => Promise.resolve(mockElement)),
      ).resolves.toBe(mockElement);
    });
  });

  describe('isSelector', () => {
    it('returns true for declarative selectors', () => {
      expect(isSelector({ testID: 'foo' })).toBe(true);
      expect(isSelector({ text: 'bar' })).toBe(true);
    });

    it('returns false for promises and plain objects', () => {
      expect(isSelector(Promise.resolve(createMockAppiumElement()))).toBe(
        false,
      );
      expect(isSelector(null)).toBe(false);
      expect(isSelector({ click: jest.fn() })).toBe(false);
    });
  });
});
