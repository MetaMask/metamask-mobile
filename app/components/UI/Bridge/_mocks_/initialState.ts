import { CaipAssetId, Hex } from '@metamask/utils';
import { formatChainIdToCaip , BridgeFeatureFlagsKey } from '@metamask/bridge-controller';

const ethChainId = '0x1' as Hex;
const optimismChainId = '0xa' as Hex;
const mockEvmAddress = '0x1234567890123456789012345678901234567890' as Hex;
const mockSolanaAddress = 'kljad90afSCjkladasASKLSD' as Hex;

// Ethereum tokens
export const ethToken1Address = '0x0000000000000000000000000000000000000001' as Hex;
export const ethToken2Address = '0x0000000000000000000000000000000000000002' as Hex;

// Optimism tokens
export const optimismToken1Address = '0x0000000000000000000000000000000000000003' as Hex;

// Solana tokens
export const solanaToken1Address = 'solana:mainnet/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as CaipAssetId;

export const initialState = {
  engine: {
    backgroundState: {
      BridgeController: {
        bridgeFeatureFlags: {
          [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
            chains: {
              [formatChainIdToCaip(ethChainId)]: { isActiveSrc: true, isActiveDest: true },
              [formatChainIdToCaip(optimismChainId)]: { isActiveSrc: true, isActiveDest: true },
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [mockEvmAddress]: {
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
            [mockEvmAddress]: [
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
            [mockEvmAddress]: [
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
        tokens: [
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
        accounts: {
          [mockEvmAddress]: {
            balance: '0x29a2241af62c0000' as Hex, // 3 ETH
          },
        },
        accountsByChainId: {
          [ethChainId]: {
            [mockEvmAddress]: {
              balance: '0x29a2241af62c0000' as Hex, // 3 ETH
            },
          },
          [optimismChainId]: {
            [mockEvmAddress]: {
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
      MultichainBalancesController: {
        balances: {
          [mockSolanaAddress]: {
            [solanaToken1Address]: {
              amount: '100',
              unit: 'USDC',
            },
          },
        },
      },
      MultichainAssetsController: {
        accountsAssets: {
          [mockSolanaAddress]: [
            solanaToken1Address,
          ],
        },
        assetsMetadata: {
          [solanaToken1Address]: {
            name: 'USD Coin',
            symbol: 'USDC',
            iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
            fungible: true as const,
            units: [
              {
                name: 'USDC',
                symbol: 'USDC',
                decimals: 6,
              },
            ],
          },
        },
      },
      MultichainAssetsRatesController: {
        conversionRates: {
          [solanaToken1Address]: {
            rate: '1',
            conversionTime: 0,
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account1',
          accounts: {
            account1: {
              id: 'account1',
              address: mockEvmAddress,
              name: 'Account 1',
              type: 'eip155:eoa' as const,
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
        tokenList: {
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
  },
};
