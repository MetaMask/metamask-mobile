import type { QueryClient } from '@tanstack/react-query';
import {
  TRADER_POSITIONS_FETCH_LIMIT,
  TRADER_POSITIONS_INFINITE_QUERY_KIND,
  TRADER_PROFILE_PREFETCH_STALE_TIME_MS,
  buildClosedPositionsQueryKey,
  buildOpenPositionsQueryKey,
  buildPaginatedClosedPositionsQueryKey,
  buildPaginatedOpenPositionsQueryKey,
  buildTraderProfileQueryKey,
  getTraderProfilePrefetchQueryKeys,
  prefetchTraderProfileData,
} from './traderProfileQueries';

describe('traderProfileQueries', () => {
  describe('buildTraderProfileQueryKey', () => {
    it('returns the SocialService fetchTraderProfile key', () => {
      expect(buildTraderProfileQueryKey('trader-1')).toEqual([
        'SocialService:fetchTraderProfile',
        { addressOrId: 'trader-1' },
      ]);
    });
  });

  describe('buildOpenPositionsQueryKey', () => {
    it('returns the open positions key with the fetch limit', () => {
      expect(buildOpenPositionsQueryKey('trader-1')).toEqual([
        'SocialService:fetchOpenPositions',
        { addressOrId: 'trader-1', limit: TRADER_POSITIONS_FETCH_LIMIT },
      ]);
    });
  });

  describe('buildClosedPositionsQueryKey', () => {
    it('returns the closed positions key sorted by latest', () => {
      expect(buildClosedPositionsQueryKey('trader-1')).toEqual([
        'SocialService:fetchClosedPositions',
        {
          addressOrId: 'trader-1',
          sort: 'latest',
          limit: TRADER_POSITIONS_FETCH_LIMIT,
        },
      ]);
    });
  });

  describe('paginated positions keys', () => {
    it('marks the paginated open key with the infinite kind', () => {
      expect(buildPaginatedOpenPositionsQueryKey('trader-1')).toEqual([
        'SocialService:fetchOpenPositions',
        { addressOrId: 'trader-1', limit: TRADER_POSITIONS_FETCH_LIMIT },
        TRADER_POSITIONS_INFINITE_QUERY_KIND,
      ]);
    });

    it('marks the paginated closed key with the infinite kind, sorted by latest', () => {
      expect(buildPaginatedClosedPositionsQueryKey('trader-1')).toEqual([
        'SocialService:fetchClosedPositions',
        {
          addressOrId: 'trader-1',
          sort: 'latest',
          limit: TRADER_POSITIONS_FETCH_LIMIT,
        },
        TRADER_POSITIONS_INFINITE_QUERY_KIND,
      ]);
    });

    it('never equals the single-page key, so the two cache entries stay apart', () => {
      expect(buildPaginatedOpenPositionsQueryKey('trader-1')).not.toEqual(
        buildOpenPositionsQueryKey('trader-1'),
      );
      expect(buildPaginatedClosedPositionsQueryKey('trader-1')).not.toEqual(
        buildClosedPositionsQueryKey('trader-1'),
      );
    });

    it('keeps the single-page prefix so deeplink invalidation still matches it', () => {
      const [, paginatedOptions] =
        buildPaginatedOpenPositionsQueryKey('trader-1');

      expect(paginatedOptions).toMatchObject({ addressOrId: 'trader-1' });
    });
  });

  describe('getTraderProfilePrefetchQueryKeys', () => {
    it('returns all three trader profile query keys', () => {
      expect(getTraderProfilePrefetchQueryKeys('trader-1')).toEqual([
        buildTraderProfileQueryKey('trader-1'),
        buildOpenPositionsQueryKey('trader-1'),
        buildClosedPositionsQueryKey('trader-1'),
      ]);
    });
  });

  describe('prefetchTraderProfileData', () => {
    it('prefetches all three keys with a 30s staleTime', async () => {
      const prefetchQuery = jest.fn().mockResolvedValue(undefined);
      const queryClient = { prefetchQuery } as unknown as QueryClient;

      await prefetchTraderProfileData(queryClient, 'trader-1');

      expect(prefetchQuery).toHaveBeenCalledTimes(3);
      expect(prefetchQuery).toHaveBeenCalledWith({
        queryKey: buildTraderProfileQueryKey('trader-1'),
        staleTime: TRADER_PROFILE_PREFETCH_STALE_TIME_MS,
      });
      expect(prefetchQuery).toHaveBeenCalledWith({
        queryKey: buildOpenPositionsQueryKey('trader-1'),
        staleTime: TRADER_PROFILE_PREFETCH_STALE_TIME_MS,
      });
      expect(prefetchQuery).toHaveBeenCalledWith({
        queryKey: buildClosedPositionsQueryKey('trader-1'),
        staleTime: TRADER_PROFILE_PREFETCH_STALE_TIME_MS,
      });
    });
  });
});
