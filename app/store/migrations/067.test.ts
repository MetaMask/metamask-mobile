import migrate, { State } from './067';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import { MAINNET } from '../../constants/network';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #65', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 65: Invalid state error: 'null'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 65: Invalid engine state error: 'null'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 65: Invalid engine backgroundState error: 'null'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { PreferencesController: null },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 65: Invalid PreferencesController state error: 'null'",
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
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {},
        },
      },
    });

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
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: undefined,
          },
        },
      },
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
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: null,
          },
        },
      },
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

  it('should not change stx opt-in when it is already true, but should set migration flag', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: true,
          },
        },
      },
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

  it('should respect existing opt-out with smart transactions', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: false,
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {
                [MAINNET]: ['some transaction'],
              },
            },
          },
        },
      },
    });

    const result = migrate(state) as State;
    expect(
      result.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(false);
    expect(
      result.engine.backgroundState.PreferencesController
        .featureFlags.smartTransactionsMigrationApplied,
    ).toBe(true);
  });

  it('should enable STX for opt-out without existing transactions', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: false,
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {
                [MAINNET]: [],
              },
            },
          },
        },
      },
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

  it('should respect mainnet transactions even with transactions on other networks', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: false,
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {
                [MAINNET]: [], // Empty mainnet
                '0xAA36A7': ['some transaction'], // Other network has transactions
              },
            },
          },
        },
      },
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
