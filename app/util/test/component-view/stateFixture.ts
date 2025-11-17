import type { DeepPartial } from '../renderWithProvider';
import type { RootState } from '../../../reducers';
import baseDeviceState from '../../../../state-logs-v7.59.0-(2968).json';

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

export function deepMerge<T extends PlainObject, U extends PlainObject>(
  target: T,
  source: U,
): T & U {
  const output: PlainObject = { ...target };
  Object.keys(source).forEach((key) => {
    const sourceValue = (source as PlainObject)[key];
    const targetValue = (output as PlainObject)[key];
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      (output as PlainObject)[key] = deepMerge(
        targetValue as PlainObject,
        sourceValue as PlainObject,
      );
    } else {
      (output as PlainObject)[key] = sourceValue;
    }
  });
  return output as T & U;
}

export const defaultFeatureFlags: Record<string, unknown> = {
  enableMultichainAccountsState2: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  enableMultichainAccounts: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  rewardsEnabled: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  rewardsAnnouncementModalEnabled: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  rewardsEnableCardSpend: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  perpsPerpTradingEnabled: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  perpsPerpTradingServiceInterruptionBannerEnabled: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
  perpsPerpGtmOnboardingModalEnabled: {
    enabled: false,
    featureVersion: null,
    minimumVersion: null,
  },
};

export function createFeatureFlags(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return deepMerge(
    defaultFeatureFlags as PlainObject,
    overrides as PlainObject,
  );
}

function deriveSelectedAccountId(
  accountsCtl:
    | {
        internalAccounts?: {
          accounts?: Record<string, { id: string }>;
          selectedAccount?: string;
        };
      }
    | undefined,
): string {
  const availableAccounts = accountsCtl?.internalAccounts?.accounts ?? {};
  const selectedAccountId =
    accountsCtl?.internalAccounts?.selectedAccount ??
    Object.keys(availableAccounts)[0];
  return typeof selectedAccountId === 'string' ? selectedAccountId : '';
}

export function buildNormalizedAccountTree(
  bg: Record<string, unknown>,
): Record<string, unknown> {
  const accountsCtl = (bg?.AccountsController ?? {}) as {
    internalAccounts?: {
      accounts?: Record<string, { id: string }>;
      selectedAccount?: string;
    };
  };
  const selectedAccountId = deriveSelectedAccountId(accountsCtl);
  const GROUP_ID = 'entropy:wallet1/0';
  const WALLETS_KEY = 'entropy:wallet1';
  return {
    selectedAccountGroup: GROUP_ID,
    wallets: {
      [WALLETS_KEY]: {
        id: WALLETS_KEY,
        type: 'Entropy',
        metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
        groups: {
          [GROUP_ID]: {
            id: GROUP_ID,
            type: 'MultipleAccount',
            metadata: { name: 'Group 1', pinned: false, hidden: false },
            accounts: selectedAccountId ? [selectedAccountId] : [],
          },
        },
      },
    },
  };
}

export function loadBaseState(): DeepPartial<RootState> {
  return baseDeviceState as unknown as DeepPartial<RootState>;
}

export interface StateFixtureBuilder {
  withRemoteFeatureFlags(
    overrides: Record<string, unknown>,
  ): StateFixtureBuilder;
  withPreferences(overrides: Record<string, unknown>): StateFixtureBuilder;
  withMinimalAccounts(selectedAddress?: string): StateFixtureBuilder;
  withMinimalMainnetNetwork(): StateFixtureBuilder;
  withMinimalSmartTransactions(): StateFixtureBuilder;
  withMinimalGasFee(): StateFixtureBuilder;
  withMinimalTransactionController(): StateFixtureBuilder;
  withMinimalKeyringController(): StateFixtureBuilder;
  withMinimalMultichainNetwork(isEvmSelected?: boolean): StateFixtureBuilder;
  withMinimalBridgeController(): StateFixtureBuilder;
  withMinimalTokenRates(): StateFixtureBuilder;
  withMinimalMultichainAssetsRates(): StateFixtureBuilder;
  withMinimalMultichainBalances(): StateFixtureBuilder;
  withMinimalMultichainAssets(): StateFixtureBuilder;
  withMinimalMultichainTransactions(): StateFixtureBuilder;
  withBridgeRecommendedQuoteEvmSimple(params?: {
    srcAmount?: string;
    srcTokenAddress?: string;
    destTokenAddress?: string;
    chainIdHex?: string;
  }): StateFixtureBuilder;
  withAccountTreeForSelectedAccount(): StateFixtureBuilder;
  withOverrides(overrides: DeepPartial<RootState>): StateFixtureBuilder;
  build(): DeepPartial<RootState>;
}

export function createStateFixture(options?: {
  base?: 'device' | 'empty';
}): StateFixtureBuilder {
  const baseOption = options?.base ?? 'device';
  const baseState =
    baseOption === 'device'
      ? loadBaseState()
      : ({
          engine: { backgroundState: {} },
          settings: {},
        } as unknown as DeepPartial<RootState>);
  let current: DeepPartial<RootState> = baseState;

  const api: StateFixtureBuilder = {
    withRemoteFeatureFlags(overrides) {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      const mergedFlags = createFeatureFlags(overrides);
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              RemoteFeatureFlagController: {
                ...((bg as PlainObject)
                  ?.RemoteFeatureFlagController as PlainObject),
                remoteFeatureFlags: mergedFlags,
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withBridgeRecommendedQuoteEvmSimple(params) {
      const {
        srcAmount = '1000000000000000000', // 1 ETH in wei
        srcTokenAddress = '0x0000000000000000000000000000000000000000',
        destTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainIdHex = '0x1',
      } = params ?? {};
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      const now = Date.now();
      const numericChainId = parseInt(chainIdHex, 16);
      const quoteResponse = {
        quote: {
          requestId: 'req-1',
          srcChainId: numericChainId,
          destChainId: numericChainId,
          srcAsset: {
            chainId: numericChainId,
            address: srcTokenAddress,
            decimals: 18,
            symbol: 'ETH',
            name: 'Ether',
          },
          destAsset: {
            chainId: numericChainId,
            address: destTokenAddress,
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
          },
          srcTokenAmount: srcAmount,
          destTokenAmount: '1000000', // 1 USDC (6 decimals)
          feeData: {
            metabridge: {
              amount: '0',
              asset: {
                address: srcTokenAddress,
                chainId: numericChainId,
                decimals: 18,
                symbol: 'ETH',
                name: 'Ether',
              },
            },
          },
          gasIncluded: false,
          priceData: { priceImpact: '0.01' },
        },
        totalNetworkFee: { amount: '0.001', valueInCurrency: '2' },
        estimatedProcessingTimeInSeconds: 30,
      };
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              RemoteFeatureFlagController: {
                ...((bg as PlainObject)
                  ?.RemoteFeatureFlagController as PlainObject),
                remoteFeatureFlags: {
                  bridgeConfig: {
                    minimumVersion: '0.0.0',
                    maxRefreshCount: 5,
                    refreshRate: 30000,
                    support: true,
                    chains: {
                      // enable mainnet as src/dest
                      [`eip155:${parseInt(chainIdHex, 16)}`]: {
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
                      // enable mainnet as src/dest
                      [`eip155:${parseInt(chainIdHex, 16)}`]: {
                        isActiveSrc: true,
                        isActiveDest: true,
                        isGaslessSwapEnabled: false,
                      },
                    },
                  },
                },
              },
              CurrencyRateController: {
                currentCurrency: 'USD',
                currencyRates: {
                  ETH: { conversionRate: 2000 },
                },
                conversionRate: 2000,
              },
              TokenRatesController: {
                marketData: {},
              },
              MultichainAssetsRatesController: {
                conversionRates: {},
              },
              BridgeController: {
                quoteRequest: {
                  srcChainId: numericChainId,
                  srcTokenAddress,
                  destChainId: numericChainId,
                  destTokenAddress,
                  destAddress: '',
                  srcAmount,
                  slippage: 0.005,
                },
                quotes: [quoteResponse],
                recommendedQuote: quoteResponse,
                quotesLastFetched: now,
                quotesLoadingStatus: 'SUCCEEDED',
                isInPolling: false,
                quotesRefreshCount: 0,
                quoteFetchError: null,
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalMultichainAssetsRates() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              MultichainAssetsRatesController: {
                conversionRates: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalMultichainBalances() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              MultichainBalancesController: {
                balances: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalMultichainAssets() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              MultichainAssetsController: {
                accountsAssets: {},
                assetsMetadata: {},
                allIgnoredAssets: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalMultichainTransactions() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              MultichainTransactionsController: {
                nonEvmTransactions: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalTokenRates() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              TokenRatesController: {
                marketData: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalBridgeController() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              BridgeController: {
                quoteRequest: {
                  srcChainId: undefined,
                  srcTokenAddress: undefined,
                  destChainId: undefined,
                  destTokenAddress: undefined,
                  destAddress: undefined,
                  srcAmount: undefined,
                  slippage: 0.005,
                },
                isInPolling: false,
                quotesLastFetched: 0,
                quotes: [],
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalMultichainNetwork(isEvmSelected = true) {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              MultichainNetworkController: {
                isEvmSelected,
                networksWithTransactionActivity: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalKeyringController() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              KeyringController: {
                keyrings: [],
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalTransactionController() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              TransactionController: {
                transactions: [],
                swapsTransactions: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalGasFee() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              GasFeeController: {
                gasFeeEstimatesByChainId: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalSmartTransactions() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              SmartTransactionsController: {
                smartTransactionsState: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalMainnetNetwork() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              NetworkController: {
                selectedNetworkClientId: 'mainnet',
                networksMetadata: {
                  mainnet: {
                    status: 'available',
                    EIPS: { 1559: true },
                  },
                },
                networkConfigurationsByChainId: {
                  '0x1': {
                    chainId: '0x1',
                    rpcEndpoints: [
                      {
                        networkClientId: 'mainnet',
                        url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                        type: 'infura',
                        name: 'Ethereum Network default RPC',
                      },
                    ],
                    defaultRpcEndpointIndex: 0,
                    blockExplorerUrls: ['https://etherscan.io'],
                    defaultBlockExplorerUrlIndex: 0,
                    name: 'Ethereum Main Network',
                    nativeCurrency: 'ETH',
                  },
                },
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withPreferences(overrides) {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              PreferencesController: {
                ...((bg as PlainObject)?.PreferencesController as PlainObject),
                ...overrides,
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withMinimalAccounts(
      selectedAddress = '0x0000000000000000000000000000000000000001',
    ) {
      const accountId = 'acc-1';
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    [accountId]: {
                      id: accountId,
                      address: selectedAddress,
                      metadata: {
                        name: 'Account 1',
                        importTime: Date.now(),
                        keyring: { type: 'HD Key Tree' },
                      },
                      options: {},
                      methods: [
                        'personal_sign',
                        'eth_sign',
                        'eth_signTransaction',
                        'eth_signTypedData_v1',
                        'eth_signTypedData_v3',
                        'eth_signTypedData_v4',
                      ],
                      type: 'eip155:eoa',
                      scopes: ['eip155:0'],
                    },
                  },
                  selectedAccount: accountId,
                },
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withAccountTreeForSelectedAccount() {
      const bg = (current.engine?.backgroundState ?? {}) as unknown as Record<
        string,
        unknown
      >;
      const normalizedAccountTree = buildNormalizedAccountTree(bg);
      current = deepMerge(
        current as PlainObject,
        {
          engine: {
            backgroundState: {
              ...bg,
              AccountTreeController: {
                ...((bg as PlainObject)?.AccountTreeController as PlainObject),
                accountTree: normalizedAccountTree,
              },
            },
          },
        } as unknown as DeepPartial<RootState> as PlainObject,
      );
      return api;
    },
    withOverrides(overrides) {
      current = deepMerge(current as PlainObject, overrides as PlainObject);
      return api;
    },
    build() {
      return current;
    },
  };

  return api;
}
