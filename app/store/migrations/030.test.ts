import migrate from './030';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';

const expectedState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        securityAlertsEnabled: true,
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #30', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "Migration 30: Invalid root state: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 30: Invalid root engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "Migration 30: Invalid root engine backgroundState: 'object'",
      scenario: 'backgroundState is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, async () => {
      const newState = await migrate(state);
      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should not change anything if security alert is already enabled', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            securityAlertsEnabled: true,
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should enable security alert if it is not enabled', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            securityAlertsEnabled: false,
          },
        },
      },
    };
    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
