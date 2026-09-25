import React from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../SocialV1View/feed/mocks/socialV1Feed.mock';
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
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { FeedSortFilterSelectorsIDs } from '../components/Filters';
import { getSocialFeedPostSkeletonTestId } from '../SocialV1View/feed/components/SocialFeedPostSkeleton.testIds';
import { getSocialV1HotTokenChipTestId } from '../SocialV1View/feed/components/HotTokensCarousel.testIds';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import type { SocialV1TokenFeedState } from '../SocialV1View/feed/types';
import EmptyShellTabPage, {
  SOCIAL_V1_FEED_ERROR_TEST_ID,
  SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID,
  SOCIAL_V1_FEED_RETRY_TEST_ID,
} from './EmptyShellTabPage';

jest.mock('../SocialV1View/feed/components/SocialFeedPostShell', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: { item: { id: string } } }) => (
      <View testID={`social-v1-feed-card-${post.item.id}`} />
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

  const tokenFeedApi: {
    report: ((next: SocialV1TokenFeedState | null) => void) | null;
  } = { report: null };

  const HotTokensCarousel = ({
    posts = [],
    selectedTokenId = null,
    onTokenPress,
    onTokenFeedChange,
  }: {
    posts?: import('../SocialV1View/feed/types').SocialV1FeedPost[];
    selectedTokenId?: string | null;
    onTokenPress?: (
      token: import('../SocialV1View/feed/types').SocialV1HotToken,
    ) => void;
    onTokenFeedChange?: (next: SocialV1TokenFeedState | null) => void;
  }) => {
    tokenFeedApi.report = onTokenFeedChange ?? null;
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

  return { HotTokensCarousel, tokenFeedApi };
});

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

describe('EmptyShellTabPage', () => {
  beforeEach(() => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1Feed);
    resetSocialV1ComposedFeedStore();
  });

  afterEach(() => {
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

  it('shows the posting banner then prepends the composed post on Trending', () => {
    jest.useFakeTimers();
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

    jest.useRealTimers();
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

  it('filters the feed to the asset of a pressed hot-token chip', () => {
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

  describe('token feed for a contract chip', () => {
    const tokenFeedApi = () =>
      (
        jest.requireMock('../SocialV1View/feed/components') as {
          tokenFeedApi: {
            report: ((next: SocialV1TokenFeedState | null) => void) | null;
          };
        }
      ).tokenFeedApi;

    const reportTokenFeed = (next: SocialV1TokenFeedState | null) => {
      act(() => {
        tokenFeedApi().report?.(next);
      });
    };

    const tokenFeedPost = {
      id: 'token-feed-post',
      authorHandle: 'frogwater',
      timestampMs: 1,
      reactions: [],
      item: mockOpenSpotFeedItem({ id: 'token-feed-item' }),
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

    const scrollNearEnd = () => {
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
    };

    it('shows the token feed instead of the client-side filter', async () => {
      const mainRefresh = jest.fn().mockResolvedValue(undefined);
      const mainLoadMore = jest.fn();
      jest.mocked(useSocialV1Feed).mockImplementation((tab) => ({
        ...mockUseSocialV1Feed(tab),
        refresh: mainRefresh,
        loadMore: mainLoadMore,
      }));
      jest.useFakeTimers();

      const loadMore = jest.fn();
      const refresh = jest.fn().mockResolvedValue(undefined);
      const posts = [tokenFeedPost];
      const idle = {
        posts,
        isLoading: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        loadMore,
        error: null,
        refresh,
      };

      renderTrending();
      // Nothing selected yet: a null report keeps the current feed state.
      reportTokenFeed(null);

      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('asset:PUMP')),
      );

      expect(
        screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('social-v1-feed-card-v1-feed-pump-open'),
      ).toBeNull();
      expect(
        screen.queryByTestId('popular-traders-carousel-section'),
      ).toBeNull();

      await act(async () => {
        const pending = screen
          .getByTestId('trending-page-scroll')
          .props.refreshControl.props.onRefresh();
        await jest.advanceTimersByTimeAsync(1000);
        await pending;
      });
      expect(mainRefresh).not.toHaveBeenCalled();

      reportTokenFeed(idle);
      expect(
        screen.getByTestId('social-v1-feed-card-token-feed-item'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId('social-v1-feed-card-v1-feed-btc-open'),
      ).toBeNull();
      expect(
        screen.queryByTestId(getSocialFeedPostSkeletonTestId(0)),
      ).toBeNull();

      // Same state reference, then an equal copy, must not replace the feed.
      reportTokenFeed(idle);
      reportTokenFeed({ ...idle });
      expect(
        screen.getByTestId('social-v1-feed-card-token-feed-item'),
      ).toBeOnTheScreen();

      reportTokenFeed({ ...idle, posts: [] });
      reportTokenFeed({ ...idle, isLoading: true });
      reportTokenFeed({ ...idle, isFetchingNextPage: true, hasNextPage: true });
      expect(
        screen.getByTestId(SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID),
      ).toBeOnTheScreen();
      scrollNearEnd();
      expect(loadMore).toHaveBeenCalledTimes(1);
      expect(mainLoadMore).not.toHaveBeenCalled();

      reportTokenFeed({ ...idle, hasNextPage: false });
      scrollNearEnd();
      expect(loadMore).toHaveBeenCalledTimes(1);

      reportTokenFeed({ ...idle, error: 'token feed down', posts: [] });
      expect(
        screen.getByTestId(SOCIAL_V1_FEED_ERROR_TEST_ID),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(SOCIAL_V1_FEED_RETRY_TEST_ID));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(mainRefresh).not.toHaveBeenCalled();

      const otherLoadMore = jest.fn();
      const otherRefresh = jest.fn().mockResolvedValue(undefined);
      reportTokenFeed({ ...idle, loadMore: otherLoadMore });
      reportTokenFeed({ ...idle, refresh: otherRefresh });
      reportTokenFeed(null);

      fireEvent.press(
        screen.getByTestId(getSocialV1HotTokenChipTestId('asset:PUMP')),
      );
      expect(
        screen.getByTestId('social-v1-feed-card-v1-feed-btc-open'),
      ).toBeOnTheScreen();
      reportTokenFeed({
        ...idle,
        posts: [tokenFeedPost],
      });
      expect(
        screen.queryByTestId('social-v1-feed-card-token-feed-item'),
      ).toBeNull();

      jest.useRealTimers();
    });
  });
});
