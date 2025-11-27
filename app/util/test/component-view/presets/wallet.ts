import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';

interface InitialStateWalletOptions {
  deterministicFiat?: boolean;
}

/**
 * Returns a pre-configured StateFixtureBuilder tailored for Wallet view.
 * It sets the minimal required background controllers and app slices
 * to make Wallet screens render without extra mocks.
 *
 * Use chainable calls on the returned builder to customize per-test needs.
 */
export const initialStateWallet = (options?: InitialStateWalletOptions) => {
  const builder = createStateFixture({ base: 'empty' })
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
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
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
        },
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
