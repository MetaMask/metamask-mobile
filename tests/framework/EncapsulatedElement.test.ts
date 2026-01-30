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
  PlatformDetector,
  LocatorStrategy,
  encapsulated,
  asPlaywrightElement,
  asDetoxElement,
  type LocatorConfig,
  FrameworkDetector,
  TestFramework,
} from './index.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';

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
    // Reset FrameworkDetector FIRST to clear any cached framework
    FrameworkDetector.reset();

    // Reset globals to ensure clean state for each test
    delete (global as Record<string, unknown>).device;
    delete (global as Record<string, unknown>).driver;
    delete (global as Record<string, unknown>).browser;
  });

  afterEach(() => {
    // Reset framework detection after each test
    FrameworkDetector.reset();
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

  describe('TestFramework', () => {
    it('contains DETOX and APPIUM values', () => {
      expect(TestFramework.DETOX).toBe('detox');
      expect(TestFramework.APPIUM).toBe('appium');
    });
  });

  describe('FrameworkDetector', () => {
    describe('detect', () => {
      it('returns DETOX when framework is set to DETOX', () => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.DETOX);

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.DETOX);
      });

      it('returns APPIUM when framework is set to APPIUM', () => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.APPIUM);

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });

      it('returns DETOX when device global exists', () => {
        FrameworkDetector.reset();
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('ios'),
        };

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.DETOX);
      });

      it('returns APPIUM when driver global exists', () => {
        FrameworkDetector.reset();
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });

      it('returns APPIUM when browser global exists', () => {
        FrameworkDetector.reset();
        (global as Record<string, unknown>).browser = {
          capabilities: Promise.resolve({ platformName: 'iOS' }),
        };

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });

      it('prioritizes APPIUM when both driver and device globals exist', () => {
        FrameworkDetector.reset();
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('ios'),
        };
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });

      it('returns DETOX as default when no globals are present', () => {
        FrameworkDetector.reset();

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.DETOX);
      });

      it('caches the framework after first detection', () => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        FrameworkDetector.detect();

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });

      it('preserves cached framework across multiple detect calls', () => {
        FrameworkDetector.reset();
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        const firstResult = FrameworkDetector.detect();
        const secondResult = FrameworkDetector.detect();
        const thirdResult = FrameworkDetector.detect();

        expect(firstResult).toBe(TestFramework.APPIUM);
        expect(secondResult).toBe(TestFramework.APPIUM);
        expect(thirdResult).toBe(TestFramework.APPIUM);
      });
    });

    describe('setFramework', () => {
      it('sets framework to DETOX', () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.DETOX);
      });

      it('sets framework to APPIUM', () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });

      it('overrides global-based detection', () => {
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('ios'),
        };
        FrameworkDetector.setFramework(TestFramework.APPIUM);

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.APPIUM);
      });
    });

    describe('reset', () => {
      it('clears cached framework allowing re-detection', () => {
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };
        FrameworkDetector.detect();
        FrameworkDetector.reset();
        delete (global as Record<string, unknown>).driver;
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('ios'),
        };

        const result = FrameworkDetector.detect();

        expect(result).toBe(TestFramework.DETOX);
      });
    });

    describe('isDetox', () => {
      it('returns true when framework is DETOX', () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);

        const result = FrameworkDetector.isDetox();

        expect(result).toBe(true);
      });

      it('returns false when framework is APPIUM', () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);

        const result = FrameworkDetector.isDetox();

        expect(result).toBe(false);
      });
    });

    describe('isAppium', () => {
      it('returns true when framework is APPIUM', () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);

        const result = FrameworkDetector.isAppium();

        expect(result).toBe(true);
      });

      it('returns false when framework is DETOX', () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);

        const result = FrameworkDetector.isAppium();

        expect(result).toBe(false);
      });
    });
  });

  describe('PlatformDetector', () => {
    describe('getPlatform', () => {
      it('returns platform from device.getPlatform() in Detox context', async () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('android'),
        };

        const result = await PlatformDetector.getPlatform();

        expect(result).toBe('android');
      });

      it('returns "android" when Appium capabilities platformName is "Android"', async () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };

        const result = await PlatformDetector.getPlatform();

        expect(result).toBe('android');
      });

      it('returns "ios" when Appium capabilities platformName is "iOS"', async () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'iOS' }),
        };

        const result = await PlatformDetector.getPlatform();

        expect(result).toBe('ios');
      });

      it('returns "ios" when Appium capabilities platformName is undefined', async () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({}),
        };

        const result = await PlatformDetector.getPlatform();

        expect(result).toBe('ios');
      });

      it('throws error when unable to detect platform', async () => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);
        // No driver defined

        await expect(PlatformDetector.getPlatform()).rejects.toThrow(
          'Unable to detect platform',
        );
      });
    });

    describe('isAndroid', () => {
      it('returns true when platform is android', async () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('android'),
        };

        const result = await PlatformDetector.isAndroid();

        expect(result).toBe(true);
      });

      it('returns false when platform is ios', async () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('ios'),
        };

        const result = await PlatformDetector.isAndroid();

        expect(result).toBe(false);
      });
    });

    describe('isIOS', () => {
      it('returns true when platform is ios', async () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('ios'),
        };

        const result = await PlatformDetector.isIOS();

        expect(result).toBe(true);
      });

      it('returns false when platform is android', async () => {
        FrameworkDetector.setFramework(TestFramework.DETOX);
        (global as Record<string, unknown>).device = {
          getPlatform: jest.fn().mockReturnValue('android'),
        };

        const result = await PlatformDetector.isIOS();

        expect(result).toBe(false);
      });
    });
  });

  describe('EncapsulatedElement.create', () => {
    describe('Detox context', () => {
      beforeEach(() => {
        FrameworkDetector.setFramework(TestFramework.DETOX);
      });

      it('returns Detox element when in Detox context', () => {
        const mockDetoxElement = createMockDetoxElement();
        const config: LocatorConfig = {
          detox: () => mockDetoxElement,
        };

        const result = EncapsulatedElement.create(config);

        expect(result).toBe(mockDetoxElement);
      });

      it('throws error when Detox config is missing in Detox context', () => {
        const config: LocatorConfig = {
          appium: () => Promise.resolve(createMockPlaywrightElement()),
        };

        expect(() => EncapsulatedElement.create(config)).toThrow(
          'Detox configuration is required when running in Detox context',
        );
      });

      it('executes Detox locator function to get element', () => {
        const mockDetoxElement = createMockDetoxElement();
        const detoxFn = jest.fn().mockReturnValue(mockDetoxElement);
        const config: LocatorConfig = {
          detox: detoxFn,
        };

        EncapsulatedElement.create(config);

        expect(detoxFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('Appium context', () => {
      beforeEach(() => {
        FrameworkDetector.setFramework(TestFramework.APPIUM);
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
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };
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
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'iOS' }),
        };
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
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'Android' }),
        };
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
        (global as Record<string, unknown>).driver = {
          capabilities: Promise.resolve({ platformName: 'iOS' }),
        };
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
    it('creates element using EncapsulatedElement.create for Detox', () => {
      FrameworkDetector.setFramework(TestFramework.DETOX);
      const mockDetoxElement = createMockDetoxElement();
      const config: LocatorConfig = {
        detox: () => mockDetoxElement,
      };

      const result = encapsulated(config);

      expect(result).toBe(mockDetoxElement);
    });

    it('creates element using EncapsulatedElement.create for Appium', async () => {
      FrameworkDetector.setFramework(TestFramework.APPIUM);
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
      FrameworkDetector.setFramework(TestFramework.APPIUM);
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

    it('returns element from EncapsulatedElement in Detox context', () => {
      FrameworkDetector.setFramework(TestFramework.DETOX);
      const mockDetoxElement = createMockDetoxElement();
      const config: LocatorConfig = {
        detox: () => mockDetoxElement,
      };
      const element = EncapsulatedElement.create(config);

      const result = asDetoxElement(element);

      expect(result).toBe(mockDetoxElement);
    });
  });
});
