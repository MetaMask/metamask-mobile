
import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { NetworkConfiguration, RpcEndpointType } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';

import { ensureValidState } from './util';
import migrate from './072';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = () => ({
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
          '0xaa36a7': {
            chainId: '0xaa36a7',
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
                url: 'https://sepolia.infura.io/v3/{infuraProjectId}',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Sepolia',
            nativeCurrency: 'SepoliaETH',
          },
          '0xe705': {
            chainId: '0xe705',
            rpcEndpoints: [
              {
                networkClientId: 'linea-sepolia',
                url: 'https://linea-sepolia.infura.io/v3/{infuraProjectId}',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://sepolia.lineascan.build'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Linea Sepolia',
            nativeCurrency: 'LineaETH',
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
        },
      },
    }
  }
});

const createMegaEthTestnetConfiguration = (): NetworkConfiguration => ({
    chainId: '0x18c6',
    rpcEndpoints: [
      {
        networkClientId: 'megaeth-testnet',
        url: 'https://carrot.megaeth.com/rpc',
        type: RpcEndpointType.Custom,
        failoverUrls: [],
      },
    ],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: ['https://megaexplorer.xyz'],
    defaultBlockExplorerUrlIndex: 0,
    name: 'Mega Testnet',
    nativeCurrency: 'MegaETH',
});

describe('Migration 72: Add `MegaEth Testnet`', () => {
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

  it('adds `MegaEth Testnet` as default network to state', () => {
    const megaethTestnetConfiguration = createMegaEthTestnetConfiguration();
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController.networkConfigurationsByChainId,
              [megaethTestnetConfiguration.chainId]: megaethTestnetConfiguration
            },
          },
        }
      }
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('replaces `MegaEth Testnet` NetworkConfiguration if there is one', () => {
    const megaethTestnetConfiguration = createMegaEthTestnetConfiguration();
    const oldState = createTestState();
    const networkConfigurationsByChainId = oldState.engine.backgroundState.NetworkController.networkConfigurationsByChainId as Record<Hex, NetworkConfiguration>;
    networkConfigurationsByChainId[megaethTestnetConfiguration.chainId] = {
      ...megaethTestnetConfiguration,
      rpcEndpoints: [
        {
          networkClientId: 'some-client-id',
          url: 'https://some-url.com/rpc',
          type: RpcEndpointType.Custom,
        },
      ],
    };
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController.networkConfigurationsByChainId,
              [megaethTestnetConfiguration.chainId]: megaethTestnetConfiguration
            },
          },
        }
      }
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([{
    state: {
      engine: {}
    },
    test: 'empty engine state',
  }, {
    state: {
      engine: {
        backgroundState: {}
      }
    },
    test: 'empty backgroundState',
  }, {
    state: {
      engine: {
        backgroundState: {
          NetworkController: 'invalid'
        }
      },
    },
    test: 'invalid NetworkController state'
  }, {
    state: {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: 'invalid'
          }
        }
      },
    },
    test: 'invalid networkConfigurationsByChainId state'
  }
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
