import migrate, { DEFAULT_NOTIFICATION_SERVICES_CONTROLLER } from './060';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState, { backgroundState } from '../../util/test/initial-root-state';
import mockedEngine from '../../core/__mocks__/MockedEngine';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Migration #60 - Insert NotificationServicesController if missing', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 60: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 60: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 60: Invalid engine backgroundState error: 'object'",
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

  it('should insert default NotificationServicesController if missing', async () => {
    const oldState = {
      ...initialRootState,
      engine: {
        backgroundState,
      },
    };

    const expectedState = {
        ...initialRootState,
      engine: {
        backgroundState: {
            ...backgroundState,
            NotificationServicesController: DEFAULT_NOTIFICATION_SERVICES_CONTROLLER
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
