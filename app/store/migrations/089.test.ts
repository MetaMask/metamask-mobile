import { captureException } from '@sentry/react-native';
import { getDefaultPreferencesState } from '@metamask/preferences-controller';
import migration from './089';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = captureException as jest.MockedFunction<typeof captureException>;

interface MockStateOverrides {
  engineBackgroundState?: Record<string, unknown>;
  user?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

describe('Migration 089', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockState = (overrides: MockStateOverrides = {}) => ({
    'engine.backgroundState': {
      CurrencyRateController: {
        currentCurrency: 'usd',
      },
      ...overrides.engineBackgroundState,
    },
    user: {
      currentLocale: 'en',
      appTheme: 'light',
      ...overrides.user,
    },
    settings: {
      useBlockieIcon: false,
      hideZeroBalanceTokens: false,
      ...overrides.settings,
    },
    ...overrides,
  });

  describe('successful migration', () => {
    it('should migrate all settings to PreferencesController with valid data', () => {
      const mockState = createMockState({
        user: {
          currentLocale: 'es',
          appTheme: 'dark',
        },
        settings: {
          useBlockieIcon: true,
          hideZeroBalanceTokens: true,
        },
        engineBackgroundState: {
          CurrencyRateController: {
            currentCurrency: 'eur',
          },
        },
      });

      const result = migration(mockState);

      expect(result).toEqual({
        ...mockState,
        'engine.backgroundState': {
          ...mockState['engine.backgroundState'],
          PreferencesController: {
            ...getDefaultPreferencesState(),
            currentLocale: 'es',
            theme: 'dark',
            useBlockie: true,
            currentCurrency: 'eur',
            hideZeroBalanceTokens: true,
            showNativeTokenAsMainBalance: false,
          },
        },
      });
    });

    it('should use default values when settings are missing', () => {
      const mockState = createMockState({
        user: {},
        settings: {},
        engineBackgroundState: {
          CurrencyRateController: {},
        },
      });

      const result = migration(mockState);

      expect(result).toEqual({
        ...mockState,
        'engine.backgroundState': {
          ...mockState['engine.backgroundState'],
          PreferencesController: {
            ...getDefaultPreferencesState(),
            currentLocale: 'en',
            theme: 'light',
            useBlockie: false,
            currentCurrency: 'usd',
            hideZeroBalanceTokens: false,
            showNativeTokenAsMainBalance: false,
          },
        },
      });
    });

    it('should handle missing user state', () => {
      const mockState = createMockState({
        user: undefined,
      });

      const result = migration(mockState);

      expect(result).toEqual({
        ...mockState,
        'engine.backgroundState': {
          ...mockState['engine.backgroundState'],
          PreferencesController: {
            ...getDefaultPreferencesState(),
            currentLocale: 'en',
            theme: 'light',
            useBlockie: false,
            currentCurrency: 'usd',
            hideZeroBalanceTokens: false,
            showNativeTokenAsMainBalance: false,
          },
        },
      });
    });

    it('should handle missing settings state', () => {
      const mockState = createMockState({
        settings: undefined,
      });

      const result = migration(mockState);

      expect(result).toEqual({
        ...mockState,
        'engine.backgroundState': {
          ...mockState['engine.backgroundState'],
          PreferencesController: {
            ...getDefaultPreferencesState(),
            currentLocale: 'en',
            theme: 'light',
            useBlockie: false,
            currentCurrency: 'usd',
            hideZeroBalanceTokens: false,
            showNativeTokenAsMainBalance: false,
          },
        },
      });
    });

    it('should handle missing CurrencyRateController', () => {
      const mockState = createMockState({
        engineBackgroundState: {
          CurrencyRateController: undefined,
        },
      });

      const result = migration(mockState);

      expect(result).toEqual({
        ...mockState,
        'engine.backgroundState': {
          ...mockState['engine.backgroundState'],
          PreferencesController: {
            ...getDefaultPreferencesState(),
            currentLocale: 'en',
            theme: 'light',
            useBlockie: false,
            currentCurrency: 'usd',
            hideZeroBalanceTokens: false,
            showNativeTokenAsMainBalance: false,
          },
        },
      });
    });
  });

  describe('idempotent migration', () => {
    it('should skip migration if PreferencesController already exists', () => {
      const existingPreferencesState = {
        ...getDefaultPreferencesState(),
        currentLocale: 'fr',
        theme: 'auto',
      };

      const mockState = createMockState({
        engineBackgroundState: {
          PreferencesController: existingPreferencesState,
        },
      });

      const result = migration(mockState);

      expect(result).toEqual(mockState);
    });
  });

  describe('error handling', () => {
    it('should handle invalid state and return original state', () => {
      const invalidState = null;

      const result = migration(invalidState);

      expect(result).toEqual(invalidState);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(`Migration 089: Invalid state error: 'object' received.`),
      );
    });

    it('should handle non-object state', () => {
      const invalidState = 'invalid';

      const result = migration(invalidState);

      expect(result).toEqual(invalidState);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(`Migration 089: Invalid state error: 'string' received.`),
      );
    });
  });
});
