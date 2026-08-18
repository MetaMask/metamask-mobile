import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

interface InitialStateWatchlistOptions {
  deterministicFiat?: boolean;
}

/**
 * Returns a StateFixtureBuilder tailored for watchlist component view tests.
 * Enables the global watchlist feature flag and reuses wallet baseline state.
 */
export const initialStateWatchlist = (
  options?: InitialStateWatchlistOptions,
) => {
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalSmartTransactions()
    .withPreferences({
      useTokenDetection: false,
      tokenNetworkFilter: { '0x1': true },
    } as unknown as Record<string, unknown>)
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      assetsGlobalWatchlistV1: { enabled: true, minimumVersion: '7.0.0' },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {},
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0x1': {
                '0x0000000000000000000000000000000000000001': {
                  address: '0x0000000000000000000000000000000000000001',
                  balance: '0x0',
                },
              },
            },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          TokensController: {
            allTokens: {
              '0x1': {
                '0x0000000000000000000000000000000000000001': [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
          MultichainBalancesController: {
            balances: {},
          },
          MultichainAssetsController: {
            accountsAssets: {},
            assetsMetadata: {},
            allIgnoredAssets: {},
          },
          MultichainTransactionsController: {
            nonEvmTransactions: {},
          },
          MoneyAccountController: {
            moneyAccounts: {},
          },
          NftController: {
            allNfts: {},
            allNftContracts: {},
          },
        },
      },
      collectibles: {
        favorites: {},
      },
    } as unknown as DeepPartial<RootState>);

  if (options?.deterministicFiat) {
    builder.withOverrides({
      engine: {
        backgroundState: {
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: { conversionRate: 2000 },
            },
            conversionRate: 2000,
          },
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x0000000000000000000000000000000000000000': {
                  tokenAddress: '0x0000000000000000000000000000000000000000',
                  currency: 'ETH',
                  price: 1,
                },
              },
            },
          },
          MultichainAssetsRatesController: {
            conversionRates: {},
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
  }

  return builder;
};
