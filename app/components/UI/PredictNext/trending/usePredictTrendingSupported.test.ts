import { renderHook, waitFor } from '@testing-library/react-native';
import { useVenueCapabilities } from '../capabilities';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import { useActiveVenue } from '../implementation/activeVenue';
import type { ActiveVenueResolution } from '../implementation/types';
import type { PredictVenueId } from '../types';
import {
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
    jest.mocked(useActiveVenue).mockReturnValue(KALSHI);
    messenger = createDataServiceMessenger({
      catalog: { ...KALSHI_STATIC_VENUE_CATALOG, searchSupported: false },
    });

    // Rendered beside the capabilities, so the assertion runs once the
    // catalog has answered; before then search is unsupported anyway.
    const { result } = renderHook(
      () => ({
        supported: usePredictTrendingSupported('search'),
        capabilities: useVenueCapabilities('kalshi' as PredictVenueId),
      }),
      { wrapper: createDataServiceWrapper(messenger) },
    );
    await waitFor(() =>
      expect(result.current.capabilities.status).not.toBe('loading'),
    );

    expect(result.current.supported).toBe(false);
  });

  it('never supports the All Sports list on Kalshi, and reads no catalog for it', () => {
    const { result } = renderSupported(KALSHI, 'allSports');

    expect(result.current).toBe(false);
    expect(messenger.call).not.toHaveBeenCalled();
  });
});
