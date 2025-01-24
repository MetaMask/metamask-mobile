import migrate from './053';
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

describe('Migration #53 - Delete providerConfig', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 53: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 53: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 53: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: null },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 53: Invalid NetworkController state error: 'object'",
      scenario: 'NetworkController is invalid',
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

  it('should remove providerConfig from the NetworkController state', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'ETH',
            },
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurations: {},
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurations: {},
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should do nothing if providerConfig does not exist', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurations: {},
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
