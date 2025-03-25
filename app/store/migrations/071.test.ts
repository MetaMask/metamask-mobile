import { ChainId, BuiltInNetworkName } from '@metamask/controller-utils';
import { getDefaultNetworkControllerState } from '@metamask/network-controller';
import * as networkController from '@metamask/network-controller';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import migrate from './071';
import { cloneDeep } from 'lodash';

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

describe('Migration 71: Add `MegaEth Testnet`', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('adds `MegaEth Testnet` as default network to state', () => {
    const oldState = createTestState()
    const megaethTestnetChainId = ChainId[BuiltInNetworkName.MegaETHTestnet];
    const defaultState = getDefaultNetworkControllerState([megaethTestnetChainId]);
    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController.networkConfigurationsByChainId,
              [megaethTestnetChainId]: defaultState.networkConfigurationsByChainId[megaethTestnetChainId]
            },
          },
        }
      }
    };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures expection if `MegaETH Testnet` configuration not found from getDefaultNetworkControllerState()', () => {
    const oldState = createTestState()
    const orgState = cloneDeep(oldState);
    // Mocking the getDefaultNetworkControllerState to return configuration for all networks except MegaETH Testnet
    jest.spyOn(networkController, 'getDefaultNetworkControllerState').mockReturnValue({
      // getDefaultNetworkControllerState() with no arguments will return all default infura networks only
      ...getDefaultNetworkControllerState()
    })
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
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
          NetworkController: "invalid"
        }
      },
    },
    test: 'invalid NetworkController state'
  }, {
    state: {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: "invalid"
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
    expect(migratedState).toEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
