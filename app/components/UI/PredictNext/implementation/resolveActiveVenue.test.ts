import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import type { PredictConfig } from '../config/predictConfig';
import {
  getSelectableVenues,
  resolveActiveVenue,
  resolveSessionDefaultVenue,
} from './resolveActiveVenue';
import type { SessionDefaultVenue } from './types';

const config = (
  polymarket: boolean,
  kalshi: boolean,
  { enabled = true, venueSelection = true } = {},
): PredictConfig => ({
  enabled,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: venueSelection },
});

const US_DEFAULT: SessionDefaultVenue = {
  venue: 'kalshi',
  source: 'geolocation',
};

describe('resolveActiveVenue', () => {
  it.each([
    ['predictConfig is disabled', config(true, true, { enabled: false })],
    ['no Venue is rolled out', config(false, false)],
  ])('serves the legacy lane when %s', (_case, predictConfig) => {
    const result = resolveActiveVenue({
      config: predictConfig,
      venueSelectionPreference: null,
      sessionDefault: US_DEFAULT,
    });

    expect(result).toEqual({
      status: 'ready',
      venue: 'polymarket',
      source: 'legacyLane',
    });
  });

  it.each([
    [config(true, false), 'polymarket'],
    [config(false, true), 'kalshi'],
  ] as const)(
    'picks the single rolled-out Venue without waiting for geolocation',
    (predictConfig, venue) => {
      const result = resolveActiveVenue({
        config: predictConfig,
        venueSelectionPreference: venue,
        sessionDefault: null,
      });

      expect(result).toEqual({ status: 'ready', venue, source: 'rollout' });
    },
  );

  it('honors a preference for a rolled-out Venue over the regional default', () => {
    const result = resolveActiveVenue({
      config: config(true, true),
      venueSelectionPreference: 'polymarket',
      sessionDefault: US_DEFAULT,
    });

    expect(result).toEqual({
      status: 'ready',
      venue: 'polymarket',
      source: 'preference',
    });
  });

  it('honors a preference before the regional default is known', () => {
    const result = resolveActiveVenue({
      config: config(true, true),
      venueSelectionPreference: 'kalshi',
      sessionDefault: null,
    });

    expect(result).toEqual({
      status: 'ready',
      venue: 'kalshi',
      source: 'preference',
    });
  });

  it('reports a preference for a Venue that is no longer rolled out', () => {
    const result = resolveActiveVenue({
      config: config(true, false),
      venueSelectionPreference: 'kalshi',
      sessionDefault: US_DEFAULT,
    });

    expect(result).toEqual({
      status: 'ready',
      venue: 'polymarket',
      source: 'rollout',
      ignoredPreference: { venue: 'kalshi', reason: 'venueNotEnabled' },
    });
  });

  it('reports a preference while venue selection is disabled', () => {
    const result = resolveActiveVenue({
      config: config(true, true, { venueSelection: false }),
      venueSelectionPreference: 'polymarket',
      sessionDefault: US_DEFAULT,
    });

    expect(result).toEqual({
      status: 'ready',
      venue: 'kalshi',
      source: 'geolocation',
      ignoredPreference: {
        venue: 'polymarket',
        reason: 'venueSelectionDisabled',
      },
    });
  });

  it('is resolving while several Venues are rolled out and the regional default is unknown', () => {
    const result = resolveActiveVenue({
      config: config(true, true),
      venueSelectionPreference: null,
      sessionDefault: null,
    });

    expect(result).toEqual({ status: 'resolving' });
  });

  it.each<SessionDefaultVenue>([
    { venue: 'kalshi', source: 'geolocation' },
    { venue: 'polymarket', source: 'geolocation' },
    { venue: 'kalshi', source: 'lastActiveVenue' },
    { venue: 'polymarket', source: 'fallback' },
  ])('uses the session default $venue from $source', (sessionDefault) => {
    const result = resolveActiveVenue({
      config: config(true, true),
      venueSelectionPreference: null,
      sessionDefault,
    });

    expect(result).toEqual({ status: 'ready', ...sessionDefault });
  });
});

describe('resolveSessionDefaultVenue', () => {
  it.each([
    ['US', 'kalshi'],
    ['us-tx', 'kalshi'],
    ['MX', 'polymarket'],
    ['GB-ENG', 'polymarket'],
  ] as const)(
    'maps the known location %s to %s, whatever the history',
    (location, venue) => {
      const result = resolveSessionDefaultVenue({
        geolocation: { status: 'complete', location },
        lastActiveVenue: 'polymarket',
        waitExpired: false,
      });

      expect(result).toEqual({ venue, source: 'geolocation' });
    },
  );

  it.each(['idle', 'loading'] as const)(
    'waits while geolocation is %s',
    (status) => {
      const result = resolveSessionDefaultVenue({
        geolocation: { status, location: UNKNOWN_LOCATION },
        lastActiveVenue: 'kalshi',
        waitExpired: false,
      });

      expect(result).toBeUndefined();
    },
  );

  it.each([
    ['failed', 'error', false],
    ['completed without a location', 'complete', false],
    ['timed out', 'loading', true],
  ] as const)(
    'falls back to the last Active Venue when geolocation %s',
    (_case, status, waitExpired) => {
      const result = resolveSessionDefaultVenue({
        geolocation: { status, location: UNKNOWN_LOCATION },
        lastActiveVenue: 'kalshi',
        waitExpired,
      });

      expect(result).toEqual({ venue: 'kalshi', source: 'lastActiveVenue' });
    },
  );

  it('falls back to Polymarket without history', () => {
    const result = resolveSessionDefaultVenue({
      geolocation: { status: 'error', location: '' },
      lastActiveVenue: null,
      waitExpired: false,
    });

    expect(result).toEqual({ venue: 'polymarket', source: 'fallback' });
  });
});

describe('getSelectableVenues', () => {
  it.each([
    [
      'several Venues are rolled out',
      config(true, true),
      ['polymarket', 'kalshi'],
    ],
    ['one Venue is rolled out', config(false, true), []],
    [
      'venue selection is disabled',
      config(true, true, { venueSelection: false }),
      [],
    ],
    ['predictConfig is disabled', config(true, true, { enabled: false }), []],
  ])('lists the choice when %s', (_case, predictConfig, expected) => {
    const result = getSelectableVenues(predictConfig);

    expect(result).toEqual(expected);
  });
});
