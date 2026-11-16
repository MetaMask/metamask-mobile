import type { RootState } from '../../../../reducers';
import { getVenueCapabilitySource } from '../capabilities/venueCapabilities';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import type { PredictConfiguredVenue } from '../implementation/types';
import { getVenueImplementation } from '../implementation/venueImplementations';
import type { PredictVenueId } from '../types';
import { selectPredictLegacyDepositAvailable } from './selectPredictLegacyDeposit';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.20.0'),
}));

const config = (polymarket: boolean, kalshi: boolean): PredictConfig => ({
  enabled: true,
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

const TRADING_ENABLED = { enabled: true, minimumVersion: '0.0.1' };
const TRADING_DISABLED = { enabled: false, minimumVersion: '0.0.1' };

const rootState = ({
  predictTradingEnabled = TRADING_ENABLED,
  predictConfig,
  venueState = NO_VENUE_STATE,
}: {
  predictTradingEnabled?: unknown;
  predictConfig?: unknown;
  venueState?: PredictVenueControllerState;
}) =>
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

describe('selectPredictLegacyDepositAvailable', () => {
  it.each([
    ['the production default', undefined, NO_VENUE_STATE],
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
  ] as [string, unknown, PredictVenueControllerState][])(
    'is true while Polymarket is active through %s',
    (_case, predictConfig, venueState) => {
      expect(
        selectPredictLegacyDepositAvailable(
          rootState({ predictConfig, venueState }),
        ),
      ).toBe(true);
    },
  );

  it('is false while Polymarket is active but predictTradingEnabled is off', () => {
    expect(
      selectPredictLegacyDepositAvailable(
        rootState({ predictTradingEnabled: TRADING_DISABLED }),
      ),
    ).toBe(false);
  });

  it.each([
    ['a Kalshi-only rollout', config(false, true), NO_VENUE_STATE],
    [
      'a US default',
      config(true, true),
      {
        ...NO_VENUE_STATE,
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
    ],
    [
      'a preference',
      config(true, true),
      { ...NO_VENUE_STATE, venueSelectionPreference: 'kalshi' },
    ],
  ] as [string, unknown, PredictVenueControllerState][])(
    'is false while Kalshi is active through %s',
    (_case, predictConfig, venueState) => {
      expect(
        selectPredictLegacyDepositAvailable(
          rootState({ predictConfig, venueState }),
        ),
      ).toBe(false);
    },
  );

  it('is false while the Active Venue is resolving', () => {
    expect(
      selectPredictLegacyDepositAvailable(
        rootState({ predictConfig: config(true, true) }),
      ),
    ).toBe(false);
  });

  it('reads every legacy Venue from a bundled catalog, so the gate is exact without a service read', () => {
    const venues: PredictConfiguredVenue[] = ['polymarket', 'kalshi'];
    const legacyVenues = venues.filter(
      (venue) => getVenueImplementation(venue) === 'legacy',
    );

    expect(legacyVenues).not.toHaveLength(0);
    legacyVenues.forEach((venue) => {
      expect(
        getVenueCapabilitySource(venue as PredictVenueId)?.catalog.type,
      ).toBe('client');
    });
  });
});
