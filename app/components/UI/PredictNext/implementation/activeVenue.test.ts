import { deriveStateFromMetadata } from '@metamask/base-controller';
import {
  getDefaultGeolocationControllerState,
  UNKNOWN_LOCATION,
  type GeolocationControllerState,
} from '@metamask/geolocation-controller';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { RootState } from '../../../../reducers';
import { getPredictVenueControllerMessenger } from '../../../../core/Engine/messengers/predict-venue-controller-messenger';
import type { PredictConfig } from '../config/predictConfig';
import { selectActiveVenue, selectSelectableVenues } from './activeVenue';
import {
  PredictVenueController,
  type PredictVenueControllerMessenger,
  type PredictVenueControllerState,
} from './PredictVenueController';
import { ACTIVE_VENUE_GEOLOCATION_WAIT_MS } from './resolveActiveVenue';
import type { PredictConfiguredVenue } from './types';

jest.mock('../../../../util/Logger');

type Rollout = 'legacyLane' | 'polymarketOnly' | 'kalshiOnly' | 'both';
type Geolocation = 'US' | 'GB' | 'loading' | 'error' | 'unknown';
/**
 * When the Active Venue is read: at Engine start, after the bounded wait,
 * or after a location that arrived once the wait had already fallen back.
 */
type Timing = 'atStart' | 'afterWait' | 'lateUS';

const ROLLOUTS: Rollout[] = [
  'legacyLane',
  'polymarketOnly',
  'kalshiOnly',
  'both',
];
const PREFERENCES: (PredictConfiguredVenue | null)[] = [
  null,
  'polymarket',
  'kalshi',
];
const GEOLOCATIONS: Geolocation[] = ['US', 'GB', 'loading', 'error', 'unknown'];
const HISTORIES: (PredictConfiguredVenue | null)[] = [
  null,
  'polymarket',
  'kalshi',
];
const TIMINGS: Timing[] = ['atStart', 'afterWait', 'lateUS'];

const ROLLOUT_VENUES: Record<Rollout, PredictConfiguredVenue[]> = {
  legacyLane: [],
  polymarketOnly: ['polymarket'],
  kalshiOnly: ['kalshi'],
  both: ['polymarket', 'kalshi'],
};

const GEOLOCATION_STATES: Record<
  Geolocation,
  Pick<GeolocationControllerState, 'status' | 'location'>
> = {
  US: { status: 'complete', location: 'US-CA' },
  GB: { status: 'complete', location: 'GB' },
  loading: { status: 'loading', location: UNKNOWN_LOCATION },
  error: { status: 'error', location: UNKNOWN_LOCATION },
  unknown: { status: 'complete', location: UNKNOWN_LOCATION },
};

const predictConfig = (
  rollout: Rollout,
  venueSelection: boolean,
): PredictConfig => ({
  enabled: rollout !== 'legacyLane',
  venues: {
    polymarket: { enabled: ROLLOUT_VENUES[rollout].includes('polymarket') },
    kalshi: { enabled: ROLLOUT_VENUES[rollout].includes('kalshi') },
  },
  venueSelection: { enabled: venueSelection },
});

const rootState = (
  config: PredictConfig,
  venueState: PredictVenueControllerState,
) =>
  ({
    settings: { basicFunctionalityEnabled: true },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { predictConfig: config },
        },
        PredictVenueController: venueState,
      },
    },
  }) as unknown as RootState;

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PredictVenueControllerMessenger>,
  MessengerEvents<PredictVenueControllerMessenger>
>;

/** One app session: a controller over a geolocation it can only read. */
const startSession = (
  geolocation: Pick<GeolocationControllerState, 'status' | 'location'>,
  persisted?: Partial<PredictVenueControllerState>,
) => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  let geolocationState = {
    ...getDefaultGeolocationControllerState(),
    ...geolocation,
  };
  rootMessenger.registerActionHandler(
    'GeolocationController:getState',
    () => geolocationState,
  );
  const controller = new PredictVenueController({
    messenger: getPredictVenueControllerMessenger(rootMessenger),
    state: persisted,
  });
  controller.init();
  return {
    controller,
    publishGeolocation: (next: typeof geolocation) => {
      geolocationState = { ...geolocationState, ...next };
      rootMessenger.publish(
        'GeolocationController:stateChange',
        geolocationState,
        [],
      );
    },
  };
};

interface MatrixCase {
  rollout: Rollout;
  venueSelection: boolean;
  preference: PredictConfiguredVenue | null;
  geolocation: Geolocation;
  lastActiveVenue: PredictConfiguredVenue | null;
  timing: Timing;
}

/** The PRED-1377 resolution order, stated independently of the code. */
const expectedActiveVenue = ({
  rollout,
  venueSelection,
  preference,
  geolocation,
  lastActiveVenue,
  timing,
}: MatrixCase): PredictConfiguredVenue | 'resolving' => {
  // 1. Only rolled-out Venues are candidates; none is the legacy lane.
  const candidates = ROLLOUT_VENUES[rollout];
  if (candidates.length === 0) return 'polymarket';
  if (candidates.length === 1) return candidates[0];
  // 2. A valid explicit preference.
  if (venueSelection && preference && candidates.includes(preference)) {
    return preference;
  }
  // 3. Known geolocation.
  if (geolocation === 'US') return 'kalshi';
  if (geolocation === 'GB') return 'polymarket';
  // 4. Still loading: wait, bounded.
  if (geolocation === 'loading' && timing === 'atStart') return 'resolving';
  // 5. Failed, unknown or timed out; a late result waits for next session.
  return lastActiveVenue ?? 'polymarket';
};

const cases: MatrixCase[] = ROLLOUTS.flatMap((rollout) =>
  [true, false].flatMap((venueSelection) =>
    PREFERENCES.flatMap((preference) =>
      GEOLOCATIONS.flatMap((geolocation) =>
        HISTORIES.flatMap((lastActiveVenue) =>
          TIMINGS.filter(
            // A late location only exists when the wait fell back.
            (timing) => timing !== 'lateUS' || geolocation === 'loading',
          ).map((timing) => ({
            rollout,
            venueSelection,
            preference,
            geolocation,
            lastActiveVenue,
            timing,
          })),
        ),
      ),
    ),
  ),
);

const caseKey = (matrixCase: MatrixCase) => JSON.stringify(matrixCase);

describe('selectActiveVenue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('follows the resolution order across rollout, preference, geolocation, history and the session boundary', () => {
    const actual: Record<string, string> = {};
    const expected: Record<string, string> = {};

    for (const matrixCase of cases) {
      const session = startSession(GEOLOCATION_STATES[matrixCase.geolocation], {
        venueSelectionPreference: matrixCase.preference,
        lastActiveVenue: matrixCase.lastActiveVenue,
      });
      if (matrixCase.timing !== 'atStart') {
        jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS);
      }
      if (matrixCase.timing === 'lateUS') {
        session.publishGeolocation(GEOLOCATION_STATES.US);
      }
      const resolution = selectActiveVenue(
        rootState(
          predictConfig(matrixCase.rollout, matrixCase.venueSelection),
          session.controller.state,
        ),
      );
      session.controller.destroy();

      actual[caseKey(matrixCase)] =
        resolution.status === 'ready' ? resolution.venue : 'resolving';
      expected[caseKey(matrixCase)] = expectedActiveVenue(matrixCase);
    }

    expect(cases).toHaveLength(792);
    expect(actual).toEqual(expected);
  });

  it('applies a late location in the next session', () => {
    const config = predictConfig('both', true);
    const first = startSession(GEOLOCATION_STATES.loading);
    jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS);
    first.publishGeolocation(GEOLOCATION_STATES.US);
    const firstVenue = selectActiveVenue(
      rootState(config, first.controller.state),
    );
    first.controller.recordActiveVenue(firstVenue);
    const persisted = deriveStateFromMetadata(
      first.controller.state,
      first.controller.metadata,
      'persist',
    ) as Partial<PredictVenueControllerState>;

    const next = startSession(GEOLOCATION_STATES.US, persisted);
    const nextVenue = selectActiveVenue(
      rootState(config, next.controller.state),
    );

    expect(firstVenue).toMatchObject({
      venue: 'polymarket',
      source: 'fallback',
    });
    expect(nextVenue).toMatchObject({ venue: 'kalshi', source: 'geolocation' });
  });

  describe('within a session', () => {
    const latchedUS = () => startSession(GEOLOCATION_STATES.US).controller;

    it('changes with the rollout config', () => {
      const controller = latchedUS();

      const venues = [
        predictConfig('both', true),
        predictConfig('polymarketOnly', true),
        predictConfig('both', true),
      ].map(
        (config) =>
          (
            selectActiveVenue(rootState(config, controller.state)) as {
              venue: PredictConfiguredVenue;
            }
          ).venue,
      );

      expect(venues).toEqual(['kalshi', 'polymarket', 'kalshi']);
    });

    it('changes with the preference', () => {
      const controller = latchedUS();
      const config = predictConfig('both', true);

      controller.setVenueSelectionPreference('polymarket');
      const withPreference = selectActiveVenue(
        rootState(config, controller.state),
      );
      controller.setVenueSelectionPreference(null);
      const automatic = selectActiveVenue(rootState(config, controller.state));

      expect(withPreference).toMatchObject({
        venue: 'polymarket',
        source: 'preference',
      });
      expect(automatic).toMatchObject({
        venue: 'kalshi',
        source: 'geolocation',
      });
    });

    it('does not change with a later location', () => {
      const session = startSession(GEOLOCATION_STATES.US);
      const config = predictConfig('both', true);

      session.publishGeolocation(GEOLOCATION_STATES.GB);

      expect(
        selectActiveVenue(rootState(config, session.controller.state)),
      ).toMatchObject({ venue: 'kalshi', source: 'geolocation' });
    });
  });

  it('defaults to the legacy lane before the controller state reaches Redux', () => {
    const state = {
      settings: { basicFunctionalityEnabled: true },
      engine: { backgroundState: {} },
    } as unknown as RootState;

    const result = selectActiveVenue(state);

    expect(result).toEqual({
      status: 'ready',
      venue: 'polymarket',
      source: 'legacyLane',
    });
  });
});

describe('selectSelectableVenues', () => {
  it('lists the rolled-out Venues while venue selection is enabled', () => {
    const state = rootState(predictConfig('both', true), {
      venueSelectionPreference: null,
      lastActiveVenue: null,
      sessionDefault: null,
    });

    const result = selectSelectableVenues(state);

    expect(result).toEqual(['polymarket', 'kalshi']);
  });
});
