import migration from './051';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #51', () => {
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
        "FATAL ERROR: Migration 51: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 51: Invalid backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migration(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should remove TxController if present in backgroundState', () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          TxController: {
            someData: 'test',
          },
          SomeOtherController: {
            shouldRemain: true,
          },
        },
      },
    });

    const newState = migration(oldState) as typeof oldState;

    expect(newState.engine.backgroundState).not.toHaveProperty('TxController');
    expect(newState.engine.backgroundState).toHaveProperty(
      'SomeOtherController',
    );
    expect(newState.engine.backgroundState.SomeOtherController).toEqual({
      shouldRemain: true,
    });
  });

  it('should not modify state if TxController is not present', () => {
    const oldState = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          SomeOtherController: {
            shouldRemain: true,
          },
        },
      },
    });

    const newState = migration(oldState) as typeof oldState;

    expect(newState).toEqual(oldState);
  });
});
