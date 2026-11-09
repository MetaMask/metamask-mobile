import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import { usePredictionsFeed } from '../../Predict/trending/usePredictionsFeed';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

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

  describe.each([
    ['a next Venue is active', KALSHI],
    ['the Active Venue is resolving', RESOLVING],
  ])('while %s', (_, venue) => {
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
  });

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
});
