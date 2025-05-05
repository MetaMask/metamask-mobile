import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { swapsUtils } from '@metamask/swaps-controller/';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Asset, { getSwapsIsLive } from './';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { deepClone } from '@metamask/snaps-utils';

const mockInitialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
  inpageProvider: {
    networkId: '0x1',
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      TokensController: {
        allTokens: {
          '0x1': {
            '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': [],
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'selectedNetworkClientId',
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'selectedNetworkClientId',
              },
            ],
            defaultRpcEndpointIndex: 0,
            defaultBlockExplorerUrl: 0,
            blockExplorerUrls: ['https://block.com'],
          },
          '0x89': {
            chainId: '0x89',
            rpcEndpoints: [
              {
                networkClientId: 'otherNetworkClientId',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
      TransactionController: {
        transactions: [
          {
            txParams: {
              from: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
              to: '0x0000000000000000000000000000000000000000',
            },
            hash: '0x3148',
            status: 'confirmed',
            chainId: '0x1',
            networkID: '0x1',
            type: TransactionType.simpleSend,
          },
        ],
      },
    },
  },
};

jest.unmock('react-native/Libraries/Interaction/InteractionManager');

jest.mock('../../../core/Engine', () => {
  const {
    MOCK_ADDRESS_1,
  } = require('../../../util/test/accountsControllerTestUtils');

  return {
    context: {
      KeyringController: {
        getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  };
});

describe('Asset', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'ETH',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call navigation.setOptions on mount', () => {
    const mockSetOptions = jest.fn();
    renderWithProvider(
      <Asset
        navigation={{ setOptions: mockSetOptions }}
        route={{
          params: {
            symbol: 'BNB',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
        transactions={[]}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('should display swaps button if the asset is allowed', () => {
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'ETH',
            address: 'something',
            isETH: true,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should not display swaps button if the asset is not allowed', () => {
    jest.spyOn(swapsUtils, 'fetchSwapsFeatureFlags').mockRejectedValue('error');
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: jest.fn() }}
        route={{
          params: {
            symbol: 'AVAX',
            address: 'something',
            isETH: false,
            chainId: '0x1',
          },
        }}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});

describe('getSwapsIsLive', () => {
  const mockState = {
    swaps: {
      isLive: true,
      '0x1': { isLive: true },
    },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            bridgeConfig: {
              support: true,
              chains: {
                1: {
                  isActiveDest: true,
                  isActiveSrc: true,
                },
                1151111081099710: {
                  isActiveDest: true,
                  isActiveSrc: true,
                  refreshRate: 10000,
                  topAssets: [
                    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
                    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
                    '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxsDx8F8k8k3uYw1PDC',
                    '3iQL8BFS2vE7mww4ehAqQHAsbmRNCrPxizWAT2Zfyr9y',
                    '9zNQRsGLjNKwCUU5Gq5LR8beUCPzQMVMqKAi3SSZh54u',
                    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                    'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
                    '21AErpiB8uSb94oQKRcwuHqyHF93njAxBSbdUrpupump',
                  ],
                },
              },
              maxRefreshCount: 5,
              refreshRate: 30000,
            },
          },
        },
      },
    },
  };
  const mockRoute = {
    params: {
      chainId: '0x1',
    },
  };
  describe('EVM', () => {
    it('should return true for EVM chain when swaps is live', () => {
      const result = getSwapsIsLive(mockState, mockRoute);
      expect(result).toBe(true);
    });

    it('should return false for EVM chain when swaps is not live', () => {
      const result = getSwapsIsLive(
        {
          ...mockState,
          swaps: { ...mockState.swaps, '0x1': { isLive: false } },
        },
        mockRoute,
      );
      expect(result).toBe(false);
    });

    it('should return false for EVM chain when swaps state is null', () => {
      const result = getSwapsIsLive(
        {
          ...mockState,
          swaps: { ...mockState.swaps, '0x1': null },
        },
        mockRoute,
      );
      expect(result).toBe(false);
    });
  });

  describe('Solana', () => {
    it('should return true for Solana chain when bridge is enabled', () => {
      const result = getSwapsIsLive(mockState, {
        params: {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      });
      expect(result).toBe(true);
    });

    it('should return false for Solana chain when bridge is not enabled', () => {
      const newState = deepClone(mockState);
      newState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfig.chains[1151111081099710] =
        {
          isActiveDest: false,
          isActiveSrc: false,
        };
      const result = getSwapsIsLive(newState, {
        params: {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        },
      });
      expect(result).toBe(false);
    });
  });

  it('should handle portfolio view enabled case', () => {
    const result = getSwapsIsLive(mockState, mockRoute);
    expect(result).toBe(true);
  });

  it('should handle portfolio view disabled case', () => {
    const result = getSwapsIsLive(mockState, mockRoute);
    expect(result).toBe(true);
  });
});
