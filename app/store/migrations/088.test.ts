import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';

import initialRootState from '../../util/test/initial-root-state';
import migrate from './088';

const expectedState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        smartAccountOptIn: false,
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #88', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "Migration 88: Invalid root state: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 88: Invalid root engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "Migration 88: Invalid root engine backgroundState: 'object'",
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

  it('should not change anything if smartAccountOptIn is already disabled', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartAccountOptIn: false,
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should disable security alert if it is enabled', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            smartAccountOptIn: true,
          },
        },
      },
    };
    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
