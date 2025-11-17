import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';

interface InitialStateBridgeOptions {
  deterministicFiat?: boolean;
}

/**
 * Returns a pre-configured StateFixtureBuilder tailored for Bridge views.
 * It sets the minimal required background controllers and app slices
 * to make Bridge screens render and operate without extra mocks.
 *
 * Use chainable calls on the returned builder to customize per-test needs.
 */
export const initialStateBridge = (options?: InitialStateBridgeOptions) => {
  const builder = createStateFixture({ base: 'empty' })
    .withMinimalBridgeController()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalMultichainAssets()
    .withMinimalMultichainTransactions()
    .withMinimalSmartTransactions()
    .withPreferences({
      smartTransactionsOptInStatus: false,
      useTokenDetection: false,
      tokenNetworkFilter: { '0x1': true },
    } as unknown as Record<string, unknown>)
    .withMinimalGasFee()
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainBalances()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({});

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
                // Native ETH price in ETH units
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
