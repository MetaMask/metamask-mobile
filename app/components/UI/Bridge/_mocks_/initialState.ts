import { defaultBridgeControllerState } from './bridgeControllerState';
import { CaipAssetId, Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';

export const ethChainId = '0x1' as Hex;
export const optimismChainId = '0xa' as Hex;

export const evmAccountId = 'evmAccountId';
export const evmAccountAddress =
  '0x1234567890123456789012345678901234567890' as Hex;

export const solanaAccountId = 'solanaAccountId';
export const solanaAccountAddress =
  'pXwSggYaFeUryz86UoCs9ugZ4VWoZ7R1U5CVhxYjL61';

// Ethereum tokens
export const ethToken1Address =
  '0x0000000000000000000000000000000000000001' as Hex;
export const ethToken2Address =
  '0x0000000000000000000000000000000000000002' as Hex;

// Optimism tokens
export const optimismToken1Address =
  '0x0000000000000000000000000000000000000003' as Hex;

// Solana tokens
export const solanaNativeTokenAddress =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501' as CaipAssetId;
export const solanaToken2Address =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as CaipAssetId;

export const initialState = {
  engine: {
    backgroundState: {
      BridgeController: defaultBridgeControllerState,
      TokenBalancesController: {
        tokenBalances: {
          [evmAccountAddress]: {
            [ethChainId]: {
              [ethToken1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
              [ethToken2Address]: '0x1bc16d674ec80000' as Hex, // 2 HELLO
            },
            [optimismChainId]: {
              [optimismToken1Address]: '0x4563918244f40000' as Hex, // 5 FOO on Optimism
            },
          },
        },
      },
      TokensController: {
        allTokens: {
          [ethChainId]: {
            [evmAccountAddress]: [
              {
                address: ethToken1Address,
                symbol: 'TOKEN1',
                decimals: 18,
                image: 'https://token1.com/logo.png',
                name: 'Token One',
                aggregators: ['1inch'],
              },
              {
                address: ethToken2Address,
                symbol: 'HELLO',
                decimals: 18,
                image: 'https://token2.com/logo.png',
                name: 'Hello Token',
                aggregators: ['uniswap'],
              },
            ],
          },
          [optimismChainId]: {
            [evmAccountAddress]: [
              {
                address: optimismToken1Address,
                symbol: 'FOO',
                decimals: 18,
                image: 'https://token3.com/logo.png',
                name: 'Foo Token',
                aggregators: ['1inch'],
              },
            ],
          },
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'ethNetworkClientId',
        networksMetadata: {
          mainnet: {
            EIPS: {
              1559: true,
            },
          },
          [optimismChainId]: {
            EIPS: {
              1559: true,
            },
          },
        },
        networkConfigurationsByChainId: {
          [ethChainId]: {
            chainId: ethChainId,
            rpcEndpoints: [
              {
                networkClientId: 'ethNetworkClientId',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
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
            name: 'Optimism',
          },
        },
        providerConfig: {
          chainId: ethChainId,
          ticker: 'ETH',
          rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
          type: 'infura',
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          [ethChainId]: {
            [evmAccountAddress]: {
              balance: '0x29a2241af62c0000' as Hex, // 3 ETH
            },
          },
          [optimismChainId]: {
            [evmAccountAddress]: {
              balance: '0x1158e460913d00000' as Hex, // 20 ETH on Optimism
            },
          },
        },
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet as const,
        multichainNetworkConfigurationsByChainId: {},
      },
      MultichainBalancesController: {
        balances: {
          [solanaAccountId]: {
            [solanaNativeTokenAddress]: {
              amount: '100.123',
              unit: 'SOL',
            },
            [solanaToken2Address]: {
              amount: '20000.456',
              unit: 'USDC',
            },
          },
        },
      },
      MultichainAssetsController: {
        accountsAssets: {
          [solanaAccountId]: [solanaNativeTokenAddress, solanaToken2Address],
        },
        assetsMetadata: {
          [solanaNativeTokenAddress]: {
            name: 'Solana',
            symbol: 'SOL',
            iconUrl:
              'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
            fungible: true as const,
            units: [
              {
                name: 'Solana',
                symbol: 'SOL',
                decimals: 9,
              },
            ],
          },
          [solanaToken2Address]: {
            name: 'USD Coin',
            symbol: 'USDC',
            iconUrl:
              'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
            fungible: true as const,
            units: [
              {
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 6,
              },
            ],
          },
        },
      },
      MultichainAssetsRatesController: {
        conversionRates: {
          [solanaNativeTokenAddress]: {
            rate: '100', // 1 SOL = 100 USD
            conversionTime: 0,
          },
          [solanaToken2Address]: {
            rate: '1', // 1 USDC = 1 USD
            conversionTime: 0,
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: evmAccountId,
          accounts: {
            [evmAccountId]: {
              id: evmAccountId,
              address: evmAccountAddress,
              name: 'Account 1',
              type: 'eip155:eoa' as const,
              metadata: {
                lastSelected: 0,
              },
            },
            [solanaAccountId]: {
              id: solanaAccountId,
              address: solanaAccountAddress,
              name: 'Account 2',
              type: 'solana:data-account' as const,
              metadata: {
                lastSelected: 0,
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
          [ethChainId]: {
            [ethToken1Address]: {
              tokenAddress: ethToken1Address,
              currency: 'ETH',
              price: 10, // 1 TOKEN1 = 10 ETH
            },
            [ethToken2Address]: {
              tokenAddress: ethToken2Address,
              currency: 'ETH',
              price: 50, // 1 HELLO = 50 ETH
            },
          },
          [optimismChainId]: {
            [optimismToken1Address]: {
              tokenAddress: optimismToken1Address,
              currency: 'ETH',
              price: 8, // 1 FOO = 8 ETH on Optimism
            },
          },
        },
      },
      PreferencesController: {
        tokenSortConfig: {
          key: 'tokenFiatAmount',
          order: 'dsc' as const,
        },
        tokenNetworkFilter: {
          [ethChainId]: 'true',
          [optimismChainId]: 'true',
        },
      },
      TokenListController: {
        tokensChainsCache: {
          [ethChainId]: {
            timestamp: Date.now(),
            data: {
              [ethToken1Address]: {
                name: 'Token One',
                symbol: 'TOKEN1',
                decimals: 18,
                address: ethToken1Address,
                iconUrl: 'https://token1.com/logo.png',
                occurrences: 1,
                aggregators: [],
              },
              [ethToken2Address]: {
                name: 'Hello Token',
                symbol: 'HELLO',
                decimals: 18,
                address: ethToken2Address,
                iconUrl: 'https://token2.com/logo.png',
              },
            },
          },
        },
      },
      SwapsController: {
        chainCache: {
          [ethChainId]: {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: [
              {
                address: ethToken1Address,
                symbol: 'TOKEN1',
              },
              {
                address: ethToken2Address,
                symbol: 'HELLO',
              },
            ],
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [optimismChainId]: {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
        },
      },
    },
  },
  bridge: {
    sourceAmount: undefined,
    destAmount: undefined,
    destChainId: undefined,
    sourceToken: undefined,
    destToken: undefined,
    selectedSourceChainIds: undefined,
    slippage: '0.5',
  },
};
