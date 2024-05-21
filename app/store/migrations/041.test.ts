import migration from './041';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';

const oldState = {
  engine: {
    backgroundState: {
      TokenBalancesController: {
        contractBalances: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
        },
      },
    },
  },
};

const expectedNewState = {
  engine: {
    backgroundState: {
      TokenBalancesController: {
        contractBalances: {},
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #41', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 41: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 41: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            TokenBalancesController: null,
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 41: Invalid TokenBalancesController state error: 'null'",
      scenario: 'TokenBalancesController state is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, async () => {
      const newState = await migration(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should reset TokenBalanceController contract balances to empty object', async () => {
    const newState = await migration(oldState);
    expect(newState).toStrictEqual(expectedNewState);
  });
});
