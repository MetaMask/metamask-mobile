import migrate from './032';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';

const expectedState = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurations: {},
        providerConfig: {
          type: 'mainnet',
          chainId: '0x1',
          rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
          ticker: 'ETH',
        },
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #32', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "Migration 32: Invalid root state: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 32: Invalid root engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "Migration 32: Invalid root engine backgroundState: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: null },
        },
      }),
      errorMessage: "Migration 32: Invalid NetworkController state: 'object'",
      scenario: 'NetworkController is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: { providerConfig: null } },
        },
      }),
      errorMessage:
        "Migration 32: Invalid NetworkController providerConfig: 'object'",
      scenario: 'providerConfig is invalid',
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

  it('should not change ticker if ticker was defined', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkDetails: {},
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'AVAX',
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(oldState);
  });

  it('should add ticker when no ticker is defined, networksMetadata initial object and selectedNetworkClientId be the same as provider config type', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {},
            networkDetails: {},
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            },
          },
        },
      },
    };
    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
  it('should add selectedNetworkClientId property as unique id if type on provider config is rpc', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              '1409fc9f-47a6-4b96-bbc4-7031e7f1af6e': {
                chainId: '0x89',
                nickname: 'Polygon Mainnet',
                rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
                rpcUrl:
                  'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                ticker: 'MATIC',
              },
            },
            networkDetails: {},
            providerConfig: {
              type: 'rpc',
              chainId: '0x89',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'MATIC',
            },
          },
        },
      },
    };
    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual({
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              '1409fc9f-47a6-4b96-bbc4-7031e7f1af6e': {
                chainId: '0x89',
                nickname: 'Polygon Mainnet',
                rpcPrefs: { blockExplorerUrl: 'https://polygonscan.com' },
                rpcUrl:
                  'https://polygon-mainnet.infura.io/v3/cda392a134014865ad3c273dc7ddfff3',
                ticker: 'MATIC',
              },
            },
            providerConfig: {
              type: 'rpc',
              chainId: '0x89',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'MATIC',
            },
            selectedNetworkClientId: '1409fc9f-47a6-4b96-bbc4-7031e7f1af6e',
          },
        },
      },
    });
  });
});
