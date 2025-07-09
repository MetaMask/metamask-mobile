import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import {
  NetworkConfiguration,
} from '@metamask/network-controller';
import { Hex } from '@metamask/utils';

import { ensureValidState } from './util';
import migrate from './089';

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
            defaultRpcEndpointIndex: undefined,
            blockExplorerUrls: [],
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
            defaultRpcEndpointIndex: undefined,
            blockExplorerUrls: [],
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
            defaultRpcEndpointIndex: undefined,
            blockExplorerUrls: [],
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
            defaultRpcEndpointIndex: undefined,
            blockExplorerUrls: [],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Linea Mainnet',
            nativeCurrency: 'ETH',
          },
          '0x2105': {
            chainId: '0x2105',
            rpcEndpoints: [
              {
                networkClientId: 'Base',
                url: 'https://base-mainnet.infura.io/v3/{infuraProjectId}',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: undefined,
            blockExplorerUrls: [],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Base Mainnet',
            nativeCurrency: 'ETH',
          },
        },
      },
    },
  },
});

describe('Migration 89: Re-Fill BlockExploer URLs for Mainnet, Sepolia, Linea Mainnet, Linea Sepolia, and Base.`', () => {
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

  it('Re-fills BlockExploer URLs for Mainnet, Sepolia, Linea Mainnet, Linea Sepolia, and Base.', () => {
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0x1' : {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x1'],
                blockExplorerUrls: [
                  'https://etherscan.io/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0xaa36a7': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xaa36a7'],
                blockExplorerUrls: [
                  'https://sepolia.etherscan.io/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0xe705': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe705'],
                blockExplorerUrls: [
                  'https://sepolia.lineascan.build/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0xe708': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe708'],
                blockExplorerUrls: [
                  'https://lineascan.build/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0x2105': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x2105'],
                blockExplorerUrls: [
                  'https://basescan.org/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              }
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('Only re-fills BlockExploer URLs for Mainnet, Sepolia, Linea Mainnet, Linea Sepolia, and Base if they are not present.', () => {
    const oldState = createTestState();
    const networkConfigurationsByChainId = oldState.engine.backgroundState.NetworkController.networkConfigurationsByChainId as unknown as Record<Hex, NetworkConfiguration>;
    // Simulate there is a existing block explorer URL in Mainnet
    networkConfigurationsByChainId['0x1'].blockExplorerUrls = [
      'https://custom-etherscan.io/',
    ];
    networkConfigurationsByChainId['0x1'].defaultBlockExplorerUrlIndex = 0;

    mockedEnsureValidState.mockReturnValue(true);

    // Expecting the migration to only update Sepolia, Linea Mainnet, Linea Sepolia, and Base
    const expectedData = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...oldState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...oldState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              '0xaa36a7': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xaa36a7'],
                blockExplorerUrls: [
                  'https://sepolia.etherscan.io/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0xe705': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe705'],
                blockExplorerUrls: [
                  'https://sepolia.lineascan.build/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0xe708': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0xe708'],
                blockExplorerUrls: [
                  'https://lineascan.build/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              },
              '0x2105': {
                ...oldState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId['0x2105'],
                blockExplorerUrls: [
                  'https://basescan.org/',
                ],
                defaultBlockExplorerUrlIndex: 0,
              }
            },
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
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
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        'Migration 89: NetworkController or networkConfigurationsByChainId not found in state',
      ),
    );
  });
});
