import { selectConversionRate } from './currencyRateController';
import { EngineState } from './types';

function getDefaultEngineState(): EngineState {
  return {
    engine: {
      backgroundState: {
        AccountTrackerController: { accounts: {} },
        AddressBookController: { addressBook: {} },
        AssetsContractController: {},
        CurrencyRateController: {
          conversionDate: 0,
          conversionRate: 0,
          currentCurrency: 'usd',
          nativeCurrency: 'ETH',
          pendingCurrentCurrency: null,
          pendingNativeCurrency: null,
          usdConversionRate: null,
        },
        GasFeeController: {
          gasFeeEstimates: {},
          estimatedGasFeeTimeBounds: {},
          gasEstimateType: 'none',
        },
        KeyringController: { keyrings: [] },
        NetworkController: {
          network: 'loading',
          isCustomNetwork: false,
          providerConfig: {
            type: 'mainnet',
            chainId: '1',
          },
          properties: {},
        },
        NftController: {
          allNftContracts: {},
          allNfts: {},
          ignoredNfts: [],
        },
        NftDetectionController: {},
        PersonalMessageManager: {
          unapprovedMessages: {},
          unapprovedMessagesCount: 0,
        },
        PhishingController: {
          listState: {
            allowlist: [],
            blocklist: [],
            fuzzylist: [],
            tolerance: 2,
            version: 2,
            name: 'Metamask',
            lastUpdated: 0,
          },
          whitelist: [],
          hotlistLastFetched: 0,
          stalelistLastFetched: 0,
        },
        PreferencesController: {
          disabledRpcMethodPreferences: {
            eth_sign: false,
          },
          featureFlags: {},
          frequentRpcList: [],
          identities: {},
          ipfsGateway: 'https://ipfs.io/ipfs/',
          lostIdentities: {},
          openSeaEnabled: false,
          selectedAddress: '',
          useNftDetection: false,
          useTokenDetection: true,
        },
        SwapsController: {
          quotes: {},
          quoteValues: {},
          fetchParams: {
            slippage: 0,
            sourceToken: '',
            sourceAmount: 0,
            destinationToken: '',
            walletAddress: '',
          },
          fetchParamsMetaData: {
            sourceTokenInfo: {
              decimals: 0,
              address: '',
              symbol: '',
            },
            destinationTokenInfo: {
              decimals: 0,
              address: '',
              symbol: '',
            },
          },
          topAggSavings: null,
          aggregatorMetadata: null,
          tokens: null,
          topAssets: null,
          approvalTransaction: null,
          aggregatorMetadataLastFetched: 0,
          quotesLastFetched: 0,
          topAssetsLastFetched: 0,
          error: { key: null, description: null },
          topAggId: null,
          tokensLastFetched: 0,
          isInPolling: false,
          pollingCyclesLeft: 0,
          quoteRefreshSeconds: null,
          usedGasEstimate: null,
          usedCustomGas: null,
          chainCache: {},
        },
        TokenBalancesController: {
          contractBalances: {},
        },
        TokenDetectionController: {},
        TokenListController: {
          tokenList: {},
          tokensChainsCache: {},
          preventPollingOnNetworkRestart: false,
        },
        TokenRatesController: {
          contractExchangeRates: {},
        },
        TokensController: {
          tokens: [],
          ignoredTokens: [],
          detectedTokens: [],
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
          suggestedAssets: [],
        },
        TransactionController: {
          transactions: [],
          methodData: {},
        },
        TypedMessageManager: {
          unapprovedMessages: {},
          unapprovedMessagesCount: 0,
        },
      },
    },
  };
}

/**
 * Return mock engine state with the specified mock values.
 *
 * @param options - Options
 * @param options.conversionRate - The currency rate controller conversion rate.
 */
function getMockEngineState({
  conversionRate,
}: { conversionRate?: number | null } = {}): EngineState {
  const engineState = getDefaultEngineState();
  if (conversionRate !== undefined) {
    engineState.engine.backgroundState.CurrencyRateController.conversionRate =
      conversionRate;
  }
  return engineState;
}

describe('currencyRateController', () => {
  describe('selectConversionRate', () => {
    it('selects the conversion rate', () => {
      expect(
        selectConversionRate(getMockEngineState({ conversionRate: 10 })),
      ).toBe(10);
    });

    it('returns zero if the conversion rate is null', () => {
      expect(
        selectConversionRate(getMockEngineState({ conversionRate: null })),
      ).toBe(0);
    });
  });
});
