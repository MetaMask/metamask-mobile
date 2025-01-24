import migrate from './056';
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

describe('Migration #56', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 56: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 56: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 56: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { PreferencesController: null },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 56: Invalid PreferencesController state error: 'object'",
      scenario: 'PreferencesController is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('updates decomissioned ipfsGateway to new default', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            ipfsGateway: 'https://dweb.link/ipfs/',
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('does not change ipfsGateway if not decomissioned', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            ipfsGateway: 'https://ipfs.io/ipfs/',
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          PreferencesController: {
            ipfsGateway: 'https://ipfs.io/ipfs/',
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
