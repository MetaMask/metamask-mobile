import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';

import { ensureValidState } from './util';
import migrate, {
  migrationVersion,
  MEGAETH_TESTNET_V2_CONFIG,
  MEGAETH_TESTNET_V1_CHAIN_ID,
} from './110';
import { KnownCaipNamespace } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const mainnetConfiguration = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    blockExplorerUrls: ['https://explorer.com'],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'mainnet',
        type: RpcEndpointType.Custom,
        url: 'https://mainnet.com',
      },
    ],
  },
};

const lineaSepoliaConfiguration = {
  '0xe705': {
    chainId: '0xe705',
    name: 'Linea Sepolia',
    nativeCurrency: 'LineaETH',
    blockExplorerUrls: ['https://sepolia.lineascan.build'],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'linea-sepolia',
        type: RpcEndpointType.Custom,
        url: 'https://mainnet.com',
      },
    ],
  },
};

const megaEthTestnetV1Configuration = {
  [MEGAETH_TESTNET_V1_CHAIN_ID]: {
    chainId: MEGAETH_TESTNET_V1_CHAIN_ID,
    name: 'Mega Testnet',
    nativeCurrency: 'MegaETH',
    blockExplorerUrls: ['https://explorer.com'],
    defaultRpcEndpointIndex: 0,
    defaultBlockExplorerUrlIndex: 0,
    rpcEndpoints: [
      {
        networkClientId: 'megaeth-testnet',
        type: RpcEndpointType.Custom,
        url: 'https://rpc.com',
      },
    ],
  },
};

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  const invalidStates = [
    {
      state: {
        engine: {},
      },
      scenario: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      scenario: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
          },
        },
      },
      scenario: 'invalid NetworkController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {},
          },
        },
      },
      scenario: 'missing networkConfigurationsByChainId property',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: 'invalid',
            },
          },
        },
      },
      scenario: 'invalid networkConfigurationsByChainId state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [MEGAETH_TESTNET_V1_CHAIN_ID]: {
                  chainId: MEGAETH_TESTNET_V1_CHAIN_ID,
                  name: 'Mega Testnet',
                  nativeCurrency: 'MegaETH',
                  blockExplorerUrls: ['https://explorer.com'],
                  defaultRpcEndpointIndex: 0,
                  defaultBlockExplorerUrlIndex: 0,
                  rpcEndpoints: [
                    {
                      networkClientId: 'megaeth-testnet',
                      type: RpcEndpointType.Custom,
                      url: 'https://rpc.com',
                    },
                  ],
                },
              },
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: MEGAETH_TESTNET_V1_CHAIN_ID,
              },
            },
          },
        },
      },
      scenario: 'selectedNetworkClientId is missing',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: {},
              networkConfigurationsByChainId: {
                [MEGAETH_TESTNET_V1_CHAIN_ID]: {
                  chainId: MEGAETH_TESTNET_V1_CHAIN_ID,
                  name: 'Mega Testnet',
                  nativeCurrency: 'MegaETH',
                  blockExplorerUrls: ['https://explorer.com'],
                  defaultRpcEndpointIndex: 0,
                  defaultBlockExplorerUrlIndex: 0,
                  rpcEndpoints: [
                    {
                      networkClientId: 'megaeth-testnet',
                      type: RpcEndpointType.Custom,
                      url: 'https://rpc.com',
                    },
                  ],
                },
              },
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: MEGAETH_TESTNET_V1_CHAIN_ID,
              },
            },
          },
        },
      },
      scenario: 'selectedNetworkClientId is not a string',
    },
  ];

  it.each(invalidStates)('captures exception if $scenario', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('removes the megaeth testnet v1 network configuration and enablement map and adds the megaeth testnet v2 network configuration', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              [MEGAETH_TESTNET_V1_CHAIN_ID]: {
                chainId: MEGAETH_TESTNET_V1_CHAIN_ID,
                name: 'Mega Testnet',
                nativeCurrency: 'MegaETH',
                blockExplorerUrls: ['https://explorer.com'],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                rpcEndpoints: [
                  {
                    networkClientId: 'megaeth-testnet',
                    type: RpcEndpointType.Custom,
                    url: 'https://rpc.com',
                  },
                ],
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Eip155]: {
                [MEGAETH_TESTNET_V1_CHAIN_ID]: false,
                '0x1': true,
              },
            },
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
            networkConfigurationsByChainId: {
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Eip155]: {
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: false,
                '0x1': true,
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(migratedState).toStrictEqual(expectedState);
  });

  const switchToMainnetScenarios = [
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                ...megaEthTestnetV1Configuration,
              },
              selectedNetworkClientId: 'mainnet',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': false,
                  [MEGAETH_TESTNET_V1_CHAIN_ID]: true,
                },
              },
            },
          },
        },
      },
      scenario: 'the megaeth testnet v1 is enabled',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                ...megaEthTestnetV1Configuration,
              },
              selectedNetworkClientId: 'megaeth-testnet',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': true,
                  [MEGAETH_TESTNET_V1_CHAIN_ID]: false,
                },
              },
            },
          },
        },
      },
      scenario:
        'megaeth testnet v1 is not enabled but the selected network client id is megaeth testnet v1',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
              },
              selectedNetworkClientId: 'megaeth-testnet',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': true,
                  [MEGAETH_TESTNET_V1_CHAIN_ID]: false,
                },
              },
            },
          },
        },
      },
      scenario:
        'the selected network client id is megaeth testnet v1 regardless the networkConfigurationsByChainId has megaeth testnet v1 or not',
    },
  ];

  it.each(switchToMainnetScenarios)(
    'switchs to mainnet if $scenario',
    async ({ state }) => {
      const oldStorage = cloneDeep(state);

      const expectedStorage = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
              },
              selectedNetworkClientId: 'mainnet',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': true,
                  [MEGAETH_TESTNET_V2_CONFIG.chainId]: false,
                },
              },
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const newStorage = await migrate(oldStorage);

      expect(newStorage).toStrictEqual(expectedStorage);
    },
  );

  const invalidSwitchToMainnetScenarios = [
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                ...lineaSepoliaConfiguration,
              },
              selectedNetworkClientId: 'linea-sepolia',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': false,
                  '0xe705': true,
                },
              },
            },
          },
        },
      },
      scenario:
        'the selected network client id is not megaeth testnet v1 and the megaeth testnet v1 is missing from the network configurations and enablement map',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                ...lineaSepoliaConfiguration,
                [MEGAETH_TESTNET_V1_CHAIN_ID]: {
                  ...megaEthTestnetV1Configuration[MEGAETH_TESTNET_V1_CHAIN_ID],
                  rpcEndpoints: 'uuid',
                },
              },
              selectedNetworkClientId: 'uuid',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': false,
                  '0xe705': true,
                },
              },
            },
          },
        },
      },
      // This case should never happen.
      scenario:
        'the megaeth testnet v1 is not enabled and the selected network client id is one of megaeth testnet v1 RPC but the rpcEndpoints of megaeth testnet v1 is not valid',
    },
  ];

  it.each(invalidSwitchToMainnetScenarios)(
    'does not switch to mainnet if $scenario',
    async ({ state }) => {
      const oldStorage = cloneDeep(state);

      const expectedStorage = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                ...lineaSepoliaConfiguration,
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
              },
              selectedNetworkClientId:
                state.engine.backgroundState.NetworkController
                  .selectedNetworkClientId,
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': false,
                  '0xe705': true,
                  [MEGAETH_TESTNET_V2_CONFIG.chainId]: false,
                },
              },
            },
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const newStorage = await migrate(oldStorage);

      expect(newStorage).toStrictEqual(expectedStorage);
    },
  );

  it('merges the megaeth testnet v2 network configuration if there is one', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              ...megaEthTestnetV1Configuration,
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: {
                ...MEGAETH_TESTNET_V2_CONFIG,
                name: 'Mega Testnet',
                nativeCurrency: 'ETH',
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Eip155]: {
                '0x1': false,
                [MEGAETH_TESTNET_V1_CHAIN_ID]: false,
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: true,
              },
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Eip155]: {
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: true,
                '0x1': false,
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(orgState);

    expect(migratedState).toStrictEqual(expectedState);
  });
});
