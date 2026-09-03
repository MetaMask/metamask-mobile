import type { QueryClient } from '@tanstack/react-query';
import {
  TRADER_POSITIONS_FETCH_LIMIT,
  TRADER_PROFILE_PREFETCH_STALE_TIME_MS,
  buildClosedPositionsQueryKey,
  buildOpenPositionsQueryKey,
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
