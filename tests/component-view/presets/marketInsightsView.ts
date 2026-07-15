import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { initialStateBridge } from './bridge';

/**
 * Redux preset for MarketInsightsView component-view tests: bridge + fiat state,
 * market insights flag (version gate 0.0.0 for unit/view runs).
 */
export const initialStateMarketInsightsView = () =>
  initialStateBridge({ deterministicFiat: true })
    .withRemoteFeatureFlags({
      aiSocialMarketAnalysisEnabled: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
    } as unknown as Record<string, unknown>)
    .withPreferences({
      tokenSortConfig: {
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      },
    });

/**
 * Ensures `goToBuy` does not open eligibility/error modals (unified routing).
 *
 * Eligibility now derives from GeolocationController + RampsController region.
 * A known geolocation (not UNKNOWN_LOCATION) lets `goToBuy` skip the
 * eligibility-failed modal; with no definitively-unsupported region/countries
 * signal, routing proceeds to TokenSelection/BuildQuote.
 */
export const fiatOrdersRampRoutingSupported: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      GeolocationController: {
        location: 'US-CA',
      },
    },
  },
} as DeepPartial<RootState>;
