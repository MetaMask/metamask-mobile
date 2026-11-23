import type { RootState } from '../../../../reducers';
import { selectPredictEnabledFlag } from '../../Predict/selectors/featureFlags';
import type { PredictConfig } from '../config/predictConfig';
import { selectActiveVenue } from '../implementation';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import { selectPredictAvailability } from './selectPredictAvailability';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.20.0'),
}));

const config = (
  polymarket: boolean,
  kalshi: boolean,
  enabled = true,
): PredictConfig => ({
  enabled,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: true },
});

const NO_VENUE_STATE: PredictVenueControllerState = {
  venueSelectionPreference: null,
  lastActiveVenue: null,
  sessionDefault: null,
};

/** `predictTradingEnabled` values, including the ones that fall back. */
const TRADING_FLAGS: [string, unknown][] = [
  ['enabled', { enabled: true, minimumVersion: '0.0.1' }],
  ['disabled', { enabled: false, minimumVersion: '0.0.1' }],
  ['below its minimum version', { enabled: true, minimumVersion: '999.0.0' }],
  ['missing', undefined],
  ['malformed', 'yes'],
];

/** Venue inputs under which Polymarket is the Active Venue. */
const POLYMARKET_ACTIVE: [string, unknown, PredictVenueControllerState][] = [
  ['the production default', undefined, NO_VENUE_STATE],
  ['the legacy lane', config(true, true, false), NO_VENUE_STATE],
  ['a Polymarket-only rollout', config(true, false), NO_VENUE_STATE],
  [
    'a non-US default',
    config(true, true),
    {
      ...NO_VENUE_STATE,
      sessionDefault: { venue: 'polymarket', source: 'geolocation' },
    },
  ],
  [
    'a preference',
    config(true, true),
    { ...NO_VENUE_STATE, venueSelectionPreference: 'polymarket' },
  ],
];

const rootState = (
  predictTradingEnabled: unknown,
  predictConfig: unknown,
  venueState: PredictVenueControllerState,
) =>
  ({
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { predictTradingEnabled, predictConfig },
        },
        PredictVenueController: venueState,
      },
    },
  }) as unknown as RootState;

describe('selectPredictAvailability', () => {
  describe.each(POLYMARKET_ACTIVE)(
    'while Polymarket is active through %s',
    (_venueCase, predictConfig, venueState) => {
      it.each(TRADING_FLAGS)(
        'equals selectPredictEnabledFlag with predictTradingEnabled %s',
        (_flagCase, predictTradingEnabled) => {
          const state = rootState(
            predictTradingEnabled,
            predictConfig,
            venueState,
          );

          const result = selectPredictAvailability(state);

          expect(selectActiveVenue(state)).toMatchObject({
            status: 'ready',
            venue: 'polymarket',
          });
          expect(result).toBe(selectPredictEnabledFlag(state));
        },
      );
    },
  );

  it.each(TRADING_FLAGS)(
    'is available while Kalshi is active, whatever predictTradingEnabled (%s)',
    (_flagCase, predictTradingEnabled) => {
      const state = rootState(
        predictTradingEnabled,
        config(false, true),
        NO_VENUE_STATE,
      );

      const result = selectPredictAvailability(state);

      expect(result).toBe(true);
    },
  );

  it.each([
    ['every candidate is available', true],
    ['a candidate is unavailable', false],
  ] as const)('while resolving, is %s → %s', (_case, legacyAvailable) => {
    const state = rootState(
      { enabled: legacyAvailable, minimumVersion: '0.0.1' },
      config(true, true),
      NO_VENUE_STATE,
    );

    const result = selectPredictAvailability(state);

    expect(selectActiveVenue(state)).toEqual({ status: 'resolving' });
    expect(result).toBe(legacyAvailable);
  });
});
