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
import Logger from '../../../../util/Logger';
import { getPredictVenueControllerMessenger } from '../../../../core/Engine/messengers/predict-venue-controller-messenger';
import {
  PredictVenueController,
  type PredictVenueControllerMessenger,
  type PredictVenueControllerState,
} from './PredictVenueController';
import { ACTIVE_VENUE_GEOLOCATION_WAIT_MS } from './resolveActiveVenue';

jest.mock('../../../../util/Logger');

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<PredictVenueControllerMessenger>,
  MessengerEvents<PredictVenueControllerMessenger>
>;

const LOADING: Partial<GeolocationControllerState> = {
  status: 'loading',
  location: UNKNOWN_LOCATION,
};

const setup = ({
  persisted,
  geolocation = LOADING,
}: {
  persisted?: Partial<PredictVenueControllerState>;
  geolocation?: Partial<GeolocationControllerState>;
} = {}) => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  let geolocationState: GeolocationControllerState = {
    ...getDefaultGeolocationControllerState(),
    ...geolocation,
  };
  rootMessenger.registerActionHandler(
    'GeolocationController:getState',
    () => geolocationState,
  );
  const publishGeolocation = (next: Partial<GeolocationControllerState>) => {
    geolocationState = { ...geolocationState, ...next };
    rootMessenger.publish(
      'GeolocationController:stateChange',
      geolocationState,
      [],
    );
  };
  const controller = new PredictVenueController({
    messenger: getPredictVenueControllerMessenger(rootMessenger),
    state: persisted,
  });
  return { controller, rootMessenger, publishGeolocation };
};

/** What the app would persist and hand to the next session's controller. */
const persist = (controller: PredictVenueController) =>
  deriveStateFromMetadata(
    controller.state,
    controller.metadata,
    'persist',
  ) as Partial<PredictVenueControllerState>;

describe('PredictVenueController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(Logger.log).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('session default', () => {
    it.each([
      ['US', 'kalshi'],
      ['US-CA', 'kalshi'],
      ['CA-ON', 'polymarket'],
      ['GB', 'polymarket'],
    ] as const)(
      'latches the regional default at once for a known location %s',
      (location, venue) => {
        const { controller } = setup({
          geolocation: { status: 'complete', location },
        });

        controller.init();

        expect(controller.state.sessionDefault).toEqual({
          venue,
          source: 'geolocation',
        });
      },
    );

    it('waits while geolocation is loading, then latches its result', () => {
      const { controller, publishGeolocation } = setup();

      controller.init();
      expect(controller.state.sessionDefault).toBeNull();
      publishGeolocation({ status: 'complete', location: 'US-NY' });

      expect(controller.state.sessionDefault).toEqual({
        venue: 'kalshi',
        source: 'geolocation',
      });
    });

    it('falls back to the previous session Active Venue when geolocation fails', () => {
      const { controller, publishGeolocation } = setup({
        persisted: { lastActiveVenue: 'kalshi' },
      });

      controller.init();
      publishGeolocation({ status: 'error', error: 'offline' });

      expect(controller.state.sessionDefault).toEqual({
        venue: 'kalshi',
        source: 'lastActiveVenue',
      });
    });

    it('falls back to Polymarket when geolocation completes unknown and nothing was persisted', () => {
      const { controller, publishGeolocation } = setup();

      controller.init();
      publishGeolocation({ status: 'complete', location: UNKNOWN_LOCATION });

      expect(controller.state.sessionDefault).toEqual({
        venue: 'polymarket',
        source: 'fallback',
      });
    });

    it('stops waiting after the bounded wait', () => {
      const { controller } = setup({
        persisted: { lastActiveVenue: 'kalshi' },
      });

      controller.init();
      jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS - 1);
      expect(controller.state.sessionDefault).toBeNull();
      jest.advanceTimersByTime(1);

      expect(controller.state.sessionDefault).toEqual({
        venue: 'kalshi',
        source: 'lastActiveVenue',
      });
    });

    it('keeps a fallback for the session when geolocation arrives late, and applies it next session', () => {
      const first = setup();
      first.controller.init();
      jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS);

      first.publishGeolocation({ status: 'complete', location: 'US' });

      expect(first.controller.state.sessionDefault).toEqual({
        venue: 'polymarket',
        source: 'fallback',
      });
      const next = setup({
        persisted: persist(first.controller),
        geolocation: { status: 'complete', location: 'US' },
      });
      next.controller.init();
      expect(next.controller.state.sessionDefault).toEqual({
        venue: 'kalshi',
        source: 'geolocation',
      });
    });

    it('keeps the latched location when geolocation changes later in the session', () => {
      const { controller, publishGeolocation } = setup({
        geolocation: { status: 'complete', location: 'US' },
      });
      controller.init();

      publishGeolocation({ status: 'complete', location: 'GB' });

      expect(controller.state.sessionDefault).toEqual({
        venue: 'kalshi',
        source: 'geolocation',
      });
    });

    it('falls back to the previous session, not an Active Venue recorded in this one', () => {
      const { controller } = setup({
        persisted: { lastActiveVenue: 'polymarket' },
      });
      controller.init();

      controller.recordActiveVenue({
        status: 'ready',
        venue: 'kalshi',
        source: 'rollout',
      });
      jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS);

      expect(controller.state.sessionDefault).toEqual({
        venue: 'polymarket',
        source: 'lastActiveVenue',
      });
    });
  });

  describe('persistence', () => {
    it('persists the preference and the last Active Venue, never the session default', () => {
      const { controller } = setup({
        geolocation: { status: 'complete', location: 'US' },
      });
      controller.init();
      controller.setVenueSelectionPreference('polymarket');
      controller.recordActiveVenue({
        status: 'ready',
        venue: 'polymarket',
        source: 'preference',
      });

      const persisted = persist(controller);

      expect(persisted).toEqual({
        venueSelectionPreference: 'polymarket',
        lastActiveVenue: 'polymarket',
      });
    });

    it('restores the preference and the last Active Venue after a restart', () => {
      const first = setup();
      first.controller.setVenueSelectionPreference('kalshi');
      first.controller.recordActiveVenue({
        status: 'ready',
        venue: 'kalshi',
        source: 'preference',
      });

      const { controller } = setup({ persisted: persist(first.controller) });

      expect(controller.state).toEqual({
        venueSelectionPreference: 'kalshi',
        lastActiveVenue: 'kalshi',
        sessionDefault: null,
      });
    });

    it('drops persisted Venues this build does not know', () => {
      const { controller } = setup({
        persisted: {
          venueSelectionPreference: 'retiredVenue',
          lastActiveVenue: 'retiredVenue',
        } as unknown as Partial<PredictVenueControllerState>,
      });

      expect(controller.state.venueSelectionPreference).toBeNull();
      expect(controller.state.lastActiveVenue).toBeNull();
    });

    it('sets the preference through the messenger', () => {
      const { controller, rootMessenger } = setup();

      rootMessenger.call(
        'PredictVenueController:setVenueSelectionPreference',
        'kalshi',
      );
      expect(controller.state.venueSelectionPreference).toBe('kalshi');
      rootMessenger.call(
        'PredictVenueController:setVenueSelectionPreference',
        null,
      );

      expect(controller.state.venueSelectionPreference).toBeNull();
    });
  });

  describe('clearState', () => {
    it('forgets the preference and the last Active Venue', () => {
      const { controller } = setup({
        persisted: {
          venueSelectionPreference: 'kalshi',
          lastActiveVenue: 'kalshi',
        },
      });

      controller.clearState();

      expect(persist(controller)).toEqual({
        venueSelectionPreference: null,
        lastActiveVenue: null,
      });
    });

    it('replaces a session default taken from the cleared history with the no-history fallback', () => {
      const { controller } = setup({
        persisted: { lastActiveVenue: 'kalshi' },
        geolocation: { status: 'error', location: UNKNOWN_LOCATION },
      });
      controller.init();

      controller.clearState();

      expect(controller.state.sessionDefault).toEqual({
        venue: 'polymarket',
        source: 'fallback',
      });
    });

    it('keeps a session default taken from geolocation', () => {
      const { controller } = setup({
        geolocation: { status: 'complete', location: 'US' },
      });
      controller.init();

      controller.clearState();

      expect(controller.state.sessionDefault).toEqual({
        venue: 'kalshi',
        source: 'geolocation',
      });
    });

    it('stops a pending wait from falling back to the cleared history', () => {
      const { controller } = setup({
        persisted: { lastActiveVenue: 'kalshi' },
      });
      controller.init();

      controller.clearState();
      jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS);

      expect(controller.state.sessionDefault).toEqual({
        venue: 'polymarket',
        source: 'fallback',
      });
    });
  });

  describe('recordActiveVenue', () => {
    it('ignores a resolving Active Venue', () => {
      const { controller } = setup({
        persisted: { lastActiveVenue: 'kalshi' },
      });

      controller.recordActiveVenue({ status: 'resolving' });

      expect(controller.state.lastActiveVenue).toBe('kalshi');
    });

    it('logs an ignored preference once per distinct case', () => {
      const { controller } = setup();
      const ignored = {
        status: 'ready',
        venue: 'polymarket',
        source: 'rollout',
        ignoredPreference: { venue: 'kalshi', reason: 'venueNotEnabled' },
      } as const;

      controller.recordActiveVenue(ignored);
      controller.recordActiveVenue(ignored);
      controller.recordActiveVenue({
        ...ignored,
        ignoredPreference: {
          venue: 'kalshi',
          reason: 'venueSelectionDisabled',
        },
      });

      expect(jest.mocked(Logger.log).mock.calls).toEqual([
        [
          'PredictVenueController: ignoring the Venue Selection Preference',
          { venue: 'kalshi', reason: 'venueNotEnabled' },
        ],
        [
          'PredictVenueController: ignoring the Venue Selection Preference',
          { venue: 'kalshi', reason: 'venueSelectionDisabled' },
        ],
      ]);
    });
  });

  it('stops waiting on destroy', () => {
    const { controller, publishGeolocation } = setup();
    controller.init();

    controller.destroy();
    publishGeolocation({ status: 'complete', location: 'US' });
    jest.advanceTimersByTime(ACTIVE_VENUE_GEOLOCATION_WAIT_MS);

    expect(controller.state.sessionDefault).toBeNull();
  });
});
