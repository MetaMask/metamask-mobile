import { act, renderHook, waitFor } from '@testing-library/react-native';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import { useActiveVenue } from '../implementation/activeVenue';
import type { ActiveVenueResolution } from '../implementation/types';
import {
  callsTo,
  createDataServiceMessenger,
  createDataServiceWrapper,
  type DataServiceFixture,
  type DataServiceMessenger,
} from './trendingHooks.testUtils';
import type { PredictTrendingSurface } from './types';
import { usePredictTrendingSupported } from './usePredictTrendingSupported';

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

const POLYMARKET: ActiveVenueResolution = {
  status: 'ready',
  venue: 'polymarket',
  source: 'legacyLane',
};
const KALSHI: ActiveVenueResolution = {
  status: 'ready',
  venue: 'kalshi',
  source: 'rollout',
};
const RESOLVING: ActiveVenueResolution = { status: 'resolving' };
const GET_CATALOG = 'PredictMarketDataService:getVenueCatalog';

let messenger: DataServiceMessenger;

const renderSupported = (
  venue: ActiveVenueResolution,
  surface: PredictTrendingSurface,
  fixture: DataServiceFixture = {},
) => {
  jest.mocked(useActiveVenue).mockReturnValue(venue);
  messenger = createDataServiceMessenger(fixture);
  return renderHook(() => usePredictTrendingSupported(surface), {
    wrapper: createDataServiceWrapper(messenger),
  });
};

describe('usePredictTrendingSupported', () => {
  it.each(['search', 'allSports'] as const)(
    'supports %s on the legacy lane without reading a catalog',
    (surface) => {
      const { result } = renderSupported(POLYMARKET, surface);

      expect(result.current).toBe(true);
      expect(messenger.call).not.toHaveBeenCalled();
    },
  );

  it.each(['search', 'allSports'] as const)(
    'supports neither while the Active Venue resolves (%s)',
    (surface) => {
      const { result } = renderSupported(RESOLVING, surface);

      expect(result.current).toBe(false);
      expect(messenger.call).not.toHaveBeenCalled();
    },
  );

  it('supports Kalshi search once its descriptor says so', async () => {
    const { result } = renderSupported(KALSHI, 'search');

    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('leaves Kalshi search out when its descriptor does not support it', async () => {
    const { result } = renderSupported(KALSHI, 'search', {
      catalog: { ...KALSHI_STATIC_VENUE_CATALOG, searchSupported: false },
    });

    await waitFor(() =>
      expect(callsTo(messenger, GET_CATALOG)).toHaveLength(1),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(false);
  });

  it('never supports the All Sports list on Kalshi, and reads no catalog for it', () => {
    const { result } = renderSupported(KALSHI, 'allSports');

    expect(result.current).toBe(false);
    expect(messenger.call).not.toHaveBeenCalled();
  });
});
