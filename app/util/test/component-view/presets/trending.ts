import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';

interface InitialStateTrendingOptions {
  deterministicFiat?: boolean;
}

/**
 * Returns a pre-configured StateFixtureBuilder tailored for TrendingView.
 * It sets the minimal required background controllers and app slices
 * to make Trending screens render without extra mocks.
 *
 * Use chainable calls on the returned builder to customize per-test needs.
 */
export const initialStateTrending = (options?: InitialStateTrendingOptions) => {
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalKeyringController()
    .withPreferences({
      basicFunctionalityEnabled: true,
      useTokenDetection: false,
      tokenNetworkFilter: { '0x1': true },
    } as unknown as Record<string, unknown>)
    .withRemoteFeatureFlags({
      trendingTokens: {
        enabled: true,
        featureVersion: '1.0.0',
        minimumVersion: '0.0.1',
      },
    })
    .withOverrides({
      browser: {
        tabs: [],
        activeTab: null,
      },
      settings: {
        basicFunctionalityEnabled: true,
      },
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
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
        },
      },
    } as unknown as DeepPartial<RootState>);
  }

  return builder;
};
