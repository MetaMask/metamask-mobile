import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

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
  const builder = createStateFixture()
    .withMinimalBridgeController()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalTokensController()
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
    .withOverrides({
      engine: {
        backgroundState: {
          // useBridgeQuoteEvents -> selectTokensBalances
          TokenBalancesController: { tokenBalances: {} },
        },
      },
    } as unknown as DeepPartial<RootState>)
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      enableFiatToggle: true,
      // Limit/Recurring tabs are WIP; enabled by default here so existing
      // tab-behavior tests exercise them. Tests covering the disabled state
      // override these back to `{ enabled: false }`. RemoteFeatureFlagController
      // resolves the LaunchDarkly `{ versions: {...} }` config into this plain
      // `{ enabled }` shape before it ever reaches Redux state.
      swapsLimitOrder: { enabled: true },
      swapsRecurringBuy: {
        enabled: true,
        enabledChainIds: ['eip155:1'],
      },
    });

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
