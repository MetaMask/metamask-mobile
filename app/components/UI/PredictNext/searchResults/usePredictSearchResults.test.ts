import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import { usePredictionsFeed } from '../../Predict/trending/usePredictionsFeed';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
import { KALSHI_STATIC_VENUE_CATALOG } from '../config/venueCatalogs';
import { SEARCH_QUERY_MAX_LENGTH } from '../hooks/useSearchEvents';
import { readPredictEventRef } from '../navigation/entry/eventRef';
import {
  callsTo,
  createDataServiceMessenger,
  createDataServiceWrapper,
  makeKalshiEvent,
  type DataServiceFixture,
  type DataServiceMessenger,
} from '../trending/trendingHooks.testUtils';
import type { PredictEvent } from '../types';
import { toPredictSearchResults } from './internal/legacy/toPredictSearchResult';
import {
  PREDICT_SEARCH_DEBOUNCE_MS,
  usePredictSearchResults,
} from './usePredictSearchResults';

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

const SECOND_MARKET = { ...MOCK_PREDICT_MARKET, id: 'market-2' };

const givenVenue = (venue: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(venue);

/** The app's UI query client, over a data service that answers nothing. */
const createWrapper = () =>
  createDataServiceWrapper(createDataServiceMessenger({}));

describe('usePredictSearchResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchMarkets.mockResolvedValue({
      markets: [MOCK_PREDICT_MARKET, SECOND_MARKET],
      totalResults: 2,
    });
    mockGetMarkets.mockResolvedValue({ markets: [], nextCursor: null });
  });

  describe('while the legacy implementation is active', () => {
    it("maps the legacy search's markets, in its order", async () => {
      givenVenue(POLYMARKET);

      const { result } = renderHook(
        () => ({
          source: usePredictSearchResults('bitcoin'),
          legacy: usePredictionsFeed({ variant: 'trending', query: 'bitcoin' }),
        }),
        { wrapper: createWrapper() },
      );

      await waitFor(() =>
        expect(result.current.source.results).toHaveLength(2),
      );
      expect(result.current.source.isLoading).toBe(false);
      expect(result.current.source.results).toEqual(
        toPredictSearchResults(result.current.legacy.data),
      );
      expect(mockSearchMarkets).toHaveBeenCalledTimes(1);
      expect(mockSearchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bitcoin' }),
      );
      expect(mockGetMarkets).not.toHaveBeenCalled();
    });

    it('keeps the earlier results loading while a new query debounces, then searches it once', async () => {
      jest.useFakeTimers();
      try {
        givenVenue(POLYMARKET);
        const { result, rerender } = renderHook(
          ({ query }: { query: string }) => usePredictSearchResults(query),
          { wrapper: createWrapper(), initialProps: { query: 'bitcoin' } },
        );
        await waitFor(() => expect(result.current.results).toHaveLength(2));

        rerender({ query: 'bitcoin 100' });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.results).toHaveLength(2);
        expect(mockSearchMarkets).toHaveBeenCalledTimes(1);

        act(() => {
          jest.advanceTimersByTime(PREDICT_SEARCH_DEBOUNCE_MS);
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mockSearchMarkets).toHaveBeenCalledTimes(2);
        expect(mockSearchMarkets).toHaveBeenLastCalledWith(
          expect.objectContaining({ q: 'bitcoin 100' }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('has no results and reads nothing for an empty query', async () => {
      givenVenue(POLYMARKET);

      const { result } = renderHook(() => usePredictSearchResults('   '), {
        wrapper: createWrapper(),
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current).toEqual({ results: [], isLoading: false });
      expect(mockSearchMarkets).not.toHaveBeenCalled();
      expect(mockGetMarkets).not.toHaveBeenCalled();
    });
  });

  describe.each([['the Active Venue is resolving', RESOLVING]])(
    'while %s',
    (_, venue) => {
      it('has no results and is not loading, even while the query debounces', async () => {
        jest.useFakeTimers();
        try {
          givenVenue(venue);
          const { result, rerender } = renderHook(
            ({ query }: { query: string }) => usePredictSearchResults(query),
            { wrapper: createWrapper(), initialProps: { query: 'bitcoin' } },
          );

          rerender({ query: 'bitcoin 100' });

          expect(result.current).toEqual({ results: [], isLoading: false });

          act(() => {
            jest.advanceTimersByTime(PREDICT_SEARCH_DEBOUNCE_MS);
          });

          expect(result.current).toEqual({ results: [], isLoading: false });
        } finally {
          jest.useRealTimers();
        }
      });

      it('runs no legacy read', async () => {
        givenVenue(venue);

        await expectInactiveHookHasNoSideEffects({
          useInactiveHook: () => usePredictSearchResults('bitcoin'),
          sideEffects: [mockGetMarkets, mockSearchMarkets],
          wrapper: createWrapper(),
        });
      });
    },
  );

  it('drops cached Polymarket results on the render the Active Venue moves to a next Venue', async () => {
    givenVenue(POLYMARKET);
    const { result, rerender } = renderHook(
      () => usePredictSearchResults('bitcoin'),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.results).toHaveLength(2));

    givenVenue(KALSHI);
    rerender(undefined);

    expect(result.current).toEqual({ results: [], isLoading: false });
  });

  describe('while a next Venue (Kalshi) is active', () => {
    const SEARCH_EVENTS = 'PredictMarketDataService:searchEvents';
    const KALSHI_GAMES = [makeKalshiEvent('game-1'), makeKalshiEvent('game-2')];
    let messenger: DataServiceMessenger;

    const renderKalshi = (query: string, fixture: DataServiceFixture) => {
      messenger = createDataServiceMessenger(fixture);
      givenVenue(KALSHI);
      return renderHook(({ q }: { q: string }) => usePredictSearchResults(q), {
        wrapper: createDataServiceWrapper(messenger),
        initialProps: { q: query },
      });
    };

    /** Waits for the catalog, so "nothing searched" is the descriptor's
     * answer and not the catalog still loading. */
    const waitForCatalog = async () => {
      await waitFor(() =>
        expect(
          callsTo(messenger, 'PredictMarketDataService:getVenueCatalog'),
        ).toHaveLength(1),
      );
      await act(async () => {
        await Promise.resolve();
      });
    };

    it('maps the Venue search, from useSearchEvents, to results that open their Event', async () => {
      const { result } = renderKalshi(' chiefs ', { search: KALSHI_GAMES });

      await waitFor(() => expect(result.current.results).toHaveLength(2));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.results.map(({ id }) => id)).toEqual([
        'game-1',
        'game-2',
      ]);
      const [first] = result.current.results;
      expect(first.intent.type).toBe('event');
      expect(
        first.intent.type === 'event' &&
          readPredictEventRef(first.intent.eventRef),
      ).toEqual({ implementation: 'next', venue: 'kalshi', eventId: 'game-1' });
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([
        [SEARCH_EVENTS, 'kalshi', { q: 'chiefs', limit: 20 }],
      ]);
      expect(mockSearchMarkets).not.toHaveBeenCalled();
    });

    it('drops an Event of another Venue rather than opening it on Kalshi', async () => {
      const foreign = {
        ...makeKalshiEvent('foreign'),
        venueId: 'polymarket',
      } as unknown as PredictEvent;
      const { result } = renderKalshi('chiefs', {
        search: [foreign, KALSHI_GAMES[0]],
      });

      await waitFor(() => expect(result.current.results).toHaveLength(1));
      expect(result.current.results[0].id).toBe('game-1');
    });

    it('ends empty, not loading, when the search fails', async () => {
      const { result } = renderKalshi('chiefs', {
        search: new Error('search failed'),
      });

      await waitFor(() =>
        expect(callsTo(messenger, SEARCH_EVENTS)).toHaveLength(1),
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.results).toEqual([]);
    });

    it('has no results and never loads, even while typing, when the descriptor does not support search', async () => {
      const { result, rerender } = renderKalshi('chiefs', {
        catalog: { ...KALSHI_STATIC_VENUE_CATALOG, searchSupported: false },
        search: KALSHI_GAMES,
      });
      await waitForCatalog();

      rerender({ q: 'chiefs 2' });

      expect(result.current).toEqual({ results: [], isLoading: false });
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([]);
    });

    it('does not search a query longer than the backend accepts', async () => {
      const { result } = renderKalshi('a'.repeat(SEARCH_QUERY_MAX_LENGTH + 1), {
        search: KALSHI_GAMES,
      });
      await waitForCatalog();

      expect(result.current).toEqual({ results: [], isLoading: false });
      expect(callsTo(messenger, SEARCH_EVENTS)).toEqual([]);
    });

    it('drops the Kalshi results on the render the Active Venue becomes Polymarket', async () => {
      mockSearchMarkets.mockImplementation(() => new Promise(() => undefined));
      const { result, rerender } = renderKalshi('chiefs', {
        search: KALSHI_GAMES,
      });
      await waitFor(() => expect(result.current.results).toHaveLength(2));

      givenVenue(POLYMARKET);
      rerender({ q: 'chiefs' });

      expect(result.current.results).toEqual([]);
      expect(callsTo(messenger, SEARCH_EVENTS)).toHaveLength(1);
    });
  });
});
