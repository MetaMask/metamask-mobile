import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './132';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

interface TestState {
  settings?: {
    hideZeroBalanceTokens?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe(`Migration ${migrationVersion}: Enable hideZeroBalanceTokens for all users`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged if settings slice is missing', () => {
    const state: TestState = { engine: { backgroundState: {} } };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(state.settings).toBeUndefined();
  });

  it('returns state unchanged if settings is not an object', () => {
    const state = { settings: 'invalid' };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(state.settings).toBe('invalid');
  });

  it('sets hideZeroBalanceTokens to true when it was false', () => {
    const state: TestState = {
      settings: { hideZeroBalanceTokens: false },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(state.settings?.hideZeroBalanceTokens).toBe(true);
  });

  it('sets hideZeroBalanceTokens to true when it was undefined', () => {
    const state: TestState = {
      settings: {},
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(state.settings?.hideZeroBalanceTokens).toBe(true);
  });

  it('keeps hideZeroBalanceTokens true when it was already true', () => {
    const state: TestState = {
      settings: { hideZeroBalanceTokens: true },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(state.settings?.hideZeroBalanceTokens).toBe(true);
  });

  it('preserves other settings fields', () => {
    const state: TestState = {
      settings: {
        hideZeroBalanceTokens: false,
        privacyMode: true,
        useBlockieIcon: false,
      },
    };

    migrate(state);

    expect(state.settings?.privacyMode).toBe(true);
    expect(state.settings?.useBlockieIcon).toBe(false);
    expect(state.settings?.hideZeroBalanceTokens).toBe(true);
  });

  it('captures exceptions and returns state on unexpected errors', () => {
    const settings: Record<string, unknown> = {};
    Object.defineProperty(settings, 'hideZeroBalanceTokens', {
      configurable: true,
      enumerable: true,
      get() {
        return undefined;
      },
      set() {
        throw new Error('Unexpected migration failure');
      },
    });

    const state: TestState = { settings };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 132: Failed to enable hideZeroBalanceTokens',
        ),
      }),
    );
  });
});
