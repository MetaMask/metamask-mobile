import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import { usePredictionsFeed } from '../../Predict/trending/usePredictionsFeed';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
import { useVenueCapabilities } from '../capabilities';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import { SEARCH_QUERY_MAX_LENGTH } from '../hooks/useSearchEvents';
import { readNextTrendingEvent } from './internal/nextMarkets';
import {
  KALSHI_SPORTS_FEED_ID,
  callsTo,
  createDataServiceMessenger,
  createDataServiceWrapper,
  makeKalshiEvent,
  type DataServiceFixture,
  type DataServiceMessenger,
} from './trendingHooks.testUtils';
import { usePredictTrendingFeed } from './usePredictTrendingFeed';

const mockGetMarkets = jest.fn();
const mockSearchMarkets = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
      searchMarkets: (...args: unknown[]) => mockSearchMarkets(...args),
    },
  },
}));

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

const givenVenue = (venue: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(venue);

let messenger: DataServiceMessenger;

/** Wraps in the UI query client; next reads are served from `fixture`. */
const createWrapper = (fixture: DataServiceFixture = {}) => {
  messenger = createDataServiceMessenger(fixture);
  return createDataServiceWrapper(messenger);
};

const GET_FEED = 'PredictMarketDataService:getFeed';
const SEARCH_EVENTS = 'PredictMarketDataService:searchEvents';
const INVALIDATE = 'PredictMarketDataService:invalidateQueries';

const settle = () =>
  act(async () => {
    await Promise.resolve();
  });

const KALSHI_GAMES = [makeKalshiEvent('game-1'), makeKalshiEvent('game-2')];
const KALSHI_VENUE_ID = KALSHI_GAMES[0].venueId;

/**
 * Renders the feed beside Kalshi's capabilities, so a test can wait until
 * the catalog has answered. Before then search is unsupported and nothing
 * searches, so an assertion that nothing searched proves nothing.
 */
const renderWithCapabilities = (
  options: Parameters<typeof usePredictTrendingFeed>[0],
  fixture: DataServiceFixture,
) =>
  renderHook(
    () => ({
      feed: usePredictTrendingFeed(options),
      capabilities: useVenueCapabilities(KALSHI_VENUE_ID),
    }),
    { wrapper: createWrapper(fixture) },
  );

const waitForCatalog = async (
  result: ReturnType<typeof renderWithCapabilities>['result'],
) => {
  await waitFor(() =>
    expect(result.current.capabilities.status).not.toBe('loading'),
  );
  await settle();
};

describe('usePredictTrendingFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarkets.mockResolvedValue({
      markets: [MOCK_PREDICT_MARKET],
      nextCursor: 'cursor-2',
    });
    mockSearchMarkets.mockResolvedValue({
      markets: [MOCK_PREDICT_MARKET],
      totalResults: 7,
    });
  });

  describe('while the legacy implementation is active', () => {
    it("returns the variant's feed as usePredictionsFeed does", async () => {
      givenVenue(POLYMARKET);

      const { result } = renderHook(
        () => ({
          feed: usePredictTrendingFeed({ tab: 'crypto' }),
          legacy: usePredictionsFeed({ variant: 'crypto' }),
        }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.feed.isLoading).toBe(false));
      expect(result.current.feed.data.map(({ id }) => id)).toEqual([
        MOCK_PREDICT_MARKET.id,
      ]);
      expect(result.current.feed.data).toEqual(result.current.legacy.data);
      expect(result.current.feed.hasMore).toBe(true);
      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'crypto' }),
      );
    });

    it('searches when a query is set and reports the server total', async () => {
      givenVenue(POLYMARKET);

      const { result } = renderHook(
        () => usePredictTrendingFeed({ query: 'bitcoin' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.total).toBe(7));
      expect(result.current.data.map(({ id }) => id)).toEqual([
        MOCK_PREDICT_MARKET.id,
      ]);
      expect(mockSearchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bitcoin' }),
      );
      expect(mockGetMarkets).not.toHaveBeenCalled();
    });

    it('forwards search performance to the legacy search feed', async () => {
      givenVenue(POLYMARKET);
      const requestEnd = jest.fn();
      const performance = {
        startRequest: jest.fn(() => ({ end: requestEnd })),
      };

      const { result } = renderHook(
        () => usePredictTrendingFeed({ query: 'bitcoin', performance }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(performance.startRequest).toHaveBeenCalledWith('bitcoin');
      expect(requestEnd).toHaveBeenCalledWith('success');
    });

    it('reads nothing while the caller disables it', async () => {
      givenVenue(POLYMARKET);

      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () =>
          usePredictTrendingFeed({ tab: 'macro', enabled: false }),
        sideEffects: [mockGetMarkets, mockSearchMarkets],
        wrapper: createWrapper(),
      });
    });

    it('refetches on an Explore refresh', async () => {
      givenVenue(POLYMARKET);
      const { rerender } = renderHook(
        ({ trigger }: { trigger: number }) =>
          usePredictTrendingFeed({
            tab: 'now',
            refresh: { trigger, silentRefresh: true },
          }),
        { wrapper: createWrapper(), initialProps: { trigger: 0 } },
      );
      await waitFor(() => expect(mockGetMarkets).toHaveBeenCalledTimes(1));

      rerender({ trigger: 1 });

      await waitFor(() => expect(mockGetMarkets).toHaveBeenCalledTimes(2));
    });
  });

  describe.each([
    ['a next Venue is active', KALSHI],
    ['the Active Venue is resolving', RESOLVING],
  ])('while %s', (_, venue) => {
    it('is empty, not loading, and reads no legacy market', async () => {
      givenVenue(venue);

      const { result } = renderHook(
        () => usePredictTrendingFeed({ tab: 'now' }),
        { wrapper: createWrapper() },
      );
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(mockGetMarkets).not.toHaveBeenCalled();
    });

    it('runs no legacy read for a feed, a search or a refresh', async () => {
      givenVenue(venue);

      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () => {
          usePredictTrendingFeed({
            tab: 'sports',
            refresh: { trigger: 1, silentRefresh: true },
          });
          usePredictTrendingFeed({ query: 'bitcoin' });
        },
        sideEffects: [mockGetMarkets, mockSearchMarkets],
        wrapper: createWrapper(),
      });
    });
  });

  it('reads the feed once, without replaying an earlier refresh, when the Active Venue becomes Polymarket', async () => {
    givenVenue(KALSHI);
    const { rerender } = renderHook(
      ({ trigger }: { trigger: number }) =>
        usePredictTrendingFeed({
          tab: 'now',
          refresh: { trigger, silentRefresh: true },
        }),
      { wrapper: createWrapper(), initialProps: { trigger: 0 } },
    );
    rerender({ trigger: 1 });

    givenVenue(POLYMARKET);
    rerender({ trigger: 1 });

    await waitFor(() => expect(mockGetMarkets).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
  });

  it('drops the legacy markets when the Active Venue moves to a next Venue', async () => {
    givenVenue(POLYMARKET);
    const { result, rerender } = renderHook(
      () => usePredictTrendingFeed({ tab: 'now' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    givenVenue(KALSHI);
    rerender(undefined);

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  describe('while a next Venue (Kalshi) is active', () => {
    it("reads the Sports tab from the descriptor's sports Feed, six Events at most", async () => {
      givenVenue(KALSHI);

      const { result } = renderHook(
        () => usePredictTrendingFeed({ tab: 'sports' }),
        { wrapper: createWrapper({ feed: KALSHI_GAMES }) },
      );

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data.map(readNextTrendingEvent)).toEqual(
        KALSHI_GAMES,
      );
      expect(callsTo(messenger, GET_FEED)).toEqual([
        [GET_FEED, 'kalshi', KALSHI_SPORTS_FEED_ID, { limit: 6 }],
      ]);
      expect(mockGetMarkets).not.toHaveBeenCalled();
    });

    it('stays hidden while the catalog loads, then is loading until the Feed answers', async () => {
      givenVenue(KALSHI);
      let answerFeed: (value: unknown) => void = () => undefined;
      const wrapper = createWrapper({ feed: KALSHI_GAMES });
      const serve = messenger.call.getMockImplementation();
      messenger.call.mockImplementation((action, ...params) =>
        action === GET_FEED
          ? new Promise((resolve) => {
              answerFeed = resolve;
            })
          : (serve?.(action, ...params) ?? Promise.resolve(undefined)),
      );

      const { result } = renderHook(
        () => usePredictTrendingFeed({ tab: 'sports' }),
        { wrapper },
      );

      expect(result.current.isLoading).toBe(false);
      await waitFor(() => expect(result.current.isLoading).toBe(true));
      expect(result.current.data).toEqual([]);
      await act(async () => {
        answerFeed({
          venueId: 'kalshi',
          id: KALSHI_SPORTS_FEED_ID,
          title: 'Feed',
          events: KALSHI_GAMES,
        });
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toHaveLength(2);
    });

    it.each(['now', 'macro', 'rwas', 'crypto'] as const)(
      'reads nothing for the %s tab, whose Feed key Kalshi lacks',
      async (tab) => {
        givenVenue(KALSHI);

        const { result } = renderHook(() => usePredictTrendingFeed({ tab }), {
          wrapper: createWrapper({ feed: KALSHI_GAMES }),
        });
        await waitFor(() =>
          expect(
            callsTo(messenger, 'PredictMarketDataService:getVenueCatalog'),
          ).toHaveLength(1),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await settle();

        expect(result.current.data).toEqual([]);
        expect(callsTo(messenger, GET_FEED)).toEqual([]);
        expect(mockGetMarkets).not.toHaveBeenCalled();
      },
    );

    it('ends loading empty when the Feed read fails', async () => {
      givenVenue(KALSHI);

      const { result } = renderHook(
        () => usePredictTrendingFeed({ tab: 'sports' }),
        { wrapper: createWrapper({ feed: new Error('feed down') }) },
      );

      await waitFor(() => expect(callsTo(messenger, GET_FEED)).toHaveLength(1));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toEqual([]);
    });

    it('searches with useSearchEvents, unpaginated, with the result count as total', async () => {
      givenVenue(KALSHI);

      const { result } = renderHook(
        () => usePredictTrendingFeed({ query: '  chiefs ' }),
        { wrapper: createWrapper({ search: KALSHI_GAMES }) },
      );

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      expect(result.current.total).toBe(2);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.fetchMore).toBeUndefined();
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([
        [SEARCH_EVENTS, 'kalshi', { q: 'chiefs', limit: 20 }],
      ]);
      expect(callsTo(messenger, GET_FEED)).toEqual([]);
      expect(mockSearchMarkets).not.toHaveBeenCalled();
    });

    it('does not search when the descriptor does not support search', async () => {
      givenVenue(KALSHI);

      const { result } = renderWithCapabilities(
        { query: 'chiefs' },
        {
          catalog: { ...KALSHI_STATIC_VENUE_CATALOG, searchSupported: false },
          search: KALSHI_GAMES,
        },
      );
      await waitForCatalog(result);

      expect(result.current.feed.data).toEqual([]);
      expect(result.current.feed.isLoading).toBe(false);
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([]);
    });

    it('does not search a query longer than the backend accepts', async () => {
      givenVenue(KALSHI);
      const tooLong = 'a'.repeat(SEARCH_QUERY_MAX_LENGTH + 1);

      const { result } = renderWithCapabilities(
        { query: tooLong },
        { search: KALSHI_GAMES },
      );
      await waitForCatalog(result);

      expect(result.current.feed.data).toEqual([]);
      expect(result.current.feed.isLoading).toBe(false);
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([]);
      expect(callsTo(messenger, GET_FEED)).toEqual([]);
    });

    it('searches a query of exactly the longest length the backend accepts', async () => {
      givenVenue(KALSHI);
      const longest = 'a'.repeat(SEARCH_QUERY_MAX_LENGTH);

      const { result } = renderHook(
        () => usePredictTrendingFeed({ query: longest }),
        { wrapper: createWrapper({ search: KALSHI_GAMES }) },
      );

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([
        [SEARCH_EVENTS, 'kalshi', { q: longest, limit: 20 }],
      ]);
    });

    it('refreshes through the data service on an Explore refresh', async () => {
      givenVenue(KALSHI);
      const { rerender } = renderHook(
        ({ trigger }: { trigger: number }) =>
          usePredictTrendingFeed({
            tab: 'sports',
            refresh: { trigger, silentRefresh: true },
          }),
        {
          wrapper: createWrapper({ feed: KALSHI_GAMES }),
          initialProps: { trigger: 0 },
        },
      );
      await waitFor(() => expect(callsTo(messenger, GET_FEED)).toHaveLength(1));

      rerender({ trigger: 1 });

      await waitFor(() => expect(callsTo(messenger, GET_FEED)).toHaveLength(2));
      expect(callsTo(messenger, INVALIDATE)).toEqual([
        [
          INVALIDATE,
          {
            queryKey: [GET_FEED, 'kalshi', KALSHI_SPORTS_FEED_ID, { limit: 6 }],
            exact: true,
          },
          undefined,
        ],
      ]);
    });

    it('does not replay an Explore refresh made on Polymarket when the Active Venue returns to Kalshi', async () => {
      givenVenue(KALSHI);
      const { result, rerender } = renderHook(
        ({ trigger }: { trigger: number }) =>
          usePredictTrendingFeed({
            tab: 'sports',
            refresh: { trigger, silentRefresh: true },
          }),
        {
          wrapper: createWrapper({ feed: KALSHI_GAMES }),
          initialProps: { trigger: 0 },
        },
      );
      await waitFor(() => expect(result.current.data).toHaveLength(2));
      givenVenue(POLYMARKET);
      rerender({ trigger: 0 });
      rerender({ trigger: 1 });
      const feedReadsBefore = callsTo(messenger, GET_FEED).length;

      givenVenue(KALSHI);
      rerender({ trigger: 1 });

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      await settle();
      expect(callsTo(messenger, INVALIDATE)).toEqual([]);
      expect(callsTo(messenger, GET_FEED).length - feedReadsBefore).toBe(1);
    });

    it('drops the Kalshi Events on the render the Active Venue becomes Polymarket', async () => {
      givenVenue(KALSHI);
      const { result, rerender } = renderHook(
        () => usePredictTrendingFeed({ tab: 'sports' }),
        { wrapper: createWrapper({ feed: KALSHI_GAMES }) },
      );
      await waitFor(() => expect(result.current.data).toHaveLength(2));

      givenVenue(POLYMARKET);
      rerender(undefined);

      expect(result.current.data.map(readNextTrendingEvent)).not.toContain(
        KALSHI_GAMES[0],
      );
    });

    it('reads nothing, not even the Venue catalog, while the caller disables it', async () => {
      givenVenue(KALSHI);

      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () =>
          usePredictTrendingFeed({
            tab: 'sports',
            enabled: false,
            refresh: { trigger: 1, silentRefresh: true },
          }),
        sideEffects: [],
        wrapper: createWrapper({ feed: KALSHI_GAMES }),
      });
      expect(messenger.call).not.toHaveBeenCalled();
    });
  });

  it('runs no next-branch read on the legacy lane', async () => {
    givenVenue(POLYMARKET);

    const { result } = renderHook(
      () => {
        usePredictTrendingFeed({ query: 'chiefs' });
        return usePredictTrendingFeed({ tab: 'sports' });
      },
      { wrapper: createWrapper({ feed: KALSHI_GAMES }) },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(messenger.call).not.toHaveBeenCalled();
  });
});
