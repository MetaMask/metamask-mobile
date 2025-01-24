import migration from './045';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';

const oldState = {
  engine: {
    backgroundState: {
      GasFeeController: {
        gasFeeEstimates: {},
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'none',
        gasFeeEstimatesByChainId: {},
      },
    },
  },
};

const expectedNewState = {
  engine: {
    backgroundState: {
      GasFeeController: {
        gasFeeEstimates: {},
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'none',
        gasFeeEstimatesByChainId: {},
        nonRPCGasFeeApisDisabled: false,
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #45', () => {
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
        "FATAL ERROR: Migration 45: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 45: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            GasFeeController: null,
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 45: Invalid GasFeeController state error: 'null'",
      scenario: 'GasFeeController state is invalid',
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

  it('should contain new property nonRPCGasFeeApisDisabled = false in GasFeeController state ', async () => {
    const newState = await migration(oldState);
    expect(newState).toStrictEqual(expectedNewState);

    expect(
      // @ts-expect-error: ignore for testing purposes: new state is type unknown
      newState.engine.backgroundState.GasFeeController.nonRPCGasFeeApisDisabled,
    ).toEqual(false);
  });
});
