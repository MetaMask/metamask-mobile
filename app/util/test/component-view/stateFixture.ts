import type { DeepPartial } from '../renderWithProvider';
import type { RootState } from '../../../reducers';
// Removed dependency on large JSON snapshot; tests compose state via builder helpers

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
    const targetValue = output[key];
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
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

export interface StateFixtureBuilder {
  withRemoteFeatureFlags(
    overrides: Record<string, unknown>,
  ): StateFixtureBuilder;
  withPreferences(overrides: Record<string, unknown>): StateFixtureBuilder;
  withSmartTransactionsOptIn(enabled: boolean): StateFixtureBuilder;
  withMinimalAccounts(selectedAddress?: string): StateFixtureBuilder;
  withMinimalMainnetNetwork(): StateFixtureBuilder;
  withMinimalSmartTransactions(): StateFixtureBuilder;
  withMinimalGasFee(): StateFixtureBuilder;
  withMinimalTransactionController(): StateFixtureBuilder;
  withMinimalKeyringController(): StateFixtureBuilder;
  withMinimalMultichainNetwork(isEvmSelected?: boolean): StateFixtureBuilder;
  withMinimalBridgeController(): StateFixtureBuilder;
  withGaslessSwapEnabled(chainId: string | number): StateFixtureBuilder;
  withGaslessSwapDisabled(chainId: string | number): StateFixtureBuilder;
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
  withBridgeRecommendedQuoteEvmFull(params?: {
    srcAmount?: string;
    srcTokenAddress?: string;
    destTokenAddress?: string;
    chainIdHex?: string;
    networkFeeValueUsd?: string;
  }): StateFixtureBuilder;
  withAccountTreeForSelectedAccount(): StateFixtureBuilder;
  withOverrides(overrides: DeepPartial<RootState>): StateFixtureBuilder;
  build(): DeepPartial<RootState>;
}

const createQuoteResponse = ({
  srcAmount = '1000000000000000000',
  srcTokenAddress = '0x0000000000000000000000000000000000000000',
  destTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainIdHex = '0x1',
  networkFeeValueUsd = '2',
  isFull = false,
}) => {
  const numericChainId = parseInt(chainIdHex, 16);
  const quote = {
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
        amount: {
          value: '0',
          usd: '0',
          amount: '0',
          valueInCurrency: '0',
        },
        asset: {
          address: srcTokenAddress,
          chainId: numericChainId,
          decimals: 18,
          symbol: 'ETH',
          name: 'Ether',
        },
      },
      relayer: {
        amount: {
          value: '0',
          usd: '0',
          amount: '0',
          valueInCurrency: '0',
        },
      },
      partner: {
        amount: {
          value: '0',
          usd: '0',
          amount: '0',
          valueInCurrency: '0',
        },
      },
    },
    gasIncluded: false,
    priceData: { priceImpact: '0.01' },
  };

  const response: Record<string, unknown> = {
    quote,
    estimatedProcessingTimeInSeconds: 30,
  };

  if (isFull) {
    const feeObj = {
      value: networkFeeValueUsd,
      usd: networkFeeValueUsd,
      amount: '0.001',
      valueInCurrency: networkFeeValueUsd,
    };
    response.gasFee = {
      total: feeObj,
      max: feeObj,
      effective: feeObj,
    };
    response.totalNetworkFee = {
      amount: '0.001',
      value: networkFeeValueUsd,
      valueInCurrency: networkFeeValueUsd,
    };
    response.totalMaxNetworkFee = {
      amount: '0.001',
      value: networkFeeValueUsd,
      valueInCurrency: networkFeeValueUsd,
    };
    response.adjustedReturn = {
      value: '0',
      usd: '0',
      amount: '0',
      valueInCurrency: '0',
    };
    response.cost = {
      value: networkFeeValueUsd,
      usd: networkFeeValueUsd,
      amount: networkFeeValueUsd,
      valueInCurrency: networkFeeValueUsd,
    };
  } else {
    response.totalNetworkFee = { amount: '0.001', valueInCurrency: '2' };
  }

  return { response, numericChainId };
};

export function createStateFixture(): StateFixtureBuilder {
  const baseState = {
    engine: { backgroundState: {} },
    settings: {},
  } as unknown as DeepPartial<RootState>;
  let current: DeepPartial<RootState> = baseState;

  const toCaip = (id: string | number): string => {
    if (typeof id === 'number') return `eip155:${id}`;
    if (id.startsWith('eip155:')) return id;
    if (id.startsWith('0x')) {
      try {
        const dec = parseInt(id, 16);
        return `eip155:${dec}`;
      } catch {
        return `eip155:${id}`;
      }
    }
    // assume decimal string
    return `eip155:${id}`;
  };

  const mergeBackgroundState = (state: Record<string, unknown>) => {
    current = deepMerge(
      current as PlainObject,
      {
        engine: {
          backgroundState: state,
        },
      } as PlainObject,
    ) as DeepPartial<RootState>;
  };

  const mergeBridgeBackgroundState = (
    numericChainId: number,
    srcTokenAddress: string,
    destTokenAddress: string,
    srcAmount: string,
    response: Record<string, unknown>,
    isGaslessSwapEnabled = false,
  ) => {
    mergeBackgroundState({
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          bridgeConfig: {
            minimumVersion: '0.0.0',
            maxRefreshCount: 5,
            refreshRate: 30000,
            support: true,
            chains: {
              [`eip155:${numericChainId}`]: {
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
              [`eip155:${numericChainId}`]: {
                isActiveSrc: true,
                isActiveDest: true,
                isGaslessSwapEnabled,
              },
            },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        currencyRates: {
          ETH: { conversionRate: 2000 },
          USDC: { conversionRate: 1 },
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
        quotes: [response],
        recommendedQuote: response,
        quotesLastFetched: Date.now(),
        quotesLoadingStatus: 'SUCCEEDED',
        isInPolling: false,
        quotesRefreshCount: 0,
        quoteFetchError: null,
      },
    });
  };

  const api: StateFixtureBuilder = {
    withRemoteFeatureFlags(overrides) {
      mergeBackgroundState({
        RemoteFeatureFlagController: {
          remoteFeatureFlags: createFeatureFlags(overrides),
        },
      });
      return api;
    },
    withSmartTransactionsOptIn(enabled) {
      mergeBackgroundState({
        PreferencesController: {
          smartTransactionsOptInStatus: enabled,
        },
      });
      return api;
    },
    withBridgeRecommendedQuoteEvmSimple(params) {
      const {
        srcAmount = '1000000000000000000',
        srcTokenAddress = '0x0000000000000000000000000000000000000000',
        destTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainIdHex = '0x1',
      } = params ?? {};
      const { response, numericChainId } = createQuoteResponse({
        srcAmount,
        srcTokenAddress,
        destTokenAddress,
        chainIdHex,
        isFull: false,
      });

      mergeBridgeBackgroundState(
        numericChainId,
        srcTokenAddress,
        destTokenAddress,
        srcAmount,
        response,
      );
      return api;
    },
    withBridgeRecommendedQuoteEvmFull(params) {
      const {
        srcAmount = '1000000000000000000',
        srcTokenAddress = '0x0000000000000000000000000000000000000000',
        destTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainIdHex = '0x1',
        networkFeeValueUsd = '2',
      } = params ?? {};
      const { response, numericChainId } = createQuoteResponse({
        srcAmount,
        srcTokenAddress,
        destTokenAddress,
        chainIdHex,
        networkFeeValueUsd,
        isFull: true,
      });

      mergeBridgeBackgroundState(
        numericChainId,
        srcTokenAddress,
        destTokenAddress,
        srcAmount,
        response,
      );
      return api;
    },
    withGaslessSwapEnabled(chainId) {
      const caip = toCaip(chainId);
      mergeBackgroundState({
        RemoteFeatureFlagController: {
          remoteFeatureFlags: createFeatureFlags({
            bridgeConfigV2: {
              minimumVersion: '0.0.0',
              maxRefreshCount: 5,
              refreshRate: 30000,
              support: true,
              chains: {
                [caip]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                  isGaslessSwapEnabled: true,
                },
              },
            },
          }),
        },
      });
      return api;
    },
    withGaslessSwapDisabled(chainId) {
      const caip = toCaip(chainId);
      mergeBackgroundState({
        RemoteFeatureFlagController: {
          remoteFeatureFlags: createFeatureFlags({
            bridgeConfigV2: {
              minimumVersion: '0.0.0',
              maxRefreshCount: 5,
              refreshRate: 30000,
              support: true,
              chains: {
                [caip]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                  isGaslessSwapEnabled: false,
                },
              },
            },
          }),
        },
      });
      return api;
    },
    withMinimalMultichainAssetsRates() {
      mergeBackgroundState({
        MultichainAssetsRatesController: {
          conversionRates: {},
        },
      });
      return api;
    },
    withMinimalMultichainBalances() {
      mergeBackgroundState({
        MultichainBalancesController: {
          balances: {},
        },
      });
      return api;
    },
    withMinimalMultichainAssets() {
      mergeBackgroundState({
        MultichainAssetsController: {
          accountsAssets: {},
          assetsMetadata: {},
          allIgnoredAssets: {},
        },
      });
      return api;
    },
    withMinimalMultichainTransactions() {
      mergeBackgroundState({
        MultichainTransactionsController: {
          nonEvmTransactions: {},
        },
      });
      return api;
    },
    withMinimalTokenRates() {
      mergeBackgroundState({
        TokenRatesController: {
          marketData: {},
        },
      });
      return api;
    },
    withMinimalBridgeController() {
      mergeBackgroundState({
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
      });
      return api;
    },
    withMinimalMultichainNetwork(isEvmSelected = true) {
      mergeBackgroundState({
        MultichainNetworkController: {
          isEvmSelected,
          networksWithTransactionActivity: {},
        },
      });
      return api;
    },
    withMinimalKeyringController() {
      mergeBackgroundState({
        KeyringController: {
          keyrings: [],
        },
      });
      return api;
    },
    withMinimalTransactionController() {
      mergeBackgroundState({
        TransactionController: {
          transactions: [],
          swapsTransactions: {},
        },
      });
      return api;
    },
    withMinimalGasFee() {
      mergeBackgroundState({
        GasFeeController: {
          gasFeeEstimatesByChainId: {},
        },
      });
      return api;
    },
    withMinimalSmartTransactions() {
      mergeBackgroundState({
        SmartTransactionsController: {
          smartTransactionsState: {},
        },
      });
      return api;
    },
    withMinimalMainnetNetwork() {
      mergeBackgroundState({
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
      });
      return api;
    },
    withPreferences(overrides) {
      mergeBackgroundState({
        PreferencesController: overrides,
      });
      return api;
    },
    withMinimalAccounts(
      selectedAddress = '0x0000000000000000000000000000000000000001',
    ) {
      const accountId = 'acc-1';
      mergeBackgroundState({
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
      });
      return api;
    },
    withAccountTreeForSelectedAccount() {
      const bg = (current.engine?.backgroundState ?? {}) as Record<
        string,
        unknown
      >;
      const normalizedAccountTree = buildNormalizedAccountTree(bg);
      mergeBackgroundState({
        AccountTreeController: {
          accountTree: normalizedAccountTree,
        },
      });
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
