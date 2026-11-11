import { partialMatchKey } from '@tanstack/react-query';
import { buildTraderFeedQueryKey } from '../../../Views/SocialLeaderboard/FeedView/hooks/traderFeedQueries';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import {
  FEED_PAGE_LIMIT,
  FOLLOWING_FEED_QUERY_KEY_PREFIX,
  SOCIAL_FEED_INFINITE_QUERY_KIND,
  buildSocialFeedQueryKey,
  fetchSocialFeedPage,
  getSocialFeedNextPageParam,
  invalidateFollowingFeed,
} from './socialFeedQueries';
import { mockFeedResponse } from '../mocks/coreFeed.mock';
import {
  toSocialFeedRequest,
  type FeedScope,
  type SocialFeedRequest,
} from './socialFeedSource';

const mockCall = jest.fn();

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  },
}));

const feedQueryKeyFor = (scope: FeedScope, limit = FEED_PAGE_LIMIT) => {
  const request = toSocialFeedRequest({ scope });
  if (!request) {
    throw new Error('expected a request');
  }
  return buildSocialFeedQueryKey(request, limit);
};

jest.mock('../../../../core/Engine', () => ({
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

const tokenRequest: SocialFeedRequest = {
  action: 'SocialService:fetchTokenFeed',
  options: { chain: 'hyperliquid', contractAddress: 'BTC' },
};

const traderRequest: SocialFeedRequest = {
  action: 'SocialService:fetchTraderFeed',
  options: { addressOrId: '0xab/cd', commentedOnly: true },
};

describe('socialFeedQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(mockFeedResponse([]));
  });

  describe('buildSocialFeedQueryKey', () => {
    it('keys on the action, the request options, the page size, and the infinite marker', () => {
      expect(buildSocialFeedQueryKey(traderRequest, 3)).toStrictEqual([
        'SocialService:fetchTraderFeed',
        { addressOrId: '0xab/cd', commentedOnly: true, limit: 3 },
        SOCIAL_FEED_INFINITE_QUERY_KIND,
      ]);
    });
  });

  describe('FOLLOWING_FEED_QUERY_KEY_PREFIX', () => {
    it('matches the following feed at every page size', () => {
      const keys = [
        feedQueryKeyFor('following'),
        feedQueryKeyFor('following', 3),
      ];

      const matches = keys.map((key) =>
        partialMatchKey(key, FOLLOWING_FEED_QUERY_KEY_PREFIX),
      );

      expect(matches).toStrictEqual([true, true]);
    });

    it("matches V0's following feed key", () => {
      const key = buildTraderFeedQueryKey('following');

      const matches = partialMatchKey(key, FOLLOWING_FEED_QUERY_KEY_PREFIX);

      expect(matches).toBe(true);
    });

    it.each(['trending', 'all', 'leaderboard'] as const)(
      'does not match the %s feed',
      (scope) => {
        const key = feedQueryKeyFor(scope);

        const matches = partialMatchKey(key, FOLLOWING_FEED_QUERY_KEY_PREFIX);

        expect(matches).toBe(false);
      },
    );

    it('does not match a trader feed', () => {
      const key = buildSocialFeedQueryKey(traderRequest, FEED_PAGE_LIMIT);

      const matches = partialMatchKey(key, FOLLOWING_FEED_QUERY_KEY_PREFIX);

      expect(matches).toBe(false);
    });
  });

  describe('invalidateFollowingFeed', () => {
    it('invalidates every following feed query', async () => {
      await invalidateFollowingFeed();

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: FOLLOWING_FEED_QUERY_KEY_PREFIX,
      });
    });
  });

  describe('fetchSocialFeedPage', () => {
    it('requests the first page without a cursor', async () => {
      await fetchSocialFeedPage(tokenRequest, 3);

      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
        chain: 'hyperliquid',
        contractAddress: 'BTC',
        limit: 3,
      });
    });

    it('passes the olderThan cursor for a follow-up page', async () => {
      await fetchSocialFeedPage(traderRequest, 30, 'cursor-1');

      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTraderFeed', {
        addressOrId: '0xab/cd',
        commentedOnly: true,
        limit: 30,
        olderThan: 'cursor-1',
      });
    });

    it('sends the global feed a mutable copy of its chain list', async () => {
      const request = toSocialFeedRequest({ scope: 'following' });
      if (!request) {
        throw new Error('expected a request');
      }

      await fetchSocialFeedPage(request, FEED_PAGE_LIMIT);

      const [, options] = mockCall.mock.calls[0];
      expect(options).toStrictEqual({
        scope: 'following',
        chains: [...FEED_CAIP2_CHAINS],
        limit: FEED_PAGE_LIMIT,
      });
      expect(options.chains).not.toBe(FEED_CAIP2_CHAINS);
    });
  });

  describe('getSocialFeedNextPageParam', () => {
    it('returns the older cursor, or undefined once the feed is exhausted', () => {
      expect(getSocialFeedNextPageParam(mockFeedResponse([], 'cursor-1'))).toBe(
        'cursor-1',
      );
      expect(getSocialFeedNextPageParam(mockFeedResponse([]))).toBeUndefined();
    });
  });
});
