import React from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import { SocialFeedPostingBannerSelectorsIDs } from '../SocialV1View/feed/components/SocialFeedPostingBanner.testIds';
import {
  COMPOSER_POSTING_DELAY_MS,
  resetSocialV1ComposedFeedStore,
  submitSocialV1ComposedPost,
} from '../SocialV1View/feed/store/socialV1ComposedFeedStore';
import {
  mockUseSocialV1Feed,
  mockUseSocialV1FeedLoading,
} from '../SocialV1View/feed/mocks/mockComposedFeedHook';
import { useSocialFeed } from '../../../UI/SocialFeed/data/useSocialFeed';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { FeedSortFilterSelectorsIDs } from '../components/Filters';
import { getSocialFeedPostSkeletonTestId } from '../../../UI/SocialFeed/components/SocialFeedPostSkeleton.testIds';
import { getSocialV1HotTokenChipTestId } from '../SocialV1View/feed/components/HotTokensCarousel.testIds';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import EmptyShellTabPage from './EmptyShellTabPage';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../UI/SocialFeed/components/SocialFeedPostShell', () => {
  const { View } = jest.requireActual('react-native');
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      post,
      onCopyTrade,
    }: {
      post: { item: SocialV1FeedItem };
      onCopyTrade?: (item: SocialV1FeedItem) => void;
    }) => (
      <View>
        <Pressable
          testID={`social-v1-feed-card-${post.item.id}`}
          onPress={() => onCopyTrade?.(post.item)}
        />
      </View>
    ),
  };
});

jest.mock('../SocialV1View/feed/components/PopularTradersCarousel', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'popular-traders-carousel-section',
      }),
  };
});

// Reanimated's useFrameCallback registers on the UI runtime via a 0ms timeout.
// Unmount in this suite races that mock and throws
// `Cannot set properties of undefined (setting 'startTime')`. The marquee
// itself is covered in HotTokensCarousel.test. This stub only exposes the
// chips so the page can prove a press filters the feed.
jest.mock('../SocialV1View/feed/components', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const { Pressable } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  const { getSocialV1HotTokenChipTestId: chipTestId } = jest.requireActual(
    '../SocialV1View/feed/components/HotTokensCarousel.testIds',
  ) as typeof import('../SocialV1View/feed/components/HotTokensCarousel.testIds');
  const { pinSelectedHotToken, rankFeedHotTokens } = jest.requireActual(
    '../SocialV1View/feed/utils/rankFeedHotTokens',
  ) as typeof import('../SocialV1View/feed/utils/rankFeedHotTokens');

  const HotTokensCarousel = ({
    posts = [],
    selectedTokenId = null,
    onTokenPress,
  }: {
    posts?: import('../../../UI/SocialFeed/types').SocialV1FeedPost[];
    selectedTokenId?: string | null;
    onTokenPress?: (
      token: import('../SocialV1View/feed/types').SocialV1HotToken,
    ) => void;
  }) => {
    const tokens = pinSelectedHotToken(
      rankFeedHotTokens(posts),
      posts,
      selectedTokenId,
    );

    return ReactActual.createElement(
      ReactActual.Fragment,
      null,
      tokens.map((token) =>
        ReactActual.createElement(Pressable, {
          key: token.id,
          testID: chipTestId(token.id),
          accessibilityState: { selected: token.id === selectedTokenId },
          onPress: () => onTokenPress?.(token),
        }),
      ),
    );
  };

  return { HotTokensCarousel };
});

jest.mock('../../../UI/SocialFeed/data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(() => ({
    posts: [],
    rows: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: jest.fn(async () => undefined),
    dataUpdatedAt: undefined,
  })),
}));

// See the view suite: the real hook needs keyring state and React Query, and
// this suite is about the shell.
jest.mock('../SocialV1View/feed/hooks/useSocialV1Feed', () => ({
  useSocialV1Feed: jest.fn(
    jest.requireActual('../SocialV1View/feed/mocks/mockComposedFeedHook')
      .mockUseSocialV1Feed,
  ),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: null }),
}));

describe('EmptyShellTabPage', () => {
  beforeEach(() => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1Feed);
    mockNavigate.mockClear();
    resetSocialV1ComposedFeedStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetSocialV1ComposedFeedStore();
  });

  it('holds the mock feed back until the tab is opened', () => {
    const { rerender } = renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive={false}
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.queryByTestId(
        `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[0].id}`,
      ),
    ).toBeNull();

    rerender(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(
        `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[0].id}`,
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the mock feed mounted once the tab has been opened', () => {
    const { rerender } = renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    rerender(
      <EmptyShellTabPage
        tab="trending"
        isActive={false}
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(
        `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[0].id}`,
      ),
    ).toBeOnTheScreen();
  });

  it('does not request QuickBuy for an open perps feed item', () => {
    const item = MOCK_SOCIAL_V1_FEED_ITEMS[0];
    const onQuickBuy = jest.fn();

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        onQuickBuy={onQuickBuy}
      />,
    );

    fireEvent.press(screen.getByTestId(`social-v1-feed-card-${item.id}`));

    expect(onQuickBuy).not.toHaveBeenCalled();
  });

  it('requests a QuickBuy target for an open spot feed item', () => {
    const item = MOCK_SOCIAL_V1_FEED_ITEMS[1];
    const onQuickBuy = jest.fn();

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        onQuickBuy={onQuickBuy}
      />,
    );

    fireEvent.press(screen.getByTestId(`social-v1-feed-card-${item.id}`));

    expect(onQuickBuy).toHaveBeenCalledWith({
      tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
      tokenSymbol: 'PUMP',
      tokenName: 'PUMP',
      chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
  });

  it('shows the posting banner then prepends the composed post on Trending', () => {
    jest.useFakeTimers();
    try {
      renderWithProvider(
        <EmptyShellTabPage
          tab="trending"
          isActive
          containerTestID="trending-page-content"
          scrollTestID="trending-page-scroll"
        />,
      );

      act(() => {
        submitSocialV1ComposedPost({
          id: 'composed-1',
          authorHandle: 'giga-whale',
          timestampMs: Date.now(),
          reactions: [],
          item: mockOpenPerpsFeedItem({
            id: 'composed-item',
            comment: 'this is alpha',
          }),
        });
      });

      expect(
        screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      act(() => {
        jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
      });

      expect(
        screen.queryByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
      ).toBeNull();
      expect(
        screen.getByTestId('social-v1-feed-card-composed-item'),
      ).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it('inserts the Popular traders carousel after the first three Trending posts', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('popular-traders-carousel-section'),
    ).toBeOnTheScreen();

    const walkTestIds = (node: {
      props?: { testID?: string };
      children?: unknown[];
    }): string[] => {
      const own = node.props?.testID ? [node.props.testID] : [];
      const children = (node.children ?? []).flatMap((child) =>
        typeof child === 'object' && child !== null
          ? walkTestIds(
              child as { props?: { testID?: string }; children?: unknown[] },
            )
          : [],
      );
      return own.concat(children);
    };

    const ids = walkTestIds(
      screen.UNSAFE_root as {
        props?: { testID?: string };
        children?: unknown[];
      },
    );
    const firstThree = MOCK_SOCIAL_V1_FEED_ITEMS.slice(0, 3).map(
      (item) => `social-v1-feed-card-${item.id}`,
    );
    const fourth = `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[3].id}`;
    const carouselIndex = ids.indexOf('popular-traders-carousel-section');

    firstThree.forEach((id) => {
      expect(ids.indexOf(id)).toBeLessThan(carouselIndex);
    });
    expect(ids.indexOf(fourth)).toBeGreaterThan(carouselIndex);
  });

  it('scrolls the Following filter bar with the feed', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    const scroll = within(screen.getByTestId('following-page-scroll'));

    expect(
      scroll.getByTestId(FeedSortFilterSelectorsIDs.SELECTOR),
    ).toBeOnTheScreen();
    expect(
      scroll.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('omits the Popular traders carousel on Following', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
  });

  it('renders full-width dividers between Following feed entries', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('social-v1-feed-entry-divider-leading-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-leading-2'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-leading-3'),
    ).toBeOnTheScreen();
  });

  it('hides perp posts on Following when Custom filters apply tokens', () => {
    const { DEFAULT_FILTERS } = jest.requireActual(
      './filters/filterDefaults',
    ) as typeof import('./filters/filterDefaults');

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        appliedFilters={{ ...DEFAULT_FILTERS, type: 'tokens' }}
      />,
    );

    expect(
      screen.queryByTestId('social-v1-feed-card-v1-feed-btc-open'),
    ).toBeNull();
    expect(
      screen.getByTestId('social-v1-feed-card-v1-feed-pump-open'),
    ).toBeOnTheScreen();
  });

  it('frames the Popular traders rail with block dividers on Trending', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('social-v1-feed-entry-divider-block-popular-traders'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-block-trailing'),
    ).toBeOnTheScreen();
  });

  it('loads the pressed chip from its own feed instead of the posts on screen', () => {
    const btcPost = MOCK_SOCIAL_V1_FEED_ITEMS.map((item) => ({
      id: item.id,
      authorHandle: 'ada',
      timestampMs: 1,
      reactions: [],
      item,
    })).find((entry) => entry.item.asset.symbol === 'BTC');
    jest.mocked(useSocialFeed).mockImplementation((source) => ({
      posts: source && btcPost ? [btcPost] : [],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn(async () => undefined),
      dataUpdatedAt: undefined,
    }));

    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('asset:BTC')),
    );

    expect(
      screen.getByTestId('social-v1-feed-card-v1-feed-btc-open'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('social-v1-feed-card-v1-feed-pump-open'),
    ).toBeNull();
    expect(
      screen.queryByTestId('social-v1-feed-card-v1-feed-eth-closed'),
    ).toBeNull();
    expect(
      screen.queryByTestId('social-v1-feed-card-v1-feed-aapl-closed'),
    ).toBeNull();
    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId('asset:BTC')).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('clears the asset filter when the selected chip is pressed again', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('asset:ETH')),
    );
    fireEvent.press(
      screen.getByTestId(getSocialV1HotTokenChipTestId('asset:ETH')),
    );

    expect(
      screen.getByTestId('social-v1-feed-card-v1-feed-btc-open'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-card-v1-feed-eth-closed'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('popular-traders-carousel-section'),
    ).toBeOnTheScreen();
  });

  it('shows feed post skeletons and hides Popular traders during initial load', () => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1FeedLoading);

    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
  });

  describe('asset feed for a selected chip', () => {
    const tokenFeedPost = {
      id: 'token-feed-post',
      authorHandle: 'frogwater',
      timestampMs: 1,
      reactions: [],
      item: mockOpenSpotFeedItem({ id: 'token-feed-item' }),
    };

    const assetFeed = {
      posts: [tokenFeedPost],
      rows: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      loadMore: jest.fn(),
      error: null,
      refresh: jest.fn(async () => undefined),
      dataUpdatedAt: undefined,
    };

    const renderTrending = () =>
      renderWithProvider(
        <EmptyShellTabPage
          tab="trending"
          isActive
          containerTestID="trending-page-content"
          scrollTestID="trending-page-scroll"
        />,
      );

    beforeEach(() => {
      jest.mocked(useSocialFeed).mockImplementation((source) =>
        source
          ? assetFeed
          : {
              ...assetFeed,
              posts: [],
              hasNextPage: false,
            },
      );
    });

    it('shows the asset feed instead of the posts already on screen', () => {
      renderTrending();
      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('asset:PUMP')),
      );

      expect(
        screen.getByTestId('social-v1-feed-card-token-feed-item'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('social-v1-feed-card-v1-feed-btc-open'),
      ).toBeNull();
      expect(
        screen.queryByTestId('popular-traders-carousel-section'),
      ).toBeNull();
    });

    it('pages and refreshes the asset feed, then returns to the tab feed', () => {
      const mainLoadMore = jest.fn();
      jest.mocked(useSocialV1Feed).mockImplementation((tab) => ({
        ...mockUseSocialV1Feed(tab),
        loadMore: mainLoadMore,
      }));
      renderTrending();
      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('asset:PUMP')),
      );

      fireEvent(
        screen.getByTestId('trending-page-scroll'),
        'momentumScrollEnd',
        {
          nativeEvent: {
            contentOffset: { y: 1900, x: 0 },
            contentSize: { height: 2800, width: 400 },
            layoutMeasurement: { height: 800, width: 400 },
          },
        },
      );
      expect(assetFeed.loadMore).toHaveBeenCalled();
      expect(mainLoadMore).not.toHaveBeenCalled();

      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('asset:PUMP')),
      );
      expect(
        screen.getByTestId('social-v1-feed-card-v1-feed-btc-open'),
      ).toBeOnTheScreen();
    });
  });
});
