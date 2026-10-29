import {
  KALSHI_STATIC_VENUE_CATALOG,
  POLYMARKET_STATIC_VENUE_CATALOG,
} from '../config/venueCatalogs';
import {
  PREDICT_FEED_KEYS,
  PREDICT_VENUE_ACTIONS,
  type PredictFeedId,
  type PredictVenueId,
} from '../types';
import { PREDICT_SURFACE_FEED_KEYS } from './surfaceFeedKeys';
import type { PredictVenueCapabilities } from './types';
import {
  canPerformVenueAction,
  getVenueCapabilitySource,
  getVenueFeedId,
  isVenueSearchSupported,
  resolveSurfaceFeeds,
  resolveVenueCapabilities,
  type VenueCatalogRead,
} from './venueCapabilities';

const KALSHI = 'kalshi' as PredictVenueId;
const POLYMARKET = 'polymarket' as PredictVenueId;

const read = (overrides: Partial<VenueCatalogRead> = {}): VenueCatalogRead => ({
  data: undefined,
  isError: false,
  retry: jest.fn(),
  ...overrides,
});

const NOT_READY: PredictVenueCapabilities[] = [
  { status: 'loading' },
  { status: 'unavailable', reason: 'unknown_venue' },
  { status: 'unavailable', reason: 'invalid_catalog' },
  { status: 'unavailable', reason: 'error', retry: jest.fn() },
];

describe('resolveVenueCapabilities', () => {
  describe('a client-config Venue (Polymarket)', () => {
    it('resolves the static descriptor synchronously, matching legacy support', () => {
      const result = resolveVenueCapabilities(POLYMARKET, read());

      expect(result).toEqual({
        status: 'ready',
        descriptor: {
          venueId: 'polymarket',
          displayName: 'Polymarket',
          actions: ['buy', 'sell', 'claim', 'deposit', 'withdraw'],
          feeds: {
            trending: 'trending',
            live: 'live',
            sports: 'sports',
            crypto: 'crypto',
            politics: 'politics',
            'crypto-up-down-live': 'btc-up-or-down-5m',
            'world-cup': 'fifa-world-cup',
          },
          searchSupported: true,
        },
      });
    });

    it('ignores any service read for the Venue', () => {
      const result = resolveVenueCapabilities(
        POLYMARKET,
        read({ data: { venueId: 'polymarket', actions: [] }, isError: true }),
      );

      expect(result.status).toBe('ready');
    });
  });

  describe('a service Venue (Kalshi)', () => {
    it('is loading until the catalog read settles', () => {
      const result = resolveVenueCapabilities(KALSHI, read());

      expect(result).toEqual({ status: 'loading' });
    });

    it('resolves a valid catalog with the client display name', () => {
      const result = resolveVenueCapabilities(
        KALSHI,
        read({ data: KALSHI_STATIC_VENUE_CATALOG }),
      );

      expect(result).toEqual({
        status: 'ready',
        descriptor: {
          ...KALSHI_STATIC_VENUE_CATALOG,
          displayName: 'Kalshi',
        },
      });
    });

    it('fails closed on a malformed catalog', () => {
      const result = resolveVenueCapabilities(
        KALSHI,
        read({ data: { venueId: 'kalshi', actions: 'buy' } }),
      );

      expect(result).toEqual({
        status: 'unavailable',
        reason: 'invalid_catalog',
      });
    });

    it('never uses another Venue catalog', () => {
      const result = resolveVenueCapabilities(
        KALSHI,
        read({ data: POLYMARKET_STATIC_VENUE_CATALOG }),
      );

      expect(result).toEqual({
        status: 'unavailable',
        reason: 'invalid_catalog',
      });
    });

    it('keeps the last valid catalog through a failed refresh', () => {
      const result = resolveVenueCapabilities(
        KALSHI,
        read({ data: KALSHI_STATIC_VENUE_CATALOG, isError: true }),
      );

      expect(result.status).toBe('ready');
    });

    it('reports a retryable error when the read fails with nothing cached', () => {
      const retry = jest.fn();

      const result = resolveVenueCapabilities(
        KALSHI,
        read({ isError: true, retry }),
      );

      expect(result).toEqual({ status: 'unavailable', reason: 'error', retry });
    });
  });

  it.each(['limitless', '', 'toString', 'constructor'])(
    'resolves the unknown Venue %p as unavailable, never as another Venue',
    (venueId) => {
      const result = resolveVenueCapabilities(
        venueId as PredictVenueId,
        read({ data: KALSHI_STATIC_VENUE_CATALOG }),
      );

      expect(result).toEqual({
        status: 'unavailable',
        reason: 'unknown_venue',
      });
    },
  );
});

describe('getVenueCapabilitySource', () => {
  it('reads Polymarket from client config and Kalshi from the service', () => {
    expect(getVenueCapabilitySource(POLYMARKET)?.catalog.type).toBe('client');
    expect(getVenueCapabilitySource(KALSHI)?.catalog.type).toBe('service');
  });
});

describe('capability selectors', () => {
  const ready = resolveVenueCapabilities(
    KALSHI,
    read({ data: KALSHI_STATIC_VENUE_CATALOG }),
  );

  it('enables only the actions the descriptor lists', () => {
    expect(
      PREDICT_VENUE_ACTIONS.filter((action) =>
        canPerformVenueAction(ready, action),
      ),
    ).toEqual(['buy', 'sell']);
  });

  it('maps present Feed keys to Feed IDs and absent ones to undefined', () => {
    expect(getVenueFeedId(ready, 'nfl-games')).toBe(
      'sports-football-nfl-games',
    );
    expect(getVenueFeedId(ready, 'trending')).toBeUndefined();
  });

  it('reports search support from the descriptor', () => {
    expect(isVenueSearchSupported(ready)).toBe(true);
  });

  it.each(NOT_READY)(
    'enables no action, Feed, or search while $status ($reason)',
    (capabilities) => {
      expect(
        PREDICT_VENUE_ACTIONS.some((action) =>
          canPerformVenueAction(capabilities, action),
        ),
      ).toBe(false);
      expect(
        PREDICT_FEED_KEYS.some((key) => getVenueFeedId(capabilities, key)),
      ).toBe(false);
      expect(isVenueSearchSupported(capabilities)).toBe(false);
    },
  );
});

describe('resolveSurfaceFeeds', () => {
  const capabilitiesWithFeeds = (
    feeds: Record<string, string>,
  ): PredictVenueCapabilities => ({
    status: 'ready',
    descriptor: {
      venueId: 'test-venue' as PredictVenueId,
      displayName: 'Test Venue',
      actions: [],
      feeds: feeds as Record<string, PredictFeedId>,
      searchSupported: false,
    },
  });

  it('returns the supported sections in table order with their Feed IDs', () => {
    const capabilities = capabilitiesWithFeeds({
      politics: 'venue-politics',
      trending: 'venue-trending',
    });

    const result = resolveSurfaceFeeds(
      capabilities,
      PREDICT_SURFACE_FEED_KEYS.exploreTabs,
    );

    expect(result).toEqual([
      { sectionId: 'now', feedKey: 'trending', feedId: 'venue-trending' },
      { sectionId: 'macro', feedKey: 'politics', feedId: 'venue-politics' },
      { sectionId: 'rwas', feedKey: 'politics', feedId: 'venue-politics' },
    ]);
  });

  it.each(NOT_READY)('returns no sections while $status', (capabilities) => {
    const result = resolveSurfaceFeeds(
      capabilities,
      PREDICT_SURFACE_FEED_KEYS.exploreTabs,
    );

    expect(result).toEqual([]);
  });

  it('shows Kalshi V1 only its football sections and the Sports tab', () => {
    const kalshi = resolveVenueCapabilities(
      KALSHI,
      read({ data: KALSHI_STATIC_VENUE_CATALOG }),
    );

    const sectionIds = (table: Record<string, string>) =>
      resolveSurfaceFeeds(
        kalshi,
        table as Parameters<typeof resolveSurfaceFeeds>[1],
      ).map(({ sectionId }) => sectionId);

    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.homepageSlots)).toEqual([
      'nfl-games',
      'college-football-games',
    ]);
    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.exploreTabs)).toEqual([
      'sports',
    ]);
    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.campaignRows)).toEqual([]);
    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.nextHomeSections)).toEqual([
      'sports-football-nfl',
      'sports-football-ncaa',
    ]);
  });

  it('keeps every surface Polymarket shows today', () => {
    const polymarket = resolveVenueCapabilities(POLYMARKET, read());

    const sectionIds = (table: Record<string, string>) =>
      resolveSurfaceFeeds(
        polymarket,
        table as Parameters<typeof resolveSurfaceFeeds>[1],
      ).map(({ sectionId }) => sectionId);

    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.homepageSlots)).toEqual([
      'trending-carousel',
      'btc-up-down',
      'world-cup',
    ]);
    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.exploreTabs)).toEqual([
      'now',
      'macro',
      'rwas',
      'crypto',
      'sports',
    ]);
    expect(sectionIds(PREDICT_SURFACE_FEED_KEYS.campaignRows)).toEqual([
      'predict-the-pitch',
    ]);
  });
});
