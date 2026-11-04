import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import { usePredictionsFeed } from '../../Predict/trending/usePredictionsFeed';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
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
          feed: usePredictTrendingFeed({ variant: 'crypto' }),
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

    it('reads nothing while the caller disables it', async () => {
      givenVenue(POLYMARKET);

      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () =>
          usePredictTrendingFeed({ variant: 'politics', enabled: false }),
        sideEffects: [mockGetMarkets, mockSearchMarkets],
        wrapper: createWrapper(),
      });
    });

    it('refetches on an Explore refresh', async () => {
      givenVenue(POLYMARKET);
      const { rerender } = renderHook(
        ({ trigger }: { trigger: number }) =>
          usePredictTrendingFeed({
            variant: 'trending',
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
        () => usePredictTrendingFeed({ variant: 'trending' }),
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
            variant: 'sports',
            refresh: { trigger: 1, silentRefresh: true },
          });
          usePredictTrendingFeed({ query: 'bitcoin' });
        },
        sideEffects: [mockGetMarkets, mockSearchMarkets],
        wrapper: createWrapper(),
      });
    });
  });

  it('drops the legacy markets when the Active Venue moves to a next Venue', async () => {
    givenVenue(POLYMARKET);
    const { result, rerender } = renderHook(
      () => usePredictTrendingFeed({ variant: 'trending' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    givenVenue(KALSHI);
    rerender(undefined);

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
