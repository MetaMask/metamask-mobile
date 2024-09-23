import migrate from './035';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import { NetworkStatus } from '@metamask/network-controller';

const expectedState = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurations: {},
        networksMetadata: {
          goerli: {
            EIPS: {},
            status: 'unknown',
          },
          'linea-goerli': {
            EIPS: {},
            status: 'unknown',
          },
          'linea-mainnet': {
            EIPS: {},
            status: 'unknown',
          },
          'linea-sepolia': {
            EIPS: {},
            status: 'unknown',
          },
          mainnet: {
            EIPS: {},
            status: 'unknown',
          },
          sepolia: {
            EIPS: {},
            status: 'unknown',
          },
        },
        selectedNetworkClientId: 'mainnet',
        providerConfig: {
          type: 'mainnet',
          chainId: '0x1',
          rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
          ticker: 'ETH',
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #35', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "Migration 35: Invalid root state: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage: "Migration 35: Invalid root engine state: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "Migration 35: Invalid root engine backgroundState: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: null },
        },
      }),
      errorMessage: "Migration 35: Invalid NetworkController state: 'object'",
      scenario: 'NetworkController is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { NetworkController: { networkDetails: null } },
        },
      }),
      errorMessage:
        "Migration 35: Invalid NetworkController networkDetails state: 'object'",
      scenario: 'networkDetails is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkDetails: {},
              providerConfig: null,
              networkConfigurations: {},
            },
          },
        },
      }),
      errorMessage:
        "Migration 35: Invalid NetworkController providerConfig state: 'object'",
      scenario: 'providerConfig is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            NetworkController: {
              networkDetails: {},
              networkConfigurations: null,
            },
          },
        },
      }),
      errorMessage:
        "Migration 35: Invalid NetworkController networkConfigurations state: 'object'",
      scenario: 'networkConfigurations is invalid',
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

  it('should remove networkDetails and networkStatus of network controller state', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {},
            networkDetails: {},
            networkStatus: 'test',
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'ETH',
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
  it('should update selectedNetworkClientId with provider config id is defined', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {},
            networkDetails: {},
            networkStatus: 'test',
            providerConfig: {
              type: 'rpc',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'AVAX',
              id: 'cd9eb07d-5b42-40ff-8104-95126382e52c',
            },
          },
        },
      },
    };

    const expectedStateWithIdDefined = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {},
            networksMetadata: {
              goerli: {
                EIPS: {},
                status: 'unknown',
              },
              'linea-goerli': {
                EIPS: {},
                status: 'unknown',
              },
              'linea-mainnet': {
                EIPS: {},
                status: 'unknown',
              },
              'linea-sepolia': {
                EIPS: {},
                status: 'unknown',
              },
              mainnet: {
                EIPS: {},
                status: 'unknown',
              },
              sepolia: {
                EIPS: {},
                status: 'unknown',
              },
            },
            providerConfig: {
              type: 'rpc',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'AVAX',
              id: 'cd9eb07d-5b42-40ff-8104-95126382e52c',
            },
            selectedNetworkClientId: 'cd9eb07d-5b42-40ff-8104-95126382e52c',
          },
        },
      },
    };
    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedStateWithIdDefined);
  });
  it('should update selectedNetworkClientId with provider config id is null and type is a infura network', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkDetails: {},
            networkStatus: 'test',
            networkConfigurations: {},
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'ETH',
            },
          },
        },
      },
    };
    const migrateState = await migrate(oldState);

    expect(migrateState).toStrictEqual(expectedState);
  });
  it('should create networksMetadata with networksConfigurationId and InfuraNetworks', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'cd9eb07d-5b42-40ff-8104-95126382e52c': {
                chainId: '0xa86a',
                id: '52b62bd0-296c-41d0-9772-2f418c9e81ef',
                nickname: 'Avalanche Mainnet C-Chain',
                rpcPrefs: [''],
                rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                ticker: 'AVAX',
              },
            },
            networkDetails: {},
            networkStatus: 'test',
            providerConfig: {
              type: 'rpc',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'AVAX',
              id: 'cd9eb07d-5b42-40ff-8104-95126382e52c',
            },
          },
        },
      },
    };

    const expectedStateWithNetworksMetadata = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {
              'cd9eb07d-5b42-40ff-8104-95126382e52c': {
                chainId: '0xa86a',
                id: '52b62bd0-296c-41d0-9772-2f418c9e81ef',
                nickname: 'Avalanche Mainnet C-Chain',
                rpcPrefs: [''],
                rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                ticker: 'AVAX',
              },
            },
            providerConfig: {
              type: 'rpc',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'AVAX',
              id: 'cd9eb07d-5b42-40ff-8104-95126382e52c',
            },
            selectedNetworkClientId: 'cd9eb07d-5b42-40ff-8104-95126382e52c',
            networksMetadata: {
              'cd9eb07d-5b42-40ff-8104-95126382e52c': {
                status: NetworkStatus.Unknown,
                EIPS: {},
              },
              goerli: {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              'linea-goerli': {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              'linea-sepolia': {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              'linea-mainnet': {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              mainnet: {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              sepolia: {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
            },
          },
        },
      },
    };

    const migrateState = await migrate(oldState);

    expect(migrateState).toStrictEqual(expectedStateWithNetworksMetadata);
  });
  it('should create networksMetadata with InfuraNetworks if networksConfigurations is empty', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurations: {},
            networkDetails: {},
            networkStatus: 'test',
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
              rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
              ticker: 'ETH',
            },
          },
        },
      },
    };

    const expectedStateWithNetworksMetadata = {
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
            networksMetadata: {
              goerli: {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              'linea-goerli': {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              'linea-sepolia': {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              'linea-mainnet': {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              mainnet: {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
              sepolia: {
                EIPS: {},
                status: NetworkStatus.Unknown,
              },
            },
          },
        },
      },
    };

    const migrateState = await migrate(oldState);

    expect(migrateState).toStrictEqual(expectedStateWithNetworksMetadata);
  });
});
