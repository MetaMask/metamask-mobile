import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate, {
  migrationVersion,
  MEGAETH_TESTNET_V2_CONFIG,
  MEGAETH_TESTNET_V1_CHAIN_ID,
} from './111';
import { KnownCaipNamespace } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

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
        type: 'custom',
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
        type: 'custom',
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
        type: 'custom',
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
                      type: 'custom',
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
                      type: 'custom',
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

  it('adds the megaeth testnet v2 network configuration, update the enablement map and remove the megaeth testnet v1 network configuration', async () => {
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
                    type: 'custom',
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

  const invalidNetworkEnablementControllerStates = [
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      scenario: 'missing NetworkEnablementController',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkEnablementController: 'invalid',
          },
        },
      },
      scenario: 'invalid NetworkEnablementController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkEnablementController: {},
          },
        },
      },
      scenario: 'missing enabledNetworkMap',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkEnablementController: { enabledNetworkMap: 'invalid' },
          },
        },
      },
      scenario: 'invalid enabledNetworkMap state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkEnablementController: { enabledNetworkMap: {} },
          },
        },
      },
      scenario: 'missing Eip155 in enabledNetworkMap',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkEnablementController: {
              enabledNetworkMap: { [KnownCaipNamespace.Eip155]: 'invalid' },
            },
          },
        },
      },
      scenario: 'invalid enabledNetworkMap Eip155 state',
    },
  ];

  it.each(invalidNetworkEnablementControllerStates)(
    'does not update the enablement map and adds the megaeth testnet v2 network configuration and remove the megaeth testnet v1 network configuration if $scenario',
    async ({ state }) => {
      const orgState = {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'megaeth-testnet',
              networksMetadata: {},
              networkConfigurationsByChainId: {
                ...mainnetConfiguration,
                ...megaEthTestnetV1Configuration,
              },
            },
            ...state.engine.backgroundState,
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
                ...mainnetConfiguration,
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
              },
            },
            ...state.engine.backgroundState,
          },
        },
      };

      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = await migrate(orgState);

      expect(migratedState).toStrictEqual(expectedState);
    },
  );

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
      scenario: 'the megaeth testnet v1 is enabled exclusively',
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
                [MEGAETH_TESTNET_V1_CHAIN_ID]: {
                  ...megaEthTestnetV1Configuration[MEGAETH_TESTNET_V1_CHAIN_ID],
                },
              },
              selectedNetworkClientId: 'mainnet',
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
      scenario: 'the megaeth testnet v1 is not enabled',
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
                },
              },
              selectedNetworkClientId: 'mainnet',
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  '0x1': false,
                  '0xe705': true,
                  [MEGAETH_TESTNET_V1_CHAIN_ID]: true,
                },
              },
            },
          },
        },
      },
      scenario: 'the megaeth testnet v1 is not enabled exclusively',
    },
  ];

  it.each(invalidSwitchToMainnetScenarios)(
    'does not force to mainnet if $scenario',
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
                [KnownCaipNamespace.Eip155]: expect.objectContaining({
                  [MEGAETH_TESTNET_V2_CONFIG.chainId]: false,
                  '0x1': false,
                }),
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
                rpcEndpoints: [
                  {
                    networkClientId: 'megaeth-testnet-v2',
                    url: 'https://rpc.com',
                    type: 'custom',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                defaultBlockExplorerUrlIndex: 0,
                blockExplorerUrls: ['https://explorer.com'],
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
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: {
                ...MEGAETH_TESTNET_V2_CONFIG,
                rpcEndpoints: [
                  {
                    networkClientId: 'megaeth-testnet-v2',
                    url: 'https://rpc.com',
                    type: 'custom',
                  },
                  {
                    ...MEGAETH_TESTNET_V2_CONFIG.rpcEndpoints[0],
                    networkClientId: 'mock-uuid',
                  },
                ],
                defaultRpcEndpointIndex: 1,
                defaultBlockExplorerUrlIndex: 1,
                blockExplorerUrls: [
                  'https://explorer.com',
                  ...MEGAETH_TESTNET_V2_CONFIG.blockExplorerUrls,
                ],
              },
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

  it('returns the original state if the megaeth testnet v2 network configuration exists but is invalid', async () => {
    const orgState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'uuid',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              ...mainnetConfiguration,
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: {
                ...MEGAETH_TESTNET_V2_CONFIG,
                name: 'Mega Testnet',
                nativeCurrency: 'ETH',
                rpcEndpoints: 'invalid',
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
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: {
                ...MEGAETH_TESTNET_V2_CONFIG,
                name: 'Mega Testnet',
                nativeCurrency: 'ETH',
                rpcEndpoints: 'invalid',
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
