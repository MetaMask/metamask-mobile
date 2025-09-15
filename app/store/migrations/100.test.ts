import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './100';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

describe('Migration 100: Update Network Names', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: 'invalid',
          },
        },
      },
      test: 'invalid NetworkController state',
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
      test: 'invalid networkConfigurationsByChainId state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not update network names if they do not match the expected old names', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0xe708': {
                chainId: '0xe708',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-mainnet',
                    url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://lineascan.build'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Custom Linea Network',
                nativeCurrency: 'ETH',
              },
              '0x2105': {
                chainId: '0x2105',
                rpcEndpoints: [
                  {
                    networkClientId: 'base-mainnet',
                    url: 'https://base-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://basescan.org'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Custom Base Network',
                nativeCurrency: 'ETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = cloneDeep(oldState);

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('updates only the network names that match the expected old names', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0xe708': {
                chainId: '0xe708',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-mainnet',
                    url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://lineascan.build'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Linea Mainnet',
                nativeCurrency: 'ETH',
              },
              '0x2105': {
                chainId: '0x2105',
                rpcEndpoints: [
                  {
                    networkClientId: 'base-mainnet',
                    url: 'https://base-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://basescan.org'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Custom Base Network',
                nativeCurrency: 'ETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0xe708': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe708'],
                name: 'Linea',
              },
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('updates all network names from old to new names', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0xe708': {
                chainId: '0xe708',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-mainnet',
                    url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://lineascan.build'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Linea Mainnet',
                nativeCurrency: 'ETH',
              },
              '0x2105': {
                chainId: '0x2105',
                rpcEndpoints: [
                  {
                    networkClientId: 'base-mainnet',
                    url: 'https://base-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://basescan.org'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Base Mainnet',
                nativeCurrency: 'ETH',
              },
              '0xa4b1': {
                chainId: '0xa4b1',
                name: 'Arbitrum One',
                nativeCurrency: 'ETH',
                blockExplorerUrls: ['https://explorer.arbitrum.io'],
                defaultBlockExplorerUrlIndex: 0,
                defaultRpcEndpointIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://arbitrum-mainnet.infura.io/v3/b6bf7d3508c941499b10025c0776eaf8',
                    failoverUrls: [],
                    type: 'custom',
                    networkClientId: '468bc365-5ad9-4dd8-97af-86e3cf659252',
                  },
                ],
                lastUpdatedAt: 1757337866918,
              },
              '0xa86a': {
                chainId: '0xa86a',
                name: 'Avalanche Network C-Chain',
                nativeCurrency: 'AVAX',
                blockExplorerUrls: ['https://snowtrace.io/'],
                defaultBlockExplorerUrlIndex: 0,
                defaultRpcEndpointIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://avalanche-mainnet.infura.io/v3/b6bf7d3508c941499b10025c0776eaf8',
                    failoverUrls: [],
                    type: 'custom',
                    networkClientId: 'd75ade0c-2a53-4b4e-8acf-0a040216290f',
                  },
                ],
                lastUpdatedAt: 1757337870947,
              },
              '0x38': {
                chainId: '0x38',
                name: 'Binance Smart Chain',
                nativeCurrency: 'BNB',
                blockExplorerUrls: ['https://bscscan.com/'],
                defaultBlockExplorerUrlIndex: 0,
                defaultRpcEndpointIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://bsc-mainnet.infura.io/v3/b6bf7d3508c941499b10025c0776eaf8',
                    failoverUrls: [],
                    type: 'custom',
                    networkClientId: 'a2c6ed0c-3a18-4bae-874c-43ded891de40',
                  },
                ],
                lastUpdatedAt: 1757337874658,
              },
              '0xa': {
                chainId: '0xa',
                name: 'OP Mainnet',
                nativeCurrency: 'ETH',
                blockExplorerUrls: ['https://optimistic.etherscan.io/'],
                defaultBlockExplorerUrlIndex: 0,
                defaultRpcEndpointIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://optimism-mainnet.infura.io/v3/b6bf7d3508c941499b10025c0776eaf8',
                    failoverUrls: [],
                    type: 'custom',
                    networkClientId: 'c96c8704-0e00-409b-82ff-177ad023cfd9',
                  },
                ],
                lastUpdatedAt: 1757337879268,
              },
              '0x89': {
                chainId: '0x89',
                name: 'Polygon Mainnet',
                nativeCurrency: 'POL',
                blockExplorerUrls: ['https://polygonscan.com/'],
                defaultBlockExplorerUrlIndex: 0,
                defaultRpcEndpointIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://polygon-mainnet.infura.io/v3/b6bf7d3508c941499b10025c0776eaf8',
                    failoverUrls: [],
                    type: 'custom',
                    networkClientId: 'd46edd87-e0a1-44cf-86c5-a63c5a891c3b',
                  },
                ],
                lastUpdatedAt: 1757337882648,
              },
              '0x531': {
                chainId: '0x531',
                name: 'Sei Mainnet',
                nativeCurrency: 'SEI',
                blockExplorerUrls: ['https://seitrace.com/'],
                defaultBlockExplorerUrlIndex: 0,
                defaultRpcEndpointIndex: 0,
                rpcEndpoints: [
                  {
                    url: 'https://sei-mainnet.infura.io/v3/b6bf7d3508c941499b10025c0776eaf8',
                    type: 'custom',
                    networkClientId: 'f33b668a-4c7f-43b8-94fb-23383be1c2eb',
                  },
                ],
                lastUpdatedAt: 1757337886644,
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0xe708': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe708'],
                name: 'Linea',
              },
              '0x2105': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x2105'],
                name: 'Base',
              },
              '0xa4b1': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xa4b1'],
                name: 'Arbitrum',
              },
              '0xa86a': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xa86a'],
                name: 'Avalanche',
              },
              '0x38': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x38'],
                name: 'BNB Chain',
              },
              '0xa': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xa'],
                name: 'OP',
              },
              '0x89': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x89'],
                name: 'Polygon',
              },
              '0x531': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x531'],
                name: 'Sei',
              },
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles missing chain IDs gracefully', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              // Only includes one chain that should be updated
              '0xe708': {
                chainId: '0xe708',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-mainnet',
                    url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://lineascan.build'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Linea Mainnet',
                nativeCurrency: 'ETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0xe708': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe708'],
                name: 'Linea',
              },
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles networks with invalid structure gracefully', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0x1': {
                chainId: '0x1',
                rpcEndpoints: [
                  {
                    networkClientId: 'mainnet',
                    url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://etherscan.io'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Ethereum Mainnet',
                nativeCurrency: 'ETH',
              },
              '0xe708': 'invalid_network_config',
              '0x2105': {
                chainId: '0x2105',
                rpcEndpoints: [
                  {
                    networkClientId: 'base-mainnet',
                    url: 'https://base-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://basescan.org'],
                defaultBlockExplorerUrlIndex: 0,
                name: 'Base Mainnet',
                nativeCurrency: 'ETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0x2105': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x2105'],
                name: 'Base',
              },
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles networks without name property gracefully', () => {
    const oldState = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurationsByChainId: {
              '0xe708': {
                chainId: '0xe708',
                rpcEndpoints: [
                  {
                    networkClientId: 'linea-mainnet',
                    url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    type: 'infura',
                  },
                ],
                defaultRpcEndpointIndex: 0,
                blockExplorerUrls: ['https://lineascan.build'],
                defaultBlockExplorerUrlIndex: 0,
                // Missing name property
                nativeCurrency: 'ETH',
              },
            },
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const expectedState = cloneDeep(oldState);

    const migratedState = migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
