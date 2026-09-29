import { FEED_PAGE_LIMIT } from '../../FeedView/hooks/traderFeedQueries';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../FeedView/mocks/coreFeed.mock';
import {
  buildMyProfileFeedQueryKey,
  fetchMyProfileFeedPage,
} from './myProfileFeedQueries';

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

describe('myProfileFeedQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildMyProfileFeedQueryKey', () => {
    it('returns the SocialService fetchTraderFeed key for the owner address', () => {
      expect(buildMyProfileFeedQueryKey('0xabc')).toEqual([
        'SocialService:fetchTraderFeed',
        {
          addressOrId: '0xabc',
          commentedOnly: true,
          limit: FEED_PAGE_LIMIT,
        },
      ]);
    });

    it('keeps special characters in addressOrId on the query key', () => {
      expect(buildMyProfileFeedQueryKey('0xab/cd')).toEqual([
        'SocialService:fetchTraderFeed',
        {
          addressOrId: '0xab/cd',
          commentedOnly: true,
          limit: FEED_PAGE_LIMIT,
        },
      ]);
    });
  });

  describe('fetchMyProfileFeedPage', () => {
    it('requests the first page with commentedOnly and no olderThan cursor', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

      await fetchMyProfileFeedPage('0xabc');

      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTraderFeed', {
        addressOrId: '0xabc',
        commentedOnly: true,
        limit: FEED_PAGE_LIMIT,
      });
    });

    it('passes the olderThan cursor for a follow-up page', async () => {
      mockCall.mockResolvedValue(mockFeedResponse([]));

      await fetchMyProfileFeedPage('0xabc', 'cursor-1');

      expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTraderFeed', {
        addressOrId: '0xabc',
        commentedOnly: true,
        limit: FEED_PAGE_LIMIT,
        olderThan: 'cursor-1',
      });
    });
  });
});
