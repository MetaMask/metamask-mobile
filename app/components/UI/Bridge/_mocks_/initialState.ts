import { defaultBridgeControllerState } from './bridgeControllerState';
import { CaipAssetId, Hex } from '@metamask/utils';
import {
  SolScope,
  EthScope,
  EthAccountType,
  SolAccountType,
  BtcScope,
  BtcAccountType,
  TrxScope,
  TrxAccountType,
} from '@metamask/keyring-api';
import { AccountWalletType, AccountGroupType } from '@metamask/account-api';
import { ethers } from 'ethers';
import { formatChainIdToCaip, StatusTypes } from '@metamask/bridge-controller';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';

jest.mock(
  '../../../../core/redux/slices/bridge/utils/hasMinimumRequiredVersion',
  () => ({
    hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
  }),
);

export const ethChainId = '0x1' as Hex;
export const optimismChainId = '0xa' as Hex;

export const evmAccountId = 'evmAccountId';
export const evmAccountAddress =
  '0x1234567890123456789012345678901234567890' as Hex;

export const solanaAccountId = 'solanaAccountId';
export const solanaAccountAddress =
  'pXwSggYaFeUryz86UoCs9ugZ4VWoZ7R1U5CVhxYjL61';

export const btcAccountId = 'btcAccountId';
export const btcAccountAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

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

export const btcNativeTokenAddress =
  'bip122:000000000019d6689c085ae165831e93/slip44:0' as CaipAssetId;

// Tron account and tokens
export const trxAccountId = 'trxAccountId';
export const trxAccountAddress = 'TN3W4Bb1JVHPiWJVm7d9q9qHGXSdoMrMrE';
export const trxNativeTokenAddress = 'tron:728126428/slip44:195' as CaipAssetId;

export const initialState = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          bridgeConfig: {
            minimumVersion: '0.0.0',
            maxRefreshCount: 5,
            refreshRate: 30000,
            support: true,
            chains: {
              [formatChainIdToCaip(ethChainId)]: {
                isActiveSrc: true,
                isActiveDest: true,
              },
              [formatChainIdToCaip(optimismChainId)]: {
                isActiveSrc: true,
                isActiveDest: true,
              },
            },
          },
          bridgeConfigV2: {
            minimumVersion: '0.0.0',
            maxRefreshCount: 5,
            refreshRate: 30000,
            support: true,
            chains: {
              [formatChainIdToCaip(ethChainId)]: {
                isActiveSrc: true,
                isActiveDest: true,
                isGaslessSwapEnabled: true,
              },
              [formatChainIdToCaip(optimismChainId)]: {
                isActiveSrc: true,
                isActiveDest: true,
                isGaslessSwapEnabled: false,
              },
              [SolScope.Mainnet]: {
                isActiveSrc: true,
                isActiveDest: true,
                isGaslessSwapEnabled: false,
              },
              [BtcScope.Mainnet]: {
                isActiveSrc: true,
                isActiveDest: true,
                isGaslessSwapEnabled: false,
              },
              [TrxScope.Mainnet]: {
                isActiveSrc: true,
                isActiveDest: true,
                isGaslessSwapEnabled: false,
              },
            },
            bip44DefaultPairs: {
              bip122: {
                other: {},
                standard: {
                  'bip122:000000000019d6689c085ae165831e93/slip44:0':
                    'eip155:1/slip44:60',
                },
              },
              eip155: {
                other: {},
                standard: {
                  'eip155:1/slip44:60':
                    'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
                },
              },
              solana: {
                other: {},
                standard: {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501':
                    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                },
              },
            },
          },
        },
      },
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
        selectedNetworkClientId: 'mainnet',
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
          selectedNetworkClientId: {
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
                networkClientId: 'mainnet',
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
        multichainNetworkConfigurationsByChainId: {
          [SolScope.Mainnet]: {
            chainId: SolScope.Mainnet,
            name: 'Solana',
            nativeCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501' as const,
            isEvm: false as const,
          },
          [BtcScope.Mainnet]: {
            chainId: 'bip122:000000000019d6689c085ae165831e93' as const,
            name: 'Bitcoin',
            nativeCurrency:
              'bip122:000000000019d6689c085ae165831e93/slip44:0' as const,
            isEvm: false as const,
          },
          [TrxScope.Mainnet]: {
            chainId: TrxScope.Mainnet,
            name: 'Tron',
            nativeCurrency: 'tron:728126428/slip44:195' as const,
            isEvm: false as const,
          },
        },
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
          [btcAccountId]: {
            [btcNativeTokenAddress]: {
              amount: '0.015',
              unit: 'BTC',
            },
          },
          [trxAccountId]: {
            [trxNativeTokenAddress]: {
              amount: '500',
              unit: 'TRX',
            },
          },
        },
      },
      MultichainAssetsController: {
        accountsAssets: {
          [solanaAccountId]: [solanaNativeTokenAddress, solanaToken2Address],
          [btcAccountId]: [btcNativeTokenAddress],
          [trxAccountId]: [trxNativeTokenAddress],
        },
        assetsMetadata: {
          [btcNativeTokenAddress]: {
            fungible: true as const,
            name: 'Bitcoin',
            units: [
              {
                name: 'Bitcoin',
                decimals: 8,
                symbol: 'BTC',
              },
              {
                name: 'CentiBitcoin',
                decimals: 6,
                symbol: 'cBTC',
              },
              {
                name: 'MilliBitcoin',
                decimals: 5,
                symbol: 'mBTC',
              },
              {
                name: 'Bit',
                decimals: 2,
                symbol: 'bits',
              },
              {
                name: 'Satoshi',
                decimals: 0,
                symbol: 'satoshi',
              },
            ],
            iconUrl: 'btcIconUrl',
            symbol: 'BTC',
          },
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
          [trxNativeTokenAddress]: {
            name: 'Tron',
            symbol: 'TRX',
            iconUrl: 'https://tron.network/static/images/logo.png',
            fungible: true as const,
            units: [
              {
                name: 'Tron',
                symbol: 'TRX',
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
          [btcNativeTokenAddress]: {
            rate: '100000', // 1 BTC = 100000 USD
            conversionTime: 0,
          },
          [trxNativeTokenAddress]: {
            rate: '0.10', // 1 TRX = 0.10 USD
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
              type: EthAccountType.Eoa,
              scopes: [EthScope.Eoa],
              metadata: {
                lastSelected: 0,
              },
            },
            [solanaAccountId]: {
              id: solanaAccountId,
              address: solanaAccountAddress,
              name: 'Account 2',
              type: SolAccountType.DataAccount,
              scopes: [SolScope.Mainnet],
              metadata: {
                lastSelected: 0,
              },
            },
            [btcAccountId]: {
              id: btcAccountId,
              address: btcAccountAddress,
              name: 'Account 3',
              type: BtcAccountType.P2wpkh,
              scopes: [BtcScope.Mainnet],
              metadata: {
                lastSelected: 0,
              },
            },
            [trxAccountId]: {
              id: trxAccountId,
              address: trxAccountAddress,
              name: 'Account 4',
              type: TrxAccountType.Eoa,
              scopes: [TrxScope.Mainnet],
              metadata: {
                lastSelected: 0,
              },
            },
          },
        },
      },
      AccountTreeController: {
        accountTree: {
          selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
          wallets: {
            [`${AccountWalletType.Entropy}:wallet1`]: {
              id: `${AccountWalletType.Entropy}:wallet1`,
              type: AccountWalletType.Entropy,
              metadata: {
                name: 'Test Wallet 1',
                entropy: {
                  id: 'wallet1',
                },
              },
              groups: {
                [`${AccountWalletType.Entropy}:wallet1/0`]: {
                  id: `${AccountWalletType.Entropy}:wallet1/0`,
                  type: AccountGroupType.MultichainAccount,
                  metadata: {
                    name: 'Test Group 1',
                    pinned: false,
                    hidden: false,
                    entropy: {
                      groupIndex: 0,
                    },
                  },
                  accounts: [
                    evmAccountId,
                    solanaAccountId,
                    btcAccountId,
                    trxAccountId,
                  ],
                },
              },
            },
          },
        } as AccountTreeControllerState['accountTree']['wallets'],
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          liveness: true,
        },
      },
      TransactionController: {
        transactions: [],
        transactionBatches: [],
      },
      GasFeeController: {
        gasFeeEstimatesByChainId: {
          [ethChainId]: {
            gasFeeEstimates: undefined,
            estimatedGasFeeTimeBounds: undefined,
            gasEstimateType: 'eth_gasPrice' as const,
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
            [ethers.constants.AddressZero as Hex]: {
              tokenAddress: ethers.constants.AddressZero as Hex,
              currency: 'ETH',
              price: 1, // 1 ETH = 1 ETH
            },
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
          [ethChainId]: true,
          [optimismChainId]: true,
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
      KeyringController: {
        vault: '',
        isUnlocked: true,
        keyrings: [
          {
            accounts: [evmAccountAddress],
            type: 'HD Key Tree',
            metadata: {
              id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
              name: '',
            },
          },
          {
            accounts: [solanaAccountAddress],
            type: 'Snap Keyring',
            metadata: {
              id: '01JKZ56KRVYEEHC601HSNW28T2',
              name: '',
            },
          },
        ],
        encryptionKey: '',
        encryptionSalt: '',
      },
      BridgeStatusController: {
        txHistory: {
          'test-tx-id': {
            txMetaId: 'test-tx-id',
            account: evmAccountAddress,
            quote: {
              requestId: 'test-request-id',
              srcChainId: 1,
              srcAsset: {
                chainId: 1,
                address: '0x123',
                decimals: 18,
                symbol: 'TOKEN1',
                name: 'Token One',
              },
              destChainId: 10,
              destAsset: {
                chainId: 10,
                address: '0x456',
                decimals: 18,
                symbol: 'TOKEN2',
                name: 'Token Two',
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
              status: StatusTypes.COMPLETE,
            },
            startTime: Date.now(),
            estimatedProcessingTimeInSeconds: 300,
          },
          'solana-swap-tx': {
            quote: {
              srcChainId: 1151111081099710, // Solana Mainnet
              destChainId: 1151111081099710, // Same chain = swap
              srcAsset: {
                address: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                decimals: 9,
                name: 'Solana',
              },
              destAsset: {
                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
              srcTokenAmount: '1000000000',
              destTokenAmount: '100000000',
            },
            status: {
              status: StatusTypes.PENDING,
              srcChain: {
                txHash: 'solana-tx-hash-123',
              },
            },
            account: 'pXwSggYaFeUryz86UoCs9ugZ4VWoZ7R1U5CVhxYjL61', // Solana account from initialState
            startTime: Date.now(),
            estimatedProcessingTimeInSeconds: 60,
          },
        },
      },
    },
  },
  bridge: {
    sourceAmount: undefined,
    destAmount: undefined,
    destAddress: undefined,
    sourceToken: undefined,
    destToken: undefined,
    selectedSourceChainIds: undefined,
    selectedDestChainId: undefined,
    slippage: '0.5',
    isSubmittingTx: false,
    bridgeViewMode: undefined,
    isSelectingRecipient: false,
  },
};
