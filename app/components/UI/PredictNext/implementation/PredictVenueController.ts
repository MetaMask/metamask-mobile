import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangedEvent,
  type StateMetadata,
} from '@metamask/base-controller';
import type {
  GeolocationControllerGetStateAction,
  GeolocationControllerState,
  GeolocationControllerStateChangeEvent,
} from '@metamask/geolocation-controller';
import type { Messenger } from '@metamask/messenger';
import Logger from '../../../../util/Logger';
import { DEFAULT_PREDICT_CONFIG } from '../config/predictConfig';
import {
  ACTIVE_VENUE_GEOLOCATION_WAIT_MS,
  LEGACY_LANE_VENUE,
  resolveSessionDefaultVenue,
} from './resolveActiveVenue';
import type {
  ActiveVenueResolution,
  PredictConfiguredVenue,
  SessionDefaultVenue,
} from './types';

export const PREDICT_VENUE_CONTROLLER_NAME = 'PredictVenueController';

// A type alias, not an interface: `BaseController` needs the implicit index
// signature that interfaces do not get.
/**
 * Device-scoped Active Venue inputs. Holds Venue ids only, never a location
 * or any other PII.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictVenueControllerState = {
  /** The Predict User's explicit Venue choice, or `null` for automatic. */
  venueSelectionPreference: PredictConfiguredVenue | null;
  /** The Active Venue last resolved on this device. */
  lastActiveVenue: PredictConfiguredVenue | null;
  /**
   * This session's regional default, latched once from geolocation or its
   * fallback. Never persisted: a later location applies next session.
   */
  sessionDefault: SessionDefaultVenue | null;
};

export const getDefaultPredictVenueControllerState =
  (): PredictVenueControllerState => ({
    venueSelectionPreference: null,
    lastActiveVenue: null,
    sessionDefault: null,
  });

const metadata: StateMetadata<PredictVenueControllerState> = {
  venueSelectionPreference: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  lastActiveVenue: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  sessionDefault: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
};

export interface PredictVenueControllerSetVenueSelectionPreferenceAction {
  type: `${typeof PREDICT_VENUE_CONTROLLER_NAME}:setVenueSelectionPreference`;
  handler: PredictVenueController['setVenueSelectionPreference'];
}

export type PredictVenueControllerActions =
  | ControllerGetStateAction<
      typeof PREDICT_VENUE_CONTROLLER_NAME,
      PredictVenueControllerState
    >
  | PredictVenueControllerSetVenueSelectionPreferenceAction;

export type PredictVenueControllerEvents = ControllerStateChangedEvent<
  typeof PREDICT_VENUE_CONTROLLER_NAME,
  PredictVenueControllerState
>;

type AllowedActions = GeolocationControllerGetStateAction;

type AllowedEvents = GeolocationControllerStateChangeEvent;

export type PredictVenueControllerMessenger = Messenger<
  typeof PREDICT_VENUE_CONTROLLER_NAME,
  PredictVenueControllerActions | AllowedActions,
  PredictVenueControllerEvents | AllowedEvents
>;

export interface PredictVenueControllerOptions {
  messenger: PredictVenueControllerMessenger;
  state?: Partial<PredictVenueControllerState>;
  /** Overrides {@link ACTIVE_VENUE_GEOLOCATION_WAIT_MS}. */
  geolocationWaitMs?: number;
}

const isConfiguredVenue = (value: unknown): value is PredictConfiguredVenue =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(DEFAULT_PREDICT_CONFIG.venues, value);

/** Persisted values outlive the code that wrote them; keep only Venues this build knows. */
const toConfiguredVenue = (value: unknown): PredictConfiguredVenue | null =>
  isConfiguredVenue(value) ? value : null;

/**
 * Owns the persisted inputs of Active Venue resolution and this session's
 * regional default. It reads `GeolocationController`, whose Engine-start
 * fetch it waits for, and never fetches a location itself. The Active Venue
 * itself is resolved by `selectActiveVenue`, so every surface agrees.
 */
export class PredictVenueController extends BaseController<
  typeof PREDICT_VENUE_CONTROLLER_NAME,
  PredictVenueControllerState,
  PredictVenueControllerMessenger
> {
  readonly #geolocationWaitMs: number;

  /**
   * The Active Venue the previous session ended on. Step 5 falls back to it,
   * so a value recorded during this session never feeds this session's
   * default.
   */
  #previousSessionActiveVenue: PredictConfiguredVenue | null;

  #waitTimer: ReturnType<typeof setTimeout> | undefined;

  #isWaitingForGeolocation = false;

  #loggedIgnoredPreference: string | undefined;

  constructor({
    messenger,
    state,
    geolocationWaitMs = ACTIVE_VENUE_GEOLOCATION_WAIT_MS,
  }: PredictVenueControllerOptions) {
    const lastActiveVenue = toConfiguredVenue(state?.lastActiveVenue);
    super({
      name: PREDICT_VENUE_CONTROLLER_NAME,
      metadata,
      messenger,
      state: {
        venueSelectionPreference: toConfiguredVenue(
          state?.venueSelectionPreference,
        ),
        lastActiveVenue,
        // Never restored: each session decides its own default.
        sessionDefault: null,
      },
    });
    this.#geolocationWaitMs = geolocationWaitMs;
    this.#previousSessionActiveVenue = lastActiveVenue;

    this.messenger.registerActionHandler(
      `${PREDICT_VENUE_CONTROLLER_NAME}:setVenueSelectionPreference`,
      this.setVenueSelectionPreference.bind(this),
    );
  }

  /**
   * Latches this session's regional default as soon as geolocation is known
   * or has failed, or once the bounded wait expires. Call once at Engine
   * start, after `GeolocationController` has started its fetch.
   */
  init(): void {
    if (
      this.#latchSessionDefault(
        this.messenger.call('GeolocationController:getState'),
        false,
      )
    ) {
      return;
    }
    this.#isWaitingForGeolocation = true;
    this.messenger.subscribe(
      'GeolocationController:stateChange',
      this.#handleGeolocationChange,
    );
    this.#waitTimer = setTimeout(() => {
      this.#latchSessionDefault(
        this.messenger.call('GeolocationController:getState'),
        true,
      );
    }, this.#geolocationWaitMs);
  }

  /**
   * Stores the Predict User's explicit Venue choice; `null` returns to
   * automatic. Resolution honors it only while the Venue is rolled out and
   * venue selection is enabled.
   */
  setVenueSelectionPreference(venue: PredictConfiguredVenue | null): void {
    const preference = toConfiguredVenue(venue);
    if (preference === this.state.venueSelectionPreference) {
      return;
    }
    this.update((state) => {
      state.venueSelectionPreference = preference;
    });
  }

  /**
   * Records what `selectActiveVenue` resolved: persists the Active Venue for
   * the next session's fallback, and logs a stored preference that was not
   * honored, once per distinct case, so a stale one is diagnosable.
   */
  recordActiveVenue(resolution: ActiveVenueResolution): void {
    if (resolution.status !== 'ready') {
      return;
    }
    const { ignoredPreference } = resolution;
    const ignoredKey = ignoredPreference
      ? `${ignoredPreference.venue}:${ignoredPreference.reason}`
      : undefined;
    if (ignoredPreference && ignoredKey !== this.#loggedIgnoredPreference) {
      Logger.log(
        'PredictVenueController: ignoring the Venue Selection Preference',
        ignoredPreference,
      );
    }
    this.#loggedIgnoredPreference = ignoredKey;

    if (resolution.venue !== this.state.lastActiveVenue) {
      this.update((state) => {
        state.lastActiveVenue = resolution.venue;
      });
    }
  }

  /**
   * Forgets the device's Venue history on a wallet reset. A session default
   * taken from that history becomes the no-history fallback; one taken from
   * geolocation is device context and stays.
   */
  clearState(): void {
    this.#previousSessionActiveVenue = null;
    this.#loggedIgnoredPreference = undefined;
    this.update((state) => {
      state.venueSelectionPreference = null;
      state.lastActiveVenue = null;
      if (state.sessionDefault?.source === 'lastActiveVenue') {
        state.sessionDefault = { venue: LEGACY_LANE_VENUE, source: 'fallback' };
      }
    });
  }

  destroy(): void {
    this.#stopWaiting();
    this.messenger.unregisterActionHandler(
      `${PREDICT_VENUE_CONTROLLER_NAME}:setVenueSelectionPreference`,
    );
    super.destroy();
  }

  #handleGeolocationChange = (geolocation: GeolocationControllerState) => {
    this.#latchSessionDefault(geolocation, false);
  };

  #latchSessionDefault(
    geolocation: GeolocationControllerState,
    waitExpired: boolean,
  ): boolean {
    if (this.state.sessionDefault) {
      return true;
    }
    const sessionDefault = resolveSessionDefaultVenue({
      geolocation,
      lastActiveVenue: this.#previousSessionActiveVenue,
      waitExpired,
    });
    if (!sessionDefault) {
      return false;
    }
    this.#stopWaiting();
    this.update((state) => {
      state.sessionDefault = sessionDefault;
    });
    return true;
  }

  #stopWaiting(): void {
    clearTimeout(this.#waitTimer);
    this.#waitTimer = undefined;
    if (this.#isWaitingForGeolocation) {
      this.#isWaitingForGeolocation = false;
      this.messenger.unsubscribe(
        'GeolocationController:stateChange',
        this.#handleGeolocationChange,
      );
    }
  }
}
