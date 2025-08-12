import migrate from './058';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import mockedEngine from '../../core/__mocks__/MockedEngine';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Migration #58 - Update default search engine from DDG to Google', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 58: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 58: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 58: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {},
        },
        settings: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 58: Invalid Settings state error: 'object'",
      scenario: 'Settings object is invalid',
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

  it('should update the search engine to Google', async () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
      settings: {
        searchEngine: 'DuckDuckGo',
      }
    };

    const expectedState = {
      engine: {
        backgroundState: {},
      },
      settings: {
        searchEngine: 'Google',
      }
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
