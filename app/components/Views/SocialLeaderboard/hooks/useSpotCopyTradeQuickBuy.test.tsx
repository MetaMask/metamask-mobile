import { renderHook } from '@testing-library/react-native';
import {
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from '../../../UI/QuickBuy';
import { PostTradeShareOwner } from '../PostTradeShareBottomSheet/postTradeShareSession';
import {
  useSpotCopyTradeQuickBuy,
  type UseSpotCopyTradeQuickBuyOptions,
} from './useSpotCopyTradeQuickBuy';

const mockShowQuickBuy = jest.fn();
const mockQuickBuySheet = { key: 'inline-sheet' };
const mockUsePostTradeShareReopen = jest.fn();

jest.mock('../../../UI/QuickBuy/QuickBuySheetHost', () => ({
  useQuickBuySheet: () => ({
    openQuickBuy: mockShowQuickBuy,
    closeQuickBuy: jest.fn(),
    quickBuySheet: mockQuickBuySheet,
  }),
}));

jest.mock('../PostTradeShareBottomSheet', () => ({
  usePostTradeShareReopen: (...args: unknown[]) =>
    mockUsePostTradeShareReopen(...args),
}));

const PUMP_TARGET = {
  tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
  tokenSymbol: 'PUMP',
  tokenName: 'PUMP',
  chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

const renderUseSpotCopyTradeQuickBuy = (
  overrides: Partial<UseSpotCopyTradeQuickBuyOptions> = {},
) =>
  renderHook(() =>
    useSpotCopyTradeQuickBuy({
      source: 'trader_feed',
      postTradeShareOwner: PostTradeShareOwner.socialV1Profile,
      isActive: true,
      ...overrides,
    }),
  );

describe('useSpotCopyTradeQuickBuy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens Quick Buy for a spot post with the feed options, source and owner', () => {
    const { result } = renderUseSpotCopyTradeQuickBuy();

    result.current.onCopyTrade(mockOpenSpotFeedItem(), 'comment-1');

    expect(mockShowQuickBuy).toHaveBeenCalledWith({
      target: PUMP_TARGET,
      copyTradeOrigin: { commentId: 'comment-1' },
      features: TOP_TRADERS_QUICK_BUY_FEATURES,
      initialTradeMode: 'buy',
      analyticsContext: { source: 'trader_feed' },
      postTradeShare: true,
      postTradeShareOwner: PostTradeShareOwner.socialV1Profile,
    });
  });

  it('omits the copy-trade origin when the post has no comment id', () => {
    const { result } = renderUseSpotCopyTradeQuickBuy();

    result.current.onCopyTrade(mockOpenSpotFeedItem());

    expect(mockShowQuickBuy).toHaveBeenCalledWith(
      expect.objectContaining({ copyTradeOrigin: undefined }),
    );
  });

  it('ignores a perps post, which copies through the Perps order sheet', () => {
    const { result } = renderUseSpotCopyTradeQuickBuy();

    result.current.onCopyTrade(mockOpenPerpsFeedItem(), 'comment-1');

    expect(mockShowQuickBuy).not.toHaveBeenCalled();
  });

  it('ignores a spot post whose chain Quick Buy cannot resolve', () => {
    const { result } = renderUseSpotCopyTradeQuickBuy();
    const item = mockOpenSpotFeedItem();

    result.current.onCopyTrade(
      {
        ...item,
        asset: {
          ...item.asset,
          avatar: { ...item.asset.avatar, chain: 'tron' },
        },
      },
      'comment-1',
    );

    expect(mockShowQuickBuy).not.toHaveBeenCalled();
  });

  it('returns the sheet for the screen to render', () => {
    const { result } = renderUseSpotCopyTradeQuickBuy();

    expect(result.current.quickBuySheet).toBe(mockQuickBuySheet);
  });

  it('registers the reopen owner only while active', () => {
    renderUseSpotCopyTradeQuickBuy({ isActive: true });
    expect(mockUsePostTradeShareReopen).toHaveBeenLastCalledWith(
      expect.any(Function),
      PostTradeShareOwner.socialV1Profile,
    );

    renderUseSpotCopyTradeQuickBuy({ isActive: false });
    expect(mockUsePostTradeShareReopen).toHaveBeenLastCalledWith(
      expect.any(Function),
      undefined,
    );
  });

  it('reopens Quick Buy with the session target, origin and trade mode', () => {
    renderUseSpotCopyTradeQuickBuy();
    const [onReopen] = mockUsePostTradeShareReopen.mock.calls[0];

    onReopen(PUMP_TARGET, { commentId: 'comment-1' }, 'sell');

    expect(mockShowQuickBuy).toHaveBeenCalledWith(
      expect.objectContaining({
        target: PUMP_TARGET,
        copyTradeOrigin: { commentId: 'comment-1' },
        initialTradeMode: 'sell',
      }),
    );
  });
});
