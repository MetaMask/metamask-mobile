import {
  buildTokenFeedQueryKey,
  fetchTokenFeedPage,
  TOKEN_FEED_PAGE_LIMIT,
} from './tokenFeedQueries';

const mockCall = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
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

const target = {
  chain: 'solana',
  contractAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
};

describe('tokenFeedQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue({
      items: [],
      pagination: { olderCursor: null, newerCursor: null },
    });
  });

  it('builds a query key scoped to the selected contract', () => {
    expect(buildTokenFeedQueryKey(target)).toEqual([
      'SocialService:fetchTokenFeed',
      target,
    ]);
  });

  it('omits olderThan on the first page', async () => {
    await fetchTokenFeedPage(target);

    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: target.chain,
      contractAddress: target.contractAddress,
      limit: TOKEN_FEED_PAGE_LIMIT,
    });
  });

  it('passes olderThan when a cursor is set', async () => {
    await fetchTokenFeedPage(target, 'cursor-1');

    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: target.chain,
      contractAddress: target.contractAddress,
      limit: TOKEN_FEED_PAGE_LIMIT,
      olderThan: 'cursor-1',
    });
  });
});
