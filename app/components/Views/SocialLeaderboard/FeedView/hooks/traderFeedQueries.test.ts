import type { QueryClient } from '@tanstack/react-query';
import { FEED_CAIP2_CHAINS } from '../../../../UI/SocialFeed/data/feed-constants';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../../../UI/SocialFeed/mocks/coreFeed.mock';
import {
  buildSocialFeedQueryKey,
  FEED_PAGE_LIMIT,
} from '../../../../UI/SocialFeed/data/socialFeedQueries';
import { toSocialFeedRequest } from '../../../../UI/SocialFeed/data/socialFeedSource';
import {
  PREFETCH_FEED_AUDIENCES,
  toFeedScope,
  buildTraderFeedQueryKey,
  fetchTraderFeedPage,
  getTraderFeedNextPageParam,
  prefetchTraderFeeds,
} from './traderFeedQueries';

const expectedFeedFetchOptions = {
  limit: FEED_PAGE_LIMIT,
  chains: [...FEED_CAIP2_CHAINS],
};

const mockCall = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockCall(...args);
      },
    },
  },
}));

describe('traderFeedQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toFeedScope', () => {
    it('maps the following audience to the following scope', () => {
      expect(toFeedScope('following')).toBe('following');
    });

    it('maps the all audience to the leaderboard scope', () => {
      expect(toFeedScope('all')).toBe('leaderboard');
    });
  });

  describe('buildTraderFeedQueryKey', () => {
    it('returns the SocialService fetchFeed key for the given scope', () => {
      expect(buildTraderFeedQueryKey('following')).toEqual([
        'SocialService:fetchFeed',
        {
          scope: 'following',
          chains: FEED_CAIP2_CHAINS,
          limit: FEED_PAGE_LIMIT,
        },
        'infinite',
      ]);
    });

    it('matches the useSocialFeed key for the global feed, so both share a cache', () => {
      const request = toSocialFeedRequest({ scope: 'leaderboard' });

      expect(buildTraderFeedQueryKey('leaderboard')).toEqual(
        request && buildSocialFeedQueryKey(request, FEED_PAGE_LIMIT),
      );
    });
  });

  describe('getTraderFeedNextPageParam', () => {
    it('returns the older cursor when present', () => {
      expect(getTraderFeedNextPageParam(mockFeedResponse([], 'cursor-1'))).toBe(
        'cursor-1',
      );
    });

    it('returns undefined when the older cursor is missing', () => {
      expect(getTraderFeedNextPageParam(mockFeedResponse([]))).toBeUndefined();
    });
  });

  describe('fetchTraderFeedPage', () => {
    it('requests the first page without an olderThan cursor', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

      await fetchTraderFeedPage('following');

      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
        scope: 'following',
        ...expectedFeedFetchOptions,
      });
    });

    it('passes the olderThan cursor for a follow-up page', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));

      await fetchTraderFeedPage('leaderboard', 'cursor-1');

      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchFeed', {
        scope: 'leaderboard',
        ...expectedFeedFetchOptions,
        olderThan: 'cursor-1',
      });
    });
  });

  describe('prefetchTraderFeeds', () => {
    it('prefetches the first page of every feed audience', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));
      const infiniteQuery = jest.fn().mockResolvedValue(undefined);
      const queryClient = {
        infiniteQuery,
      } as unknown as QueryClient;

      await prefetchTraderFeeds(queryClient);

      expect(infiniteQuery).toHaveBeenCalledTimes(
        PREFETCH_FEED_AUDIENCES.length,
      );
      expect(infiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: buildTraderFeedQueryKey('following'),
          retry: false,
        }),
      );
      expect(infiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: buildTraderFeedQueryKey('leaderboard'),
          retry: false,
        }),
      );
    });

    it('still resolves when one audience fetch rejects', async () => {
      const infiniteQuery = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('boom'));
      const queryClient = {
        infiniteQuery,
      } as unknown as QueryClient;

      await expect(prefetchTraderFeeds(queryClient)).resolves.toBeUndefined();
    });
  });
});
