import FontPreloader from '../FontPreloader';
import { Platform } from 'react-native';

/**
 * Test utilities for FontPreloader tests
 * Provides reusable mocking patterns to reduce code duplication
 */

type MockSetTimeoutCallback = () => void;
type MockSetTimeout = jest.MockedFunction<typeof setTimeout> & {
  __promisify__: typeof setTimeout.__promisify__;
};

/**
 * Creates a mock setTimeout that executes callbacks immediately
 */
const createImmediateSetTimeoutMock = (): MockSetTimeout => {
  const mockFn = jest
    .fn()
    .mockImplementation((callback: MockSetTimeoutCallback) => {
      callback();
      return 123 as unknown as NodeJS.Timeout;
    });

  // Add the __promisify__ property to satisfy Node.js setTimeout type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockFn as any).__promisify__ = jest.fn();

  return mockFn as unknown as MockSetTimeout;
};

/**
 * Creates a mock setTimeout that captures callback for manual execution
 */
const createControlledSetTimeoutMock = (): {
  mockSetTimeout: MockSetTimeout;
  executeCallback: () => void;
} => {
  let capturedCallback: MockSetTimeoutCallback | undefined;

  const mockFn = jest
    .fn()
    .mockImplementation((callback: MockSetTimeoutCallback) => {
      capturedCallback = callback;
      return 123 as unknown as NodeJS.Timeout;
    });

  // Add the __promisify__ property to satisfy Node.js setTimeout type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockFn as any).__promisify__ = jest.fn();

  const executeCallback = () => {
    if (capturedCallback) {
      capturedCallback();
    }
  };

  return {
    mockSetTimeout: mockFn as unknown as MockSetTimeout,
    executeCallback,
  };
};

/**
 * Creates a comprehensive DOM mock for web platform tests
 */
const createWebDOMMock = (
  options: {
    fontLoadSuccess?: boolean;
    hasFontAPI?: boolean;
    hasBody?: boolean;
  } = {},
) => {
  const { fontLoadSuccess = true, hasFontAPI = true, hasBody = true } = options;

  const mockSpan = {
    style: {} as CSSStyleDeclaration,
    textContent: '',
  };

  const mockContainer = {
    style: {} as CSSStyleDeclaration,
    appendChild: jest.fn(),
  };

  const mockDocument = {
    createElement: jest.fn().mockImplementation((tag: string) => {
      if (tag === 'div') return mockContainer;
      if (tag === 'span') return mockSpan;
      return {};
    }),
    body: hasBody
      ? {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        }
      : null,
    ...(hasFontAPI && {
      fonts: {
        load: jest
          .fn()
          .mockImplementation(() =>
            fontLoadSuccess
              ? Promise.resolve(true)
              : Promise.reject(new Error('Font load failed')),
          ),
      },
    }),
  };

  return {
    mockDocument,
    mockContainer,
    mockSpan,
  };
};

/**
 * Sets up platform OS and restores it after test
 */
const withPlatform = (os: 'ios' | 'android' | 'web') => {
  const originalOS = Platform.OS;

  return {
    setup: () => {
      (Platform as unknown as { OS: string }).OS = os;
    },
    restore: () => {
      (Platform as unknown as { OS: string }).OS = originalOS;
    },
  };
};

/**
 * Sets up setTimeout mock and restores original after test
 */
const withSetTimeoutMock = (mockImpl: MockSetTimeout) => {
  const originalSetTimeout = global.setTimeout;

  return {
    setup: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.setTimeout = mockImpl as any;
    },
    restore: () => {
      global.setTimeout = originalSetTimeout;
    },
  };
};

/**
 * Helper to verify platform-specific timeout delays
 */
const expectPlatformDelay = (
  mockSetTimeout: MockSetTimeout,
  platform: 'ios' | 'android',
) => {
  const expectedDelay = platform === 'ios' ? 50 : 100;
  expect(mockSetTimeout).toHaveBeenCalledWith(
    expect.any(Function),
    expectedDelay,
  );
};

// Mock Logger to avoid console output during tests
jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock Platform for React Native - will be overridden per test
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock getFontFamily
jest.mock(
  '../../../component-library/components/Texts/Text/Text.utils',
  () => ({
    getFontFamily: jest.fn((_variant) => `Geist Regular`),
  }),
);

describe('FontPreloader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as unknown as { OS: string }).OS = 'ios';
  });

  afterEach(() => {
    FontPreloader.reset();
  });

  describe('Core functionality', () => {
    it('should be a singleton', () => {
      const instance1 = FontPreloader;
      const instance2 = FontPreloader;
      expect(instance1).toBe(instance2);
    });

    it('should track font loading state correctly', async () => {
      // Initially not loaded
      FontPreloader.reset();
      expect(FontPreloader.areFontsLoaded()).toBe(false);

      // Load fonts
      const mockSetTimeout = createImmediateSetTimeoutMock();
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      await FontPreloader.preloadFonts();
      expect(FontPreloader.areFontsLoaded()).toBe(true);

      // Reset state
      FontPreloader.reset();
      expect(FontPreloader.areFontsLoaded()).toBe(false);

      timeoutMocker.restore();
    });

    it('should not reload fonts if already loaded', async () => {
      FontPreloader.reset();

      const mockSetTimeout = createImmediateSetTimeoutMock();
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      // First load
      await FontPreloader.preloadFonts();
      expect(FontPreloader.areFontsLoaded()).toBe(true);

      // Second load should not call setTimeout again
      mockSetTimeout.mockClear();
      await FontPreloader.preloadFonts();
      expect(mockSetTimeout).not.toHaveBeenCalled();
      expect(FontPreloader.areFontsLoaded()).toBe(true);

      timeoutMocker.restore();
    });

    it('should return same promise for concurrent loading attempts', async () => {
      FontPreloader.reset();

      const { mockSetTimeout, executeCallback } =
        createControlledSetTimeoutMock();
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      // Make concurrent calls - should return same promise
      const promise1 = FontPreloader.preloadFonts();
      const promise2 = FontPreloader.preloadFonts();
      const promise3 = FontPreloader.preloadFonts();

      expect(promise1).toBe(promise2);
      expect(promise2).toBe(promise3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);

      // Clean up
      executeCallback();
      await promise1;
      timeoutMocker.restore();
    });

    it('should provide access to loading promise', async () => {
      FontPreloader.reset();

      const { mockSetTimeout, executeCallback } =
        createControlledSetTimeoutMock();
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      const loadingPromise = FontPreloader.preloadFonts();
      const retrievedPromise = FontPreloader.getLoadingPromise();

      expect(retrievedPromise).toBe(loadingPromise);

      executeCallback();
      await loadingPromise;
      timeoutMocker.restore();
    });
  });

  describe('Platform-specific behavior', () => {
    it.each([
      ['ios', 50],
      ['android', 100],
    ])(
      'should use correct timing for %s platform',
      async (platform, expectedDelay) => {
        const platformMocker = withPlatform(platform as 'ios' | 'android');
        platformMocker.setup();
        FontPreloader.reset();

        const mockFn = jest
          .fn()
          .mockImplementation((callback: () => void, delay: number) => {
            expect(delay).toBe(expectedDelay);
            callback();
            return 123 as unknown as NodeJS.Timeout;
          });
        // Add the __promisify__ property to satisfy Node.js setTimeout type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockFn as any).__promisify__ = jest.fn();
        const mockSetTimeout = mockFn as unknown as MockSetTimeout;
        const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
        timeoutMocker.setup();

        await FontPreloader.preloadFonts();

        expect(FontPreloader.areFontsLoaded()).toBe(true);
        expectPlatformDelay(mockSetTimeout, platform as 'ios' | 'android');

        timeoutMocker.restore();
        platformMocker.restore();
      },
    );
  });

  describe('Web platform', () => {
    beforeEach(() => {
      (Platform as unknown as { OS: string }).OS = 'web';
    });

    it('should preload fonts using FontFace API when available', async () => {
      FontPreloader.reset();

      const { mockDocument } = createWebDOMMock({
        fontLoadSuccess: true,
        hasFontAPI: true,
      });
      global.document = mockDocument as unknown as Document;

      await FontPreloader.preloadFonts();

      expect(FontPreloader.areFontsLoaded()).toBe(true);
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.createElement).toHaveBeenCalledWith('span');
      expect(mockDocument.body?.appendChild).toHaveBeenCalled();
      expect(mockDocument.body?.removeChild).toHaveBeenCalled();

      // Verify key font variants are loaded
      expect(mockDocument.fonts?.load).toHaveBeenCalledWith(
        '400 16px "Geist Regular"',
      );
      expect(mockDocument.fonts?.load).toHaveBeenCalledWith(
        '700 16px "Geist Bold"',
      );
      expect(mockDocument.fonts?.load).toHaveBeenCalledWith(
        'italic 400 16px "Geist Regular Italic"',
      );
    });

    it('should fallback to timeout when FontFace API fails', async () => {
      FontPreloader.reset();

      const { mockDocument } = createWebDOMMock({
        fontLoadSuccess: false,
        hasFontAPI: true,
      });
      global.document = mockDocument as unknown as Document;

      const mockFn = jest
        .fn()
        .mockImplementation((callback: () => void, delay: number) => {
          expect(delay).toBe(200);
          callback();
          return 123 as unknown as NodeJS.Timeout;
        });
      // Add the __promisify__ property to satisfy Node.js setTimeout type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockFn as any).__promisify__ = jest.fn();
      const mockSetTimeout = mockFn as unknown as MockSetTimeout;
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      await FontPreloader.preloadFonts();

      expect(FontPreloader.areFontsLoaded()).toBe(true);
      expect(mockDocument.fonts?.load).toHaveBeenCalled();
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 200);

      timeoutMocker.restore();
    });

    it('should fallback to timeout when FontFace API is not available', async () => {
      FontPreloader.reset();

      const { mockDocument } = createWebDOMMock({
        hasFontAPI: false,
      });
      global.document = mockDocument as unknown as Document;

      const mockFn = jest
        .fn()
        .mockImplementation((callback: () => void, delay: number) => {
          expect(delay).toBe(200);
          callback();
          return 123 as unknown as NodeJS.Timeout;
        });
      // Add the __promisify__ property to satisfy Node.js setTimeout type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockFn as any).__promisify__ = jest.fn();
      const mockSetTimeout = mockFn as unknown as MockSetTimeout;
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      await FontPreloader.preloadFonts();

      expect(FontPreloader.areFontsLoaded()).toBe(true);
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 200);

      timeoutMocker.restore();
    });
  });

  describe('Error handling', () => {
    it('should handle native font loading errors gracefully', async () => {
      FontPreloader.reset();

      const mockFn = jest.fn().mockImplementation(() => {
        throw new Error('setTimeout failed');
      });
      // Add the __promisify__ property to satisfy Node.js setTimeout type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockFn as any).__promisify__ = jest.fn();
      const mockSetTimeout = mockFn as unknown as MockSetTimeout;
      const timeoutMocker = withSetTimeoutMock(mockSetTimeout);
      timeoutMocker.setup();

      await FontPreloader.preloadFonts();

      // Should still mark fonts as loaded for graceful degradation
      expect(FontPreloader.areFontsLoaded()).toBe(true);
      expect(mockSetTimeout).toHaveBeenCalled();

      timeoutMocker.restore();
    });

    it('should handle web DOM errors gracefully', async () => {
      const platformMocker = withPlatform('web');
      platformMocker.setup();
      FontPreloader.reset();

      const mockDocument = {
        createElement: jest.fn().mockImplementation(() => {
          throw new Error('DOM creation failed');
        }),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
      };
      global.document = mockDocument as unknown as Document;

      await FontPreloader.preloadFonts();

      expect(FontPreloader.areFontsLoaded()).toBe(true);
      expect(mockDocument.createElement).toHaveBeenCalled();

      platformMocker.restore();
    });

    it('should handle missing document.body in web environment', async () => {
      const platformMocker = withPlatform('web');
      platformMocker.setup();
      FontPreloader.reset();

      const { mockDocument } = createWebDOMMock({
        hasBody: false,
      });
      global.document = mockDocument as unknown as Document;

      await FontPreloader.preloadFonts();

      expect(FontPreloader.areFontsLoaded()).toBe(true);
      expect(mockDocument.createElement).toHaveBeenCalled();
      expect(mockDocument.body).toBeNull();

      platformMocker.restore();
    });
  });
});
