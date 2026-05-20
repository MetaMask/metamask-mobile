import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

/**
 * Returns a pre-configured StateFixtureBuilder tailored for Aggregator (V1)
 * Ramp views. Provides the minimal Redux state required for BuildQuote to
 * render without extra mocks: mainnet NetworkController, a single account,
 * and a pre-selected US region.
 *
 * Pair with setupRampSdkApiMock() to intercept the SDK's HTTP calls.
 */
export const initialStateRamps = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalGasFee()
    .withOverrides({
      engine: {
        backgroundState: {
          GasFeeController: {
            // 'none' causes useGasPriceEstimation to return null immediately,
            // skipping live gas polling which requires Engine.context access.
            gasEstimateType: 'none',
            gasFeeEstimates: {},
            estimatedGasFeeTimeBounds: {},
          },
        },
      },
      fiatOrders: {
        selectedRegionAgg: {
          id: '/regions/us',
          name: 'United States',
          detected: false,
          currencies: ['/currencies/fiat/usd'],
          support: { buy: true, sell: true },
          states: [],
        },
      },
    } as unknown as DeepPartial<RootState>);
