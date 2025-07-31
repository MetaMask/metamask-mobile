import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeState } from '../../../../../core/redux/slices/bridge';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import '../../_mocks_/initialState';
import BlockExplorersModal from './BlockExplorersModal';

describe('BlockExplorersModal', () => {
  const mockTx = {
    id: 'test-tx-id',
    chainId: '0x1',
    hash: '0x123',
    networkClientId: 'mainnet',
    time: Date.now(),
    txParams: {
      from: '0x123',
      to: '0x456',
      value: '0x0',
      data: '0x',
    },
    status: TransactionStatus.submitted,
  } as TransactionMeta;

  const mockProps = {
    route: {
      params: {
        evmTxMeta: mockTx,
      },
    },
  };

  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;
  const token3Address = '0x0000000000000000000000000000000000000003' as Hex;

  const mockState = {
    engine: {
      backgroundState: {
        ...initialBackgroundState,
        EarnController: {
          lending: {
            markets: [],
          },
        },
        RatesController: {
          rates: {},
          fiatCurrency: 'usd',
          cryptocurrencies: [],
        },
        PermissionController: undefined,
        GasFeeController: {
          gasFeeEstimates: {},
          estimatedGasFeeTimeBounds: {},
          gasEstimateType: 'none' as const,
          gasFeeEstimatesByChainId: {},
          nonRPCGasFeeApisDisabled: false,
        },
        BridgeStatusController: {
          txHistory: {
            [mockTx.id]: {
              txMetaId: mockTx.id,
              account: mockAddress,
              quote: {
                requestId: 'test-request-id',
                srcChainId: 1,
                srcAsset: {
                  chainId: 1,
                  address: token1Address,
                  decimals: 18,
                },
                destChainId: 10,
                destAsset: {
                  chainId: 10,
                  address: token2Address,
                  decimals: 18,
                },
                srcTokenAmount: '1000000000000000000',
                destTokenAmount: '2000000000000000000',
              },
              status: {
                srcChain: {
                  txHash: '0x123',
                },
                destChain: {
                  txHash: '0x456',
                },
              },
              startTime: Date.now(),
              estimatedProcessingTimeInSeconds: 300,
            },
          },
        },
        BridgeController: {
          quoteRequest: {
            slippage: 0.5,
          },
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            bridgeConfig: {
              maxRefreshCount: 5,
              refreshRate: 30000,
              support: true,
              chains: {
                [formatChainIdToCaip(mockChainId)]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                },
                [formatChainIdToCaip(optimismChainId)]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                },
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [mockChainId]: {
                [token1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 TOKEN2
              },
              [optimismChainId]: {
                [token3Address]: '0x29a2241af62c0000' as Hex, // 3 TOKEN3
              },
            },
          },
        },
        TokensController: {
          allTokens: {
            [mockChainId]: {
              [mockAddress]: [
                {
                  address: token1Address,
                  symbol: 'TOKEN1',
                  decimals: 18,
                  image: 'https://token1.com/logo.png',
                  name: 'Token One',
                  aggregators: ['1inch'],
                },
                {
                  address: token2Address,
                  symbol: 'TOKEN2',
                  decimals: 18,
                  image: 'https://token2.com/logo.png',
                  name: 'Token Two',
                  aggregators: ['uniswap'],
                },
              ],
            },
            [optimismChainId]: {
              [mockAddress]: [
                {
                  address: token3Address,
                  symbol: 'TOKEN3',
                  decimals: 18,
                  image: 'https://token3.com/logo.png',
                  name: 'Token Three',
                  aggregators: ['optimism'],
                  chainId: optimismChainId,
                },
              ],
            },
          },
          tokens: [
            {
              address: token1Address,
              symbol: 'TOKEN1',
              decimals: 18,
              image: 'https://token1.com/logo.png',
              name: 'Token One',
              aggregators: ['1inch'],
              chainId: mockChainId,
            },
            {
              address: token2Address,
              symbol: 'TOKEN2',
              decimals: 18,
              image: 'https://token2.com/logo.png',
              name: 'Token Two',
              aggregators: ['uniswap'],
              chainId: mockChainId,
            },
            {
              address: token3Address,
              symbol: 'TOKEN3',
              decimals: 18,
              image: 'https://token3.com/logo.png',
              name: 'Token Three',
              aggregators: ['optimism'],
              chainId: optimismChainId,
            },
          ],
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networksMetadata: {
            mainnet: {
              EIPS: {
                1559: true,
              },
            },
            selectedNetworkClientId: {
              EIPS: {
                1559: true,
              },
            },
            '0xa': {
              EIPS: {
                1559: true,
              },
            },
          },
          networkConfigurationsByChainId: {
            [mockChainId]: {
              chainId: mockChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
              name: 'Ethereum Mainnet',
            },
            [optimismChainId]: {
              chainId: optimismChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'optimismNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              ticker: 'ETH',
              nickname: 'Optimism',
              name: 'Optimism',
            },
          },
          providerConfig: {
            chainId: mockChainId,
            ticker: 'ETH',
            type: 'infura',
          },
        },
        AccountTrackerController: {
          accounts: {
            [mockAddress]: {
              balance: '0x29a2241af62c0000' as Hex, // 3 ETH
            },
          },
          accountsByChainId: {
            [mockChainId]: {
              [mockAddress]: {
                balance: '0x29a2241af62c0000' as Hex, // 3 ETH
              },
            },
            [optimismChainId]: {
              [mockAddress]: {
                balance: '0x1158e460913d00000' as Hex, // 20 ETH on Optimism
              },
            },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: mockAddress,
                name: 'Account 1',
              },
            },
          },
        },
        AccountTreeController: {
          accountTree: {
            selectedAccountGroup: '' as const,
            wallets: {
              'keyring:default/1': {
                id: 'keyring:default/1' as const,
                groups: {
                  'keyring:default/1': {
                    id: 'keyring:default/1' as const,
                    accounts: ['account1'],
                    metadata: {
                      name: 'Account 1',
                    },
                  },
                },
              },
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: 2000, // 1 ETH = $2000
            },
          },
          conversionRate: 2000,
        },
        TokenRatesController: {
          marketData: {
            [mockChainId]: {
              [ethers.constants.AddressZero as Hex]: {
                tokenAddress: ethers.constants.AddressZero as Hex,
                currency: 'ETH',
                price: 1, // 1 ETH = 1 ETH
              },
              [token1Address]: {
                tokenAddress: token1Address,
                currency: 'ETH',
                price: 10, // 1 TOKEN1 = 10 ETH
              },
              [token2Address]: {
                tokenAddress: token2Address,
                currency: 'ETH',
                price: 5, // 1 TOKEN2 = 5 ETH
              },
            },
            [optimismChainId]: {
              [token3Address]: {
                tokenAddress: token3Address,
                currency: 'ETH',
                price: 8, // 1 TOKEN3 = 8 ETH on Optimism
              },
            },
          },
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc' as const,
          },
          ipfsGateway: 'https://dweb.link/ipfs/',
          tokenNetworkFilter: {
            [mockChainId]: 'true',
            [optimismChainId]: 'true',
          },
        },
        TokenListController: {
          tokenList: {
            [token3Address]: {
              name: 'Token Three',
              symbol: 'TOKEN3',
              decimals: 18,
              address: token3Address,
              iconUrl: 'https://token3.com/logo.png',
              occurrences: 1,
              aggregators: [],
            },
          },
          tokensChainsCache: {
            [mockChainId]: {
              timestamp: Date.now(),
              data: {
                [token3Address]: {
                  name: 'Token Three',
                  symbol: 'TOKEN3',
                  decimals: 18,
                  address: token3Address,
                  iconUrl: 'https://token3.com/logo.png',
                  occurrences: 1,
                  aggregators: [],
                },
              },
            },
            [optimismChainId]: {
              timestamp: Date.now(),
              data: {
                [token3Address]: {
                  name: 'Token Three',
                  symbol: 'TOKEN3',
                  decimals: 18,
                  address: token3Address,
                  iconUrl: 'https://token3.com/logo.png',
                  occurrences: 1,
                  aggregators: ['optimism'],
                },
              },
            },
          },
        },
        PerpsController: {
          connectionStatus: 'disconnected' as const,
        },
      },
    },
    settings: {
      basicFunctionalityEnabled: true,
    },
    bridge: {
      sourceToken: {
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
        image: 'https://example.com/image.png',
        chainId: '0x1' as Hex,
      },
      destToken: undefined,
      sourceAmount: undefined,
      destAmount: undefined,
      selectedDestChainId: undefined,
      selectedSourceChainIds: [mockChainId, optimismChainId],
    } as BridgeState,
  };

  it('should render without crashing', () => {
    const { getByText } = renderScreen(
      () => <BlockExplorersModal {...mockProps} />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );
    expect(getByText('View on Block Explorer')).toBeTruthy();
  });

  it('should display both source and destination chain block explorer buttons', () => {
    const { getAllByText } = renderScreen(
      () => <BlockExplorersModal {...mockProps} />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: mockState },
    );
    const etherscanButtons = getAllByText('Etherscan');
    expect(etherscanButtons).toHaveLength(2);
  });

  it('should handle missing destination chain transaction hash', () => {
    const modifiedState = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          BridgeStatusController: {
            txHistory: {
              [mockTx.id]: {
                ...mockState.engine.backgroundState.BridgeStatusController
                  .txHistory[mockTx.id],
                status: {
                  srcChain: {
                    txHash: '0x123',
                  },
                  destChain: {
                    txHash: undefined,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { getAllByText } = renderScreen(
      () => <BlockExplorersModal {...mockProps} />,
      {
        name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      },
      { state: modifiedState },
    );
    const etherscanButtons = getAllByText('Etherscan');
    expect(etherscanButtons).toHaveLength(1);
  });
});
