import migrate, { State } from './068';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

const createTestState = (preferences = {}) => ({
  engine: {
    backgroundState: {
      PreferencesController: {
        featureFlags: {},
        ...preferences
      }
    }
  }
});

describe('Migration #67', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 67: Invalid state error: 'null'",
      scenario: 'state is invalid',
    },
    {
      state: { engine: null },
      errorMessage: "FATAL ERROR: Migration 67: Invalid engine state error: 'null'",
      scenario: 'engine state is invalid',
    },
    {
      state: { engine: { backgroundState: null } },
      errorMessage: "FATAL ERROR: Migration 67: Invalid engine backgroundState error: 'null'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: { engine: { backgroundState: { PreferencesController: null } } },
      errorMessage: "FATAL ERROR: Migration 67: Invalid PreferencesController state error: 'null'",
      scenario: 'PreferencesController is invalid',
    },
  ];

  it.each(invalidStates)(
    'captures exception if $scenario',
    ({ errorMessage, state }) => {
      const newState = migrate(state);
      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(errorMessage);
    },
  );

  it('should initialize preferences if they do not exist', () => {
    const state = createTestState();
    const result = migrate(state) as State;
    expect(
      result.engine.backgroundState.PreferencesController,
    ).toBeDefined();
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsMigrationApplied,
    ).toBe(true);
    expect(
      result.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(true);
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsBannerDismissed,
    ).toBe(false);
  });

  it('should enable STX when opt-in status is undefined', () => {
    const state = createTestState({
      smartTransactionsOptInStatus: undefined,
    });

    const result = migrate(state) as State;
    expect(
      result.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(true);
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsMigrationApplied,
    ).toBe(true);
  });

  it('should enable STX when opt-in status is null', () => {
    const state = createTestState({
      smartTransactionsOptInStatus: null,
    });

    const result = migrate(state) as State;
    expect(
      result.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(true);
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsMigrationApplied,
    ).toBe(true);
  });

  it('should not change stx opt-in when it is already true, but should set migration flag to false', () => {
    const state = createTestState({
      smartTransactionsOptInStatus: true,
    });

    const result = migrate(state) as State;
    expect(
      result.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(true);
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsMigrationApplied,
    ).toBe(false);
  });

  it('should enable STX and show banner (migrationApplied=true) when opt-in status is false', () => {
    const state = createTestState({
      smartTransactionsOptInStatus: false,
    });

    const result = migrate(state) as State;
    expect(
      result.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(true);
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsMigrationApplied,
    ).toBe(true);
  });
});
