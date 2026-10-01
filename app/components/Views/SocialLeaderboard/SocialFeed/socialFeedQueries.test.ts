import { FEED_CAIP2_CHAINS } from '../FeedView/feed-constants';
import {
  buildTraderFeedQueryKey,
  FEED_PAGE_LIMIT,
} from '../FeedView/hooks/traderFeedQueries';
import { mockFeedResponse } from '../FeedView/mocks/coreFeed.mock';
import {
  buildSocialFeedQueryKey,
  fetchSocialFeedPage,
  getSocialFeedNextPageParam,
} from './socialFeedQueries';
import {
  toSocialFeedRequest,
  type SocialFeedRequest,
} from './socialFeedSource';

const mockCall = jest.fn();

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
    it('keys on the action, the request options and the page size', () => {
      expect(buildSocialFeedQueryKey(traderRequest, 3)).toStrictEqual([
        'SocialService:fetchTraderFeed',
        { addressOrId: '0xab/cd', commentedOnly: true, limit: 3 },
      ]);
    });

    it('matches the V0 trader feed key for the global feed, so both share a cache', () => {
      const request = toSocialFeedRequest({ kind: 'all', audience: 'all' });

      expect(
        request && buildSocialFeedQueryKey(request, FEED_PAGE_LIMIT),
      ).toEqual(buildTraderFeedQueryKey('leaderboard'));
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
      const request = toSocialFeedRequest({
        kind: 'all',
        audience: 'following',
      });
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
