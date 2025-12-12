import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { RpcEndpointType } from '@metamask/network-controller';

import { ensureValidState } from './util';
import migrate, {
  migrationVersion,
  MEGAETH_TESTNET_V2_CONFIG,
  MEGAETH_TESTNET_V1_CHAIN_ID,
} from './109';
import { KnownCaipNamespace } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

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
            NetworkController: {},
          },
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
            NetworkEnablementController: {
              enabledNetworkMap: { [KnownCaipNamespace.Eip155]: 'invalid' },
            },
          },
        },
      },
      scenario: 'invalid enabledNetworkMap Eip155 state',
    },
  ];

  it.each(invalidStates)(
    'should capture exception if $scenario',
    ({ state }) => {
      const orgState = cloneDeep(state);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(state);

      // State should be unchanged
      expect(migratedState).toStrictEqual(orgState);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    },
  );

  it('removes the megaeth testnet v1 network configuration and adds the megaeth testnet v2 network configuration', async () => {
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

  it.each(['megaeth-testnet', 'random-network-client-id'])(
    'switchs to mainnet when the selected network client id is in MegaETH Testnet v1 - %s',
    async (selectedNetworkClientId: string) => {
      const oldStorage = {
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
                      networkClientId: selectedNetworkClientId,
                      type: RpcEndpointType.Custom,
                      url: 'https://rpc.com',
                    },
                  ],
                },
              },
              selectedNetworkClientId,
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                [KnownCaipNamespace.Eip155]: {
                  [MEGAETH_TESTNET_V1_CHAIN_ID]: true,
                  // to simulate the mainnet is not being enabled
                  '0x1': false,
                },
              },
            },
          },
        },
      };

      const expectedStorage = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
              },
              selectedNetworkClientId: 'mainnet',
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

      const newStorage = await migrate(oldStorage);

      expect(newStorage).toStrictEqual(expectedStorage);
    },
  );

  it('switchs to mainnet when the enabled network is MegaETH Testnet v1 and the selected network client id is not MegaETH Testnet v1', async () => {
    const mainnet = {
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

    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              ...mainnet,
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
            selectedNetworkClientId: 'mainnet',
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Eip155]: {
                '0x1': false,
                // Simulate the MegaETH Testnet v1 is enabled
                [MEGAETH_TESTNET_V1_CHAIN_ID]: true,
              },
            },
          },
        },
      },
    };

    const expectedStorage = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              ...mainnet,
              [MEGAETH_TESTNET_V2_CONFIG.chainId]: MEGAETH_TESTNET_V2_CONFIG,
            },
            selectedNetworkClientId: 'mainnet',
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

    const newStorage = await migrate(oldStorage);

    expect(newStorage).toStrictEqual(expectedStorage);
  });
});
