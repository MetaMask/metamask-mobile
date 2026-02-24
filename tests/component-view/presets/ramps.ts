import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

const MOCK_PROVIDER = {
  id: '/providers/transak',
  name: 'Transak',
  supportedCryptoCurrencies: {},
};

const MOCK_PAYMENT_METHOD = {
  id: 'card',
  name: 'Debit or Credit Card',
};

const MOCK_TOKEN = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  iconUrl: '',
  tokenSupported: true,
  decimals: 18,
};

export interface InitialStateRampsOptions {
  currency?: string;
  quickAmounts?: number[];
  defaultAmount?: number;
}

/**
 * Returns a pre-configured StateFixtureBuilder tailored for Ramps views.
 * Sets up RampsController state with a region, provider, token, and payment
 * method so the BuildQuote screen renders without extra mocks.
 *
 * Use chainable calls on the returned builder to customise per-test needs.
 */
export const initialStateRamps = (options?: InitialStateRampsOptions) => {
  const {
    currency = 'USD',
    quickAmounts = [50, 100, 200, 400],
    defaultAmount = 100,
  } = options ?? {};

  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController()
    .withRemoteFeatureFlags({})
    .withPreferences({
      isIpfsGatewayEnabled: false,
      useTokenDetection: false,
    } as unknown as Record<string, unknown>)
    .withOverrides({
      engine: {
        backgroundState: {
          RampsController: {
            userRegion: {
              id: 'US',
              country: {
                name: 'United States',
                currency,
                quickAmounts,
                defaultAmount,
              },
            },
            providers: {
              data: [MOCK_PROVIDER],
              selected: MOCK_PROVIDER,
              isLoading: false,
              error: null,
            },
            tokens: {
              data: null,
              selected: MOCK_TOKEN,
              isLoading: false,
              error: null,
            },
            paymentMethods: {
              data: [MOCK_PAYMENT_METHOD],
              selected: MOCK_PAYMENT_METHOD,
              isLoading: false,
              error: null,
            },
            countries: {
              data: [],
              isLoading: false,
              error: null,
            },
            nativeProviders: {
              transak: {
                isAuthenticated: false,
                userDetails: { data: null, isLoading: false, error: null },
                buyQuote: { data: null, isLoading: false, error: null },
                kycRequirement: { data: null, isLoading: false, error: null },
              },
            },
          },
        },
      },
    } as unknown as DeepPartial<RootState>);
};
