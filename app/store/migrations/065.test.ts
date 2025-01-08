import migrate, { State } from './065';
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

  it('should enable STX when opt-in status is undefined', () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartTransactionsOptInStatus: undefined,
          },
        },
      },
    });

    const newState = migrate(oldState) as State;

    expect(
      newState.engine.backgroundState.PreferencesController
        .smartTransactionsOptInStatus,
    ).toBe(true);
    expect(
      newState.engine.backgroundState.PreferencesController
        .smartTransactionsMigrationApplied,
    ).toBe(true);
  });

});
