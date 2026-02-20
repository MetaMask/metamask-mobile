import migrate from './121';
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

describe('Migration #121 - Update default search engine to Brave', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 121: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 121: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 121: Invalid engine backgroundState error: 'object'",
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
        "FATAL ERROR: Migration 121: Invalid Settings state error: 'object'",
      scenario: 'Settings object is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`captures exception if ${scenario}`, async () => {
      const newState = await migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('updates the search engine from Google to Brave', async () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
      settings: {
        searchEngine: 'Google',
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {},
      },
      settings: {
        searchEngine: 'Brave',
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('updates the search engine from DuckDuckGo to Brave', async () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
      settings: {
        searchEngine: 'DuckDuckGo',
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {},
      },
      settings: {
        searchEngine: 'Brave',
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
