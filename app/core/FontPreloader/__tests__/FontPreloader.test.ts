import FontPreloader from '../FontPreloader';

// Mock Logger to avoid console output during tests
jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock Platform for React Native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock getFontFamily
jest.mock(
  '../../../component-library/components/Texts/Text/Text.utils',
  () => ({
    getFontFamily: jest.fn((variant) => `Geist Regular`),
  }),
);

describe('FontPreloader', () => {
  beforeEach(() => {
    FontPreloader.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    FontPreloader.reset();
  });

  it('should be a singleton', () => {
    const instance1 = FontPreloader;
    const instance2 = FontPreloader;
    expect(instance1).toBe(instance2);
  });

  it('should initially report fonts as not loaded', () => {
    expect(FontPreloader.areFontsLoaded()).toBe(false);
  });

  it('should preload fonts successfully on React Native', async () => {
    expect(FontPreloader.areFontsLoaded()).toBe(false);

    await FontPreloader.preloadFonts();

    expect(FontPreloader.areFontsLoaded()).toBe(true);
  });

  it('should not reload fonts if already loaded', async () => {
    // First load
    await FontPreloader.preloadFonts();
    const firstLoadResult = FontPreloader.areFontsLoaded();

    // Second load attempt
    await FontPreloader.preloadFonts();
    const secondLoadResult = FontPreloader.areFontsLoaded();

    expect(firstLoadResult).toBe(true);
    expect(secondLoadResult).toBe(true);
    expect(firstLoadResult).toBe(secondLoadResult);
  });

  it('should return the same promise for concurrent loading attempts', () => {
    const promise1 = FontPreloader.preloadFonts();
    const promise2 = FontPreloader.preloadFonts();

    expect(promise1).toBe(promise2);
  });

  it('should reset font loading state', async () => {
    await FontPreloader.preloadFonts();
    expect(FontPreloader.areFontsLoaded()).toBe(true);

    FontPreloader.reset();
    expect(FontPreloader.areFontsLoaded()).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    // Mock setTimeout to throw an error
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    }) as any;

    // Should still resolve even if there's an error
    await expect(FontPreloader.preloadFonts()).resolves.toBeUndefined();
    expect(FontPreloader.areFontsLoaded()).toBe(true);

    // Restore setTimeout
    global.setTimeout = originalSetTimeout;
  });

  it('should provide loading promise access', async () => {
    const loadingPromise = FontPreloader.preloadFonts();
    const retrievedPromise = FontPreloader.getLoadingPromise();

    expect(retrievedPromise).toBe(loadingPromise);
    await loadingPromise;
  });
});
