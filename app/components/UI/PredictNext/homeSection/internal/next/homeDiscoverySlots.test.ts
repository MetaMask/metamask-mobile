import { KALSHI_STATIC_VENUE_CATALOG } from '../../../config/venueCatalogs';
import type { PredictVenueCapabilities } from '../../../capabilities';
import type { PredictVenueDescriptor } from '../../../capabilities/types';
import {
  HOME_DISCOVERY_EVENTS_PER_SLOT,
  getHomeDiscoveryEventsPerSlot,
  homeDiscoverySlotForUiSlotItem,
  resolveHomeDiscoverySlots,
  type HomeDiscoverySlotId,
} from './homeDiscoverySlots';

const ready = (feeds: Record<string, string>): PredictVenueCapabilities => ({
  status: 'ready',
  descriptor: {
    ...KALSHI_STATIC_VENUE_CATALOG,
    feeds,
    displayName: 'Kalshi',
  } as unknown as PredictVenueDescriptor,
});

describe('resolveHomeDiscoverySlots', () => {
  it('returns the supported slots in display order with their Feed IDs', () => {
    const capabilities = ready({
      'college-football-games': 'ncaa-games',
      'nfl-games': 'nfl-games',
      'nfl-props': 'nfl-props',
    });

    const result = resolveHomeDiscoverySlots(capabilities);

    expect(result).toEqual([
      { sectionId: 'nfl-games', feedKey: 'nfl-games', feedId: 'nfl-games' },
      {
        sectionId: 'college-football-games',
        feedKey: 'college-football-games',
        feedId: 'ncaa-games',
      },
    ]);
  });

  it('keeps only the requested slots the Venue supports', () => {
    const capabilities = ready({
      'nfl-games': 'nfl-games',
      'college-football-games': 'ncaa-games',
    });

    const result = resolveHomeDiscoverySlots(capabilities, [
      'btc-up-down',
      'college-football-games',
    ]);

    expect(result.map(({ sectionId }) => sectionId)).toEqual([
      'college-football-games',
    ]);
  });

  it.each<[string, readonly HomeDiscoverySlotId[]]>([
    ['only slots the Venue lacks', ['btc-up-down', 'world-cup']],
    ['no slot', []],
  ])(
    'falls back to every supported slot when the request names %s',
    (_, slotIds) => {
      const capabilities = ready({
        'nfl-games': 'nfl-games',
        'college-football-games': 'ncaa-games',
      });

      const result = resolveHomeDiscoverySlots(capabilities, slotIds);

      expect(result.map(({ sectionId }) => sectionId)).toEqual([
        'nfl-games',
        'college-football-games',
      ]);
    },
  );

  it.each<[string, PredictVenueCapabilities]>([
    ['loading', { status: 'loading' }],
    ['invalid', { status: 'unavailable', reason: 'invalid_catalog' }],
  ])('returns no slot while capabilities are %s', (_, capabilities) => {
    const result = resolveHomeDiscoverySlots(capabilities);

    expect(result).toEqual([]);
  });
});

describe('homeDiscoverySlotForUiSlotItem', () => {
  it('maps the BTC up/down series to its slot', () => {
    const result = homeDiscoverySlotForUiSlotItem({
      type: 'series',
      seriesId: 'btc-up-or-down-5m',
    });

    expect(result).toBe('btc-up-down');
  });

  it('maps a pinned Event to no slot', () => {
    const result = homeDiscoverySlotForUiSlotItem({ type: 'event' });

    expect(result).toBeUndefined();
  });
});

describe('getHomeDiscoveryEventsPerSlot', () => {
  it.each([
    ['HIGH', 'WIFI', HOME_DISCOVERY_EVENTS_PER_SLOT],
    ['MID', 'FAST_CELLULAR', HOME_DISCOVERY_EVENTS_PER_SLOT],
    [null, null, HOME_DISCOVERY_EVENTS_PER_SLOT],
    ['HIGH', null, HOME_DISCOVERY_EVENTS_PER_SLOT],
    ['LOW', 'WIFI', 1],
    ['LOW', null, 1],
    ['HIGH', 'SLOW_CELLULAR', 1],
    [null, 'SLOW_CELLULAR', 1],
  ] as const)(
    'shows %s hardware on %s network that many Events per slot',
    (hardwareTier, networkTier, expected) => {
      const result = getHomeDiscoveryEventsPerSlot(hardwareTier, networkTier);

      expect(result).toBe(expected);
    },
  );
});
